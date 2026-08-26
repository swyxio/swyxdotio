/** Account-bound browser storage; never import the old shared cache into another account. */
/** @param {{ id: string } | null} user */
export function drawingStorageKey(user) {
	return user ? `swyx-excalidraw:google:${user.id}` : 'swyx-excalidraw:guest';
}

export const TOOLS_ACCOUNT_EVENT_KEY = 'swyx-tools:account';
