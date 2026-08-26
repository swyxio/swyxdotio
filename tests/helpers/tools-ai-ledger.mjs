import { DatabaseSync } from 'node:sqlite';
import { DrawingPages } from '../../workers/draw/index.js';

/** Real SQLite-backed Durable Object fixture, with observable retention alarms. */
export function createTestAiLedger() {
	const database = new DatabaseSync(':memory:');
	let alarmAt = null;
	const sql = {
		exec(query, ...values) {
			if (/^\s*CREATE\s/i.test(query)) {
				database.exec(query);
				return { toArray: () => [], one: () => undefined };
			}
			const statement = database.prepare(query);
			if (/^\s*SELECT\s/i.test(query)) {
				const rows = statement.all(...values);
				return { toArray: () => rows, one: () => rows[0] };
			}
			statement.run(...values);
			return { toArray: () => [], one: () => undefined };
		}
	};
	const object = new DrawingPages({
		storage: {
			sql,
			setAlarm: async (time) => {
				alarmAt = time;
			}
		}
	});
	const calls = [];
	const namespace = {
		idFromName: (name) => name,
		get: (name) => {
			if (name !== 'tools-ai-usage') throw new Error('Unexpected ledger object key');
			return {
				fetch: async (request) => {
					calls.push({ path: new URL(request.url).pathname, body: await request.clone().json() });
					return object.fetch(request);
				}
			};
		}
	};
	return { namespace, object, database, sql, calls, alarmAt: () => alarmAt };
}

export async function ledgerRequest(ledger, path, body) {
	return ledger.namespace
		.get('tools-ai-usage')
		.fetch(
			new Request(`https://drawing.internal/ai/${path}`, {
				method: 'POST',
				body: JSON.stringify(body)
			})
		);
}

export async function seedTestJob(ledger, userId, model, requestId) {
	const admitted = await ledgerRequest(ledger, 'admit', {
		userId,
		kind: 'media',
		model,
		estimatedReservedUsd: 0.05
	});
	const { id } = await admitted.json();
	await ledgerRequest(ledger, 'register', { userId, id, model, requestId });
	return id;
}
