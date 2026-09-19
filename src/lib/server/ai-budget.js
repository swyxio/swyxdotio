// Reuse the production ledger so existing spend is never reset on upgrade.
// Both site embeddings and answers reserve cost before calling Workers AI.
// AI Gateway adds a shared limit across all applications routed through it.
export const AI_GATEWAY_ID = 'swyx-shared';
export const MONTHLY_BUDGET_MICROS = 10_000_000;
/** Atomic site guard. Retain reservations for failed or cancelled provider work.
 * @param {D1Database} db @param {number} amount @param {string} [_purpose] @param {Date} [now]
 */
export async function reserveAiBudget(db, amount, _purpose = 'ai', now = new Date()) {
	if (!Number.isSafeInteger(amount) || amount < 1 || amount > MONTHLY_BUDGET_MICROS) return false;
	const row = await db
		.prepare(
			`INSERT INTO search_embedding_budget(month,reserved_micros)
VALUES(?,?) ON CONFLICT(month) DO UPDATE SET reserved_micros=reserved_micros+excluded.reserved_micros
WHERE reserved_micros+excluded.reserved_micros<=? RETURNING reserved_micros`
		)
		.bind(now.toISOString().slice(0, 7), amount, MONTHLY_BUDGET_MICROS)
		.first();
	return !!row;
}
