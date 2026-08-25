const MILLION = 1_000_000;
const MAX_BUDGET_USD = 1;
const BUDGET_LIFETIME_MS = 20 * 60_000;

export const DRAW_AGENT_MODEL_STEP_RESERVE_USD = 0.02;

/** @param {number} inputTokens @param {number} outputTokens */
export function drawingAgentModelCostUsd(inputTokens, outputTokens) {
	return Math.ceil(inputTokens * 0.45 + outputTokens * 3.2) / MILLION;
}

/** @param {string} secret */
async function signingKey(secret) {
	return crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign', 'verify']
	);
}

/** @param {Uint8Array} bytes */
function base64url(bytes) {
	return btoa(String.fromCharCode(...bytes))
		.replaceAll('+', '-')
		.replaceAll('/', '_')
		.replace(/=+$/, '');
}

/** @param {string} encoded */
function decodeBase64url(encoded) {
	const normalized = encoded.replaceAll('-', '+').replaceAll('_', '/');
	return Uint8Array.from(
		atob(normalized + '='.repeat((4 - (normalized.length % 4)) % 4)),
		(character) => character.charCodeAt(0)
	);
}

/** @param {{ id: string, cap: number, spent: number, expires: number }} state @param {string} secret */
async function sign(state, secret) {
	const payload = base64url(new TextEncoder().encode(JSON.stringify(state)));
	const signature = new Uint8Array(
		await crypto.subtle.sign('HMAC', await signingKey(secret), new TextEncoder().encode(payload))
	);
	return `${payload}.${base64url(signature)}`;
}

/** @param {number} capUsd @param {string} secret */
export async function createDrawingAgentBudget(capUsd, secret) {
	if (!Number.isFinite(capUsd) || capUsd <= 0 || capUsd > MAX_BUDGET_USD) {
		throw new Error('Choose an assistant spending cap no higher than $1.00.');
	}
	return sign(
		{
			id: crypto.randomUUID(),
			cap: Math.round(capUsd * MILLION),
			spent: 0,
			expires: Date.now() + BUDGET_LIFETIME_MS
		},
		secret
	);
}

/** @param {unknown} token @param {string} secret */
export async function readDrawingAgentBudget(token, secret) {
	if (typeof token !== 'string' || token.length > 1_000)
		throw new Error('The assistant spending authorization is invalid.');
	const [payload, signature, extra] = token.split('.');
	if (!payload || !signature || extra)
		throw new Error('The assistant spending authorization is invalid.');
	try {
		if (
			!(await crypto.subtle.verify(
				'HMAC',
				await signingKey(secret),
				decodeBase64url(signature),
				new TextEncoder().encode(payload)
			))
		) {
			throw new Error('Invalid signature');
		}
		const state = JSON.parse(new TextDecoder().decode(decodeBase64url(payload)));
		if (
			typeof state.id !== 'string' ||
			!Number.isSafeInteger(state.cap) ||
			state.cap <= 0 ||
			state.cap > MAX_BUDGET_USD * MILLION ||
			!Number.isSafeInteger(state.spent) ||
			state.spent < 0 ||
			state.spent > state.cap ||
			!Number.isSafeInteger(state.expires) ||
			state.expires < Date.now()
		)
			throw new Error('Invalid state');
		return /** @type {{ id: string, cap: number, spent: number, expires: number }} */ (state);
	} catch {
		throw new Error('The assistant spending authorization is invalid or has expired.');
	}
}

/** @param {string} token @param {number} amountUsd @param {string} secret */
export async function chargeDrawingAgentBudget(token, amountUsd, secret) {
	if (!Number.isFinite(amountUsd) || amountUsd < 0)
		throw new Error('The assistant charge is invalid.');
	const state = await readDrawingAgentBudget(token, secret);
	const amount = Math.ceil(amountUsd * MILLION - Number.EPSILON);
	if (state.spent + amount > state.cap) {
		throw new Error(
			`This action would exceed the $${(state.cap / MILLION).toFixed(2)} assistant spending cap.`
		);
	}
	const next = { ...state, spent: state.spent + amount };
	return { token: await sign(next, secret), spendingUsd: next.spent / MILLION };
}
