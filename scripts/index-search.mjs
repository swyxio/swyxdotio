import { createServer } from 'vite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const root = fileURLToPath(new URL('..', import.meta.url));
const config = readFileSync(new URL('../wrangler.toml', import.meta.url), 'utf8');
const auth = JSON.parse(
	execFileSync('pnpm', ['exec', 'wrangler', 'auth', 'token', '--json'], {
		cwd: root,
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe']
	})
);
const token = auth.token;
if (!token) throw new Error('No OAuth token');
const account = config.match(/^account_id = "([^"]+)"/m)?.[1];
const db = config.match(/binding = "READ_COUNTERS"[\s\S]*?database_id = "([^"]+)"/)?.[1];
const namespace = config.match(/binding = "CONTENT_MANIFEST"[\s\S]*?id = "([^"]+)"/)?.[1];
if (!account || !db || !namespace) throw new Error('Search bindings not found');
async function api(path, body) {
	const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/${path}`, {
		method: 'POST',
		headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
	const data = await response.json();
	if (!response.ok || !data.success)
		throw new Error(`Provider ${response.status}: ${JSON.stringify(data.errors)}`);
	return data.result;
}
const env = {
	CONTENT_MANIFEST: {
		async get(key) {
			const r = await fetch(
				`https://api.cloudflare.com/client/v4/accounts/${account}/storage/kv/namespaces/${namespace}/values/${key}`,
				{ headers: { Authorization: `Bearer ${token}` } }
			);
			if (r.status === 404) return null;
			if (!r.ok) throw new Error(`KV read ${r.status}`);
			return r.text();
		},
		async put(key, value) {
			const r = await fetch(
				`https://api.cloudflare.com/client/v4/accounts/${account}/storage/kv/namespaces/${namespace}/values/${key}`,
				{ method: 'PUT', headers: { Authorization: `Bearer ${token}` }, body: value }
			);
			const d = await r.json();
			if (!r.ok || !d.success) throw new Error(`KV write ${r.status}`);
		}
	},
	READ_COUNTERS: {
		prepare(sql) {
			let params = [];
			const statement = {
				bind(...values) {
					params = values;
					return statement;
				},
				async all() {
					return (await api(`d1/database/${db}/query`, { sql, params }))[0];
				},
				async first() {
					return (await statement.all()).results[0] || null;
				}
			};
			return statement;
		}
	},
	AI: {
		async run(model, input) {
			return api(`ai/run/${model}`, input);
		}
	}
};
const vite = await createServer({ root, server: { middlewareMode: true }, appType: 'custom' });
try {
	const { listAllContent } = await vite.ssrLoadModule('/src/lib/list-all-content.js');
	const { createSearchIndex, projectSearchCatalog } = await vite.ssrLoadModule(
		'/src/lib/server/site-search.js'
	);
	const { warmEmbeddings, publishVectorSnapshot } = await vite.ssrLoadModule(
		'/src/lib/server/search-embeddings.js'
	);
	const items = await listAllContent(fetch);
	const catalog = createSearchIndex(projectSearchCatalog(items), items);
	console.log(
		JSON.stringify({ publicRecords: catalog.records.length, passages: catalog.passages.length })
	);
	console.log(JSON.stringify({ snapshot: await publishVectorSnapshot(env) }));
	for (let batch = 0; batch < 1000; batch++) {
		const state = await warmEmbeddings(catalog, env);
		console.log(JSON.stringify({ batch, ...state }));
		if (!state.remaining || state.capped) break;
	}
} finally {
	await vite.close();
}
