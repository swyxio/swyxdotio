/** @param {number} value @param {number} minimum @param {number} maximum */
export function clamp(value, minimum, maximum) {
	return Math.min(maximum, Math.max(minimum, value));
}

/**
 * Select the strongest SAM mask instead of blindly accepting its first
 * prediction. SlimSAM returns three candidates for each prompted point.
 *
 * @param {ArrayLike<number>} scores
 */
export function strongestMaskIndex(scores) {
	let strongest = 0;
	for (let index = 1; index < scores.length; index += 1) {
		if (scores[index] > scores[strongest]) strongest = index;
	}
	return strongest;
}

/**
 * @param {Uint8ClampedArray | Uint8Array} pixels
 * @param {Uint8Array} mask
 * @returns {Float32Array}
 */
export function createInpaintingInput(pixels, mask) {
	const area = mask.length;
	if (pixels.length !== area * 4) {
		throw new RangeError('Image pixels and eraser mask dimensions do not match.');
	}

	const input = new Float32Array(area * 4);
	for (let index = 0; index < area; index += 1) {
		const masked = mask[index] > 0 ? 1 : 0;
		for (let channel = 0; channel < 3; channel += 1) {
			input[channel * area + index] = masked ? 0 : pixels[index * 4 + channel] / 255;
		}
		input[3 * area + index] = masked;
	}
	return input;
}

/**
 * Mix a sharp image with a blurred version based on the local depth distance
 * from the chosen focal plane. Smoothstep avoids harsh depth-map boundaries.
 *
 * @param {Uint8ClampedArray} sharp
 * @param {Uint8ClampedArray} blurred
 * @param {Uint8Array | Uint8ClampedArray} depth
 * @param {number} focus
 */
export function blendDepthBlur(sharp, blurred, depth, focus) {
	if (sharp.length !== blurred.length || sharp.length !== depth.length * 4) {
		throw new RangeError('Depth, sharp image, and blurred image dimensions do not match.');
	}

	const focalDepth = clamp(focus, 0, 1);
	const output = new Uint8ClampedArray(sharp.length);
	for (let index = 0; index < depth.length; index += 1) {
		const distance = clamp(Math.abs(depth[index] / 255 - focalDepth) * 2.4, 0, 1);
		const blend = distance * distance * (3 - 2 * distance);
		const pixel = index * 4;
		for (let channel = 0; channel < 3; channel += 1) {
			output[pixel + channel] = Math.round(
				sharp[pixel + channel] * (1 - blend) + blurred[pixel + channel] * blend
			);
		}
		output[pixel + 3] = sharp[pixel + 3];
	}
	return output;
}

/**
 * A separable two-pass box blur works in browsers whose OffscreenCanvas does
 * not implement CanvasRenderingContext2D.filter, including older Safari.
 *
 * @param {Uint8ClampedArray} pixels
 * @param {number} width
 * @param {number} height
 * @param {number} radius
 */
export function boxBlur(pixels, width, height, radius) {
	const distance = clamp(Math.round(radius), 1, 40);
	const horizontal = new Uint8ClampedArray(pixels.length);
	const output = new Uint8ClampedArray(pixels.length);

	for (let row = 0; row < height; row += 1) {
		for (let channel = 0; channel < 4; channel += 1) {
			let total = 0;
			for (let x = -distance; x <= distance; x += 1) {
				total += pixels[(row * width + clamp(x, 0, width - 1)) * 4 + channel];
			}
			for (let x = 0; x < width; x += 1) {
				horizontal[(row * width + x) * 4 + channel] = Math.round(total / (distance * 2 + 1));
				const leaving = clamp(x - distance, 0, width - 1);
				const entering = clamp(x + distance + 1, 0, width - 1);
				total +=
					pixels[(row * width + entering) * 4 + channel] -
					pixels[(row * width + leaving) * 4 + channel];
			}
		}
	}

	for (let x = 0; x < width; x += 1) {
		for (let channel = 0; channel < 4; channel += 1) {
			let total = 0;
			for (let y = -distance; y <= distance; y += 1) {
				total += horizontal[(clamp(y, 0, height - 1) * width + x) * 4 + channel];
			}
			for (let y = 0; y < height; y += 1) {
				output[(y * width + x) * 4 + channel] = Math.round(total / (distance * 2 + 1));
				const leaving = clamp(y - distance, 0, height - 1);
				const entering = clamp(y + distance + 1, 0, height - 1);
				total +=
					horizontal[(entering * width + x) * 4 + channel] -
					horizontal[(leaving * width + x) * 4 + channel];
			}
		}
	}
	return output;
}

