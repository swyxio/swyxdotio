/** Export a generated raster at YouTube's delivery size without changing its history or canvas. */
export async function exportThumbnailImage(/** @type {string} */ dataURL) {
	const blob = await (await fetch(dataURL)).blob();
	const bitmap = await createImageBitmap(blob);
	try {
		const canvas = document.createElement('canvas');
		canvas.width = 1280;
		canvas.height = 720;
		const ctx = canvas.getContext('2d');
		if (!ctx) throw new Error('Image export is unavailable.');
		ctx.fillStyle = '#111111';
		ctx.fillRect(0, 0, 1280, 720);
		const scale = Math.min(1280 / bitmap.width, 720 / bitmap.height);
		const w = bitmap.width * scale,
			h = bitmap.height * scale;
		ctx.drawImage(bitmap, (1280 - w) / 2, (720 - h) / 2, w, h);
		return await new Promise((resolve, reject) =>
			canvas.toBlob(
				(value) => (value ? resolve(value) : reject(new Error('Image export failed.'))),
				'image/jpeg',
				0.94
			)
		);
	} finally {
		bitmap.close();
	}
}
