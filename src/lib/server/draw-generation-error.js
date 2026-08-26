/** Only these errors cross the app API; never return arbitrary provider payloads or logs. */
export class DrawingGenerationError extends Error {
	/** @param {string} message @param {number} [status] @param {string} [code] */
	constructor(message, status = 502, code = 'generation_failed') {
		super(message);
		this.status = status;
		this.code = code;
	}
}
