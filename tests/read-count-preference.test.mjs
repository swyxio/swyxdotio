import assert from 'node:assert/strict';
import test from 'node:test';

import { READ_COUNT_VISIBILITY_KEY, readCountsAreHidden } from '../src/lib/read-counter.js';

test('view counts are visible unless the user explicitly hides them', () => {
	assert.equal(READ_COUNT_VISIBILITY_KEY, 'swyx:read-count-visibility:v1');
	assert.equal(readCountsAreHidden(null), false);
	assert.equal(readCountsAreHidden(''), false);
	assert.equal(readCountsAreHidden('visible'), false);
	assert.equal(readCountsAreHidden('hidden'), true);
});