/**
 * Produce true, compact SVG vector paths by quantizing colors and merging
 * matching horizontal runs across neighboring rows. The source is deliberately
 * sampled by the worker before this step to stay within drawing sync limits.
 *
 * @param {Uint8ClampedArray} pixels
 * @param {number} width
 * @param {number} height
 * @param {{ width: number; height: number; colors?: number }} original
 */
export function createVectorSvg(pixels, width, height, original) {
	if (pixels.length !== width * height * 4) {
		throw new RangeError('Vector image pixel dimensions do not match.');
	}
	const colorCount = clamp(Math.round(original.colors ?? 7), 2, 12);
	/** @type {[number, number, number][]} */
	const palette = [];
	const transparent = 255;
	const assignments = new Uint8Array(width * height).fill(transparent);
	const visible = [];
	for (let index = 0; index < assignments.length; index += 1) {
		if (pixels[index * 4 + 3] >= 32) visible.push(index);
	}

	if (visible.length === 0) {
		return `<svg xmlns="http://www.w3.org/2000/svg" width="${original.width}" height="${original.height}" viewBox="0 0 ${width} ${height}"/>`;
	}

	for (let color = 0; color < colorCount; color += 1) {
		const index = visible[Math.floor((color * (visible.length - 1)) / Math.max(colorCount - 1, 1))];
		palette.push([pixels[index * 4], pixels[index * 4 + 1], pixels[index * 4 + 2]]);
	}

	for (let iteration = 0; iteration < 5; iteration += 1) {
		const sums = Array.from({ length: colorCount }, () => [0, 0, 0, 0]);
		for (const index of visible) {
			let nearest = 0;
			let bestDistance = Infinity;
			for (let color = 0; color < colorCount; color += 1) {
				const distance =
					(pixels[index * 4] - palette[color][0]) ** 2 +
					(pixels[index * 4 + 1] - palette[color][1]) ** 2 +
					(pixels[index * 4 + 2] - palette[color][2]) ** 2;
				if (distance < bestDistance) {
					bestDistance = distance;
					nearest = color;
				}
			}
			assignments[index] = nearest;
			sums[nearest][0] += pixels[index * 4];
			sums[nearest][1] += pixels[index * 4 + 1];
			sums[nearest][2] += pixels[index * 4 + 2];
			sums[nearest][3] += 1;
		}
		for (let color = 0; color < colorCount; color += 1) {
			if (sums[color][3] === 0) continue;
			palette[color] = /** @type {[number, number, number]} */ (
				sums[color].slice(0, 3).map((value) => Math.round(value / sums[color][3]))
			);
		}
	}

	/** @type {Map<number, { x: number; y: number; width: number; height: number }[]>} */
	const shapes = new Map();
	/** @type {Map<string, { x: number; y: number; width: number; height: number }>} */
	let previousRuns = new Map();
	for (let y = 0; y < height; y += 1) {
		/** @type {typeof previousRuns} */
		const currentRuns = new Map();
		for (let x = 0; x < width; ) {
			const color = assignments[y * width + x];
			let end = x + 1;
			while (end < width && assignments[y * width + end] === color) end += 1;
			if (color !== transparent) {
				const key = `${color}:${x}:${end}`;
				const previous = previousRuns.get(key);
				if (previous) {
					previous.height += 1;
					currentRuns.set(key, previous);
				} else {
					const rectangle = { x, y, width: end - x, height: 1 };
					const coloredShapes = shapes.get(color) ?? [];
					coloredShapes.push(rectangle);
					shapes.set(color, coloredShapes);
					currentRuns.set(key, rectangle);
				}
			}
			x = end;
		}
		previousRuns = currentRuns;
	}

	const paths = [...shapes.entries()]
		.map(([color, rectangles]) => {
			const fill = palette[color].map((channel) => channel.toString(16).padStart(2, '0')).join('');
			const commands = rectangles
				.map(({ x, y, width: span, height: depth }) => `M${x} ${y}h${span}v${depth}h-${span}Z`)
				.join('');
			return `<path fill="#${fill}" d="${commands}"/>`;
		})
		.join('');

	return `<svg xmlns="http://www.w3.org/2000/svg" width="${original.width}" height="${original.height}" viewBox="0 0 ${width} ${height}" shape-rendering="geometricPrecision">${paths}</svg>`;
}
