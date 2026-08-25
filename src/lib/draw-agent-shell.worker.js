import { Bash, defineCommand } from 'just-bash/browser';

/** @type {Map<string, { resolve: (value: any) => void, reject: (reason: unknown) => void }>} */
const pendingBridgeCommands = new Map();
/** @type {Bash | undefined} */
let sandbox;
/** @type {AbortController | undefined} */
let activeExecution;

/** @param {string[]} args */
function invokeDrawingCommand(args) {
	return new Promise((resolve, reject) => {
		const id = crypto.randomUUID();
		pendingBridgeCommands.set(id, { resolve, reject });
		self.postMessage({ type: 'draw-command', id, args });
	});
}

function getSandbox() {
	if (!sandbox) {
		const draw = defineCommand(
			'draw',
			async (args) => {
				try {
					const result = await invokeDrawingCommand(args);
					return { stdout: `${JSON.stringify(result)}\n`, stderr: '', exitCode: 0 };
				} catch (error) {
					return {
						stdout: '',
						stderr: `${error instanceof Error ? error.message : 'The drawing command failed.'}\n`,
						exitCode: 1
					};
				}
			},
			{ trusted: false }
		);
		sandbox = new Bash({
			files: {
				'/workspace/README.txt': 'Use draw help to inspect the available canvas commands.\n'
			},
			cwd: '/workspace',
			env: {},
			commands: [
				'echo',
				'cat',
				'printf',
				'ls',
				'mkdir',
				'touch',
				'rm',
				'cp',
				'mv',
				'pwd',
				'head',
				'tail',
				'wc',
				'grep',
				'rg',
				'sed',
				'awk',
				'sort',
				'uniq',
				'cut',
				'tr',
				'find',
				'jq',
				'tee',
				'xargs',
				'true',
				'false',
				'seq',
				'which'
			],
			customCommands: [draw],
			executionLimitProfile: 'hardened',
			executionLimits: {
				maxSourceBytes: 4_000,
				maxCommandCount: 60,
				maxLoopIterations: 80,
				maxExecutionTimeMs: 300_000,
				maxOutputSize: 24_000,
				maxFileSystemBytes: 512_000,
				maxLiveBytes: 4_000_000,
				maxWorkerMessageBytes: 32_000
			},
			defenseInDepth: { enabled: 'auto' }
		});
	}
	return sandbox;
}

/** @param {MessageEvent<any>} event */
self.onmessage = async ({ data }) => {
	if (data?.type === 'draw-result' || data?.type === 'draw-error') {
		const pending = pendingBridgeCommands.get(data.id);
		if (!pending) return;
		pendingBridgeCommands.delete(data.id);
		if (data.type === 'draw-error') pending.reject(new Error(data.message));
		else pending.resolve(data.result);
		return;
	}
	if (data?.type === 'abort') {
		activeExecution?.abort();
		for (const [id, pending] of pendingBridgeCommands) {
			pendingBridgeCommands.delete(id);
			pending.reject(new DOMException('The assistant was stopped.', 'AbortError'));
		}
		return;
	}
	if (data?.type !== 'execute' || typeof data.id !== 'string') return;
	if (activeExecution) {
		self.postMessage({
			type: 'error',
			id: data.id,
			message: 'A drawing command is already running.'
		});
		return;
	}
	if (typeof data.command !== 'string' || !data.command.trim() || data.command.length > 4_000) {
		self.postMessage({ type: 'error', id: data.id, message: 'The assistant command is invalid.' });
		return;
	}
	const controller = new AbortController();
	activeExecution = controller;
	try {
		const result = await getSandbox().exec(data.command, {
			signal: controller.signal,
			replaceEnv: true
		});
		self.postMessage({
			type: 'result',
			id: data.id,
			stdout: result.stdout.slice(0, 12_000),
			stderr: result.stderr.slice(0, 4_000),
			exitCode: result.exitCode
		});
	} catch (error) {
		self.postMessage({
			type: 'error',
			id: data.id,
			message: error instanceof Error ? error.message : 'The local drawing sandbox stopped.'
		});
	} finally {
		if (activeExecution === controller) activeExecution = undefined;
	}
};
