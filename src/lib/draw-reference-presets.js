/** Complete, native reconstructions of selected public Alex Xu / ByteByteGo diagrams.
 * Layout and mechanisms follow the linked references; lettering and glyphs are rebuilt.
 * No source screenshots, model calls, or remote asset requests are part of an insertion.
 * The LS data-agent adaptation includes locally bundled authentic logo layers.
 */
import { shape, rect, oval, path, label, group } from './draw-illustration.js';
import { createDataAgentPreset } from './draw-data-agent-preset.js';

/** @typedef {import('./draw-presets.js').PresetShape} Shape */
/** @typedef {import('./draw-presets.js').DrawPreset} Preset */
const INK = '#20232b';
const BLUE = '#dce9ff';
const TEAL = '#c5eee0';
const PURPLE = '#e5dcfa';
const GOLD = '#ffebbf';
const PINK = '#fbd9e2';
const GREY = '#edf0f4';
const MUTED = '#566172';
const sourceUrl = (/** @type {string} */ urn) =>
	`https://www.linkedin.com/feed/update/urn:li:activity:${urn}/`;

/** @param {number} x @param {number} y @param {number} w @param {number} h @param {string} text @param {string} [fill] @param {number} [size] @returns {Shape} */
function box(x, y, w, h, text, fill = '#ffffff', size = 20) {
	return {
		...rect(x, y, w, h, fill),
		strokeWidth: 1.6,
		...(text ? { label: { text, fontFamily: 2, fontSize: size } } : {})
	};
}
/** @param {Shape} a @param {Shape} b @param {Array<[number, number]>} points @param {boolean} [dashed] @param {string} [color] @returns {Shape} */
function edge(a, b, points, dashed = false, color = INK) {
	return {
		...path(points),
		type: 'arrow',
		start: { id: a.id },
		end: { id: b.id },
		endArrowhead: 'arrow',
		strokeWidth: 1.8,
		strokeStyle: dashed ? 'dashed' : 'solid',
		strokeColor: color
	};
}
/** @param {Shape} a @param {Shape} b @param {boolean} [dashed] @returns {Shape} */
function down(a, b, dashed = false) {
	return edge(
		a,
		b,
		[
			[a.x + (a.width ?? 0) / 2, a.y + (a.height ?? 0)],
			[b.x + (b.width ?? 0) / 2, b.y]
		],
		dashed
	);
}
/** @param {Shape} a @param {Shape} b @param {boolean} [dashed] @returns {Shape} */
function across(a, b, dashed = false) {
	return edge(
		a,
		b,
		[
			[a.x + (a.width ?? 0), a.y + (a.height ?? 0) / 2],
			[b.x, b.y + (b.height ?? 0) / 2]
		],
		dashed
	);
}
/** @param {number} x @param {number} y @param {number} w @param {number} h @param {string} title @param {string} [fill] @returns {Shape[]} */
function panel(x, y, w, h, title, fill = '#ffffff') {
	return [
		box(x, y, w, h, '', fill),
		box(x + 18, y - 17, Math.min(w - 36, title.length * 12 + 36), 38, title, INK, 19)
	].map((s, i) => (i ? { ...s, strokeColor: '#ffffff' } : s));
}
/** @param {number} x @param {number} y @param {string} n @param {string} [fill] */
function badge(x, y, n, fill = INK) {
	return [oval(x, y, 34, 34, fill), label(x + 10, y + 6, n, 20, '#ffffff')];
}
/** Small original native glyphs; deliberately no provider logos. @param {string} kind @param {number} x @param {number} y @param {string} [fill] @returns {Shape[]} */
function icon(kind, x, y, fill = PURPLE) {
	/** @type {Shape[]} */
	let parts;
	if (kind === 'database') {
		parts = [
			rect(5, 12, 48, 44, fill),
			oval(5, 45, 48, 18, fill),
			oval(5, 4, 48, 18),
			path(
				[
					[6, 30],
					[18, 35],
					[41, 35],
					[52, 30]
				],
				{ roundness: { type: 2 }, strokeWidth: 1.4 }
			),
			path(
				[
					[15, 22],
					[15, 48]
				],
				{ strokeColor: '#ffffff', strokeWidth: 3 }
			)
		];
	} else if (kind === 'document') {
		parts = [
			rect(13, 12, 43, 53, fill),
			path(
				[
					[3, 2],
					[34, 2],
					[48, 16],
					[48, 56],
					[3, 56],
					[3, 2]
				],
				{ backgroundColor: '#ffffff' }
			),
			path([
				[34, 2],
				[34, 16],
				[48, 16]
			]),
			...[27, 36, 45].map((y) =>
				path(
					[
						[12, y],
						[36, y]
					],
					{ strokeWidth: 1.4 }
				)
			)
		];
	} else if (kind === 'user') {
		parts = [
			oval(17, 1, 24, 26, fill),
			path(
				[
					[3, 62],
					[3, 45],
					[16, 33],
					[42, 33],
					[55, 45],
					[55, 62],
					[3, 62]
				],
				{ backgroundColor: fill }
			),
			path(
				[
					[16, 35],
					[29, 49],
					[42, 35]
				],
				{ strokeWidth: 1.4 }
			)
		];
	} else if (kind === 'server') {
		parts = [0, 1, 2].flatMap((i) => [
			rect(2, 3 + i * 21, 54, 17, fill),
			oval(10, 9 + i * 21, 5, 5, INK),
			path(
				[
					[32, 11 + i * 21],
					[46, 11 + i * 21]
				],
				{ strokeWidth: 1.5 }
			)
		]);
	} else if (kind === 'lock') {
		parts = [
			oval(15, 2, 30, 40),
			rect(6, 25, 48, 35, fill),
			oval(26, 34, 9, 9, INK),
			path([
				[30, 40],
				[30, 51]
			])
		];
	} else {
		parts = [
			rect(9, 9, 42, 42, fill),
			rect(18, 18, 24, 24),
			...[18, 30, 42].flatMap((n) => [
				path([
					[n, 1],
					[n, 9]
				]),
				path([
					[n, 51],
					[n, 60]
				]),
				path([
					[1, n],
					[9, n]
				]),
				path([
					[51, n],
					[60, n]
				])
			])
		];
	}
	return group(parts.map((s) => ({ ...s, x: s.x + x, y: s.y + y })));
}
/** @param {Shape[]} s @param {number} x @param {number} y @param {number} w @param {string} title @param {string} subtitle @param {string} kind @param {string} fill @returns {Shape} */
function illustrated(s, x, y, w, title, subtitle, kind, fill) {
	const node = box(x, y, w, 104, '', fill);
	s.push(
		...group([
			node,
			...icon(kind, x + 18, y + 18, fill),
			label(x + 95, y + 20, title, 24),
			label(x + 95, y + 58, subtitle, 17, MUTED)
		])
	);
	return node;
}
/** @param {string} title @param {string} subtitle @param {number} w @param {number} h @param {string} urn @returns {Shape[]} */
function sheet(title, subtitle, w, h, urn) {
	return [
		{ ...rect(0, 0, w, h), roundness: null, strokeColor: '#ffffff', strokeWidth: 1 },
		{ ...rect(30, 30, 9, 58, '#2687ee'), strokeColor: '#2687ee' },
		label(58, 30, title, 42),
		label(58, 90, subtitle, 18, MUTED),
		path(
			[
				[38, h - 58],
				[w - 38, h - 58]
			],
			{ strokeColor: '#dce0e7', strokeWidth: 1 }
		),
		{
			...label(
				40,
				h - 40,
				'Study after Alex Xu / ByteByteGo · Editable reconstruction · View original ↗',
				16,
				MUTED
			),
			link: sourceUrl(urn)
		}
	];
}

function harness() {
	const s = sheet(
		'What is Harness Engineering?',
		'The reliability layer around the model',
		1200,
		1500,
		'7498043434084196353'
	);
	s.push(...panel(50, 270, 1100, 1025, 'THE HARNESS', '#f2f6fc'));
	const goal = illustrated(
		s,
		395,
		140,
		420,
		'User goal',
		'Intent enters the system',
		'user',
		'#ffffff'
	);
	const context = illustrated(
		s,
		390,
		305,
		420,
		'Context builder',
		'Documents · data · history',
		'document',
		BLUE
	);
	const llm = {
		...oval(435, 475, 330, 120, PURPLE),
		label: { text: 'LLM\nReason + propose an action', fontFamily: 2, fontSize: 23 }
	};
	s.push(llm);
	const policy = illustrated(
		s,
		390,
		660,
		420,
		'Policy gate',
		'Allow or block the action',
		'lock',
		GOLD
	);
	const runtime = illustrated(
		s,
		390,
		835,
		420,
		'Tools / runtime',
		'Execute APIs, CRM and tools',
		'chip',
		'#fce9dd'
	);
	const verify = illustrated(s, 390, 1090, 420, 'Verify', 'Tests + validation', 'document', PINK);
	const result = illustrated(
		s,
		390,
		1330,
		420,
		'Accepted result',
		'Bounded + checked',
		'server',
		TEAL
	);
	const observe = box(895, 465, 205, 200, 'Observability\n\nTraces\nMetrics\nErrors', GREY);
	const constraints = box(895, 790, 205, 180, 'Constraints\n\nRules\nPermissions\nBudgets', GOLD);
	s.push(observe, constraints);
	const stages = [goal, context, llm, policy, runtime, verify, result];
	stages.slice(1).forEach((b, i) => s.push(down(stages[i], b)));
	[context, llm, policy, runtime, verify].forEach((n, i) =>
		s.push(...badge(n.x - 15, n.y - 14, String(i + 1)))
	);
	s.push(...badge(result.x - 15, result.y - 14, '6'));
	s.push(
		edge(runtime, llm, [
			[390, 890],
			[260, 890],
			[260, 535],
			[435, 535]
		]),
		label(110, 700, 'Tool result', 18)
	);
	s.push(
		edge(
			verify,
			context,
			[
				[390, 1140],
				[135, 1140],
				[135, 356],
				[390, 356]
			],
			true,
			'#9e6152'
		),
		label(65, 1170, 'Feedback → next iteration', 18, '#9e6152')
	);
	for (const n of [context, llm, runtime, verify])
		s.push(
			edge(
				n,
				observe,
				[
					[n.x + (n.width ?? 0), n.y + 52],
					[880, n.y + 52],
					[895, 565]
				],
				true,
				'#94a1b3'
			)
		);
	s.push(
		edge(
			constraints,
			policy,
			[
				[895, 845],
				[855, 845],
				[855, 712],
				[810, 712]
			],
			true,
			'#a07a38'
		)
	);
	return s;
}

function engines() {
	const s = sheet(
		'Ollama vs vLLM vs SGLang',
		'Three serving approaches — schematic, not a performance benchmark',
		1200,
		1230,
		'7495506067385106432'
	);
	const columns = [
		{
			title: 'Ollama',
			color: '#d7edef',
			user: 'Local user',
			stages: ['FIFO request queue', 'Pre-quantized model', 'Response'],
			notes: ['Simple local setup', 'GGUF model on your machine', 'Tokens returned to the caller'],
			fit: 'Local development\nQuick model experiments\nLaptop-scale hardware'
		},
		{
			title: 'vLLM',
			color: BLUE,
			user: 'Concurrent users',
			stages: ['Continuous batching', 'PagedAttention', 'Response'],
			notes: [
				'New work joins running batches',
				'Manage KV cache in pages',
				'Parallel requests complete'
			],
			fit: 'High-throughput serving\nEfficient GPU use\nMany concurrent requests'
		},
		{
			title: 'SGLang',
			color: PURPLE,
			user: 'Concurrent users',
			stages: ['Prefix-aware scheduling', 'RadixAttention cache', 'Response'],
			notes: [
				'Group work with shared prefixes',
				'Reuse cached prefix states',
				'Continue from cached context'
			],
			fit: 'Agent and tool loops\nMulti-turn prefix reuse\nStructured generation'
		}
	];
	columns.forEach((c, col) => {
		const x = 35 + col * 390;
		s.push(
			...panel(x, 165, 360, 965, c.title, c.color),
			...icon('user', x + 151, 205, c.color),
			label(x + 95, 280, c.user, 21)
		);
		let previous = box(x + 88, 315, 184, 44, 'Requests', '#ffffff');
		s.push(previous);
		c.stages.forEach((title, i) => {
			const y = 410 + i * 185;
			const node = box(x + 22, y, 316, 132, '', '#ffffff');
			s.push(node, down(previous, node, true), ...badge(x + 9, y - 15, String(i + 1)));
			if (i === 0) {
				for (let row = 0; row < (col === 0 ? 1 : 3); row++)
					for (let j = 0; j < 5 - (col === 2 ? row : 0); j++)
						s.push(rect(x + 98 + j * 26, y + 16 + row * 13, 20, 10, j % 2 ? c.color : '#ffffff'));
			} else if (col === 2 && i === 1) {
				s.push(
					path([
						[x + 180, y + 10],
						[x + 135, y + 46]
					]),
					path([
						[x + 180, y + 10],
						[x + 225, y + 46]
					])
				);
				for (const [dx, dy] of [
					[180, 10],
					[135, 46],
					[225, 46]
				])
					s.push(oval(x + dx - 8, y + dy - 8, 16, 16, c.color));
			} else s.push(...icon(i === 2 ? 'document' : 'chip', x + 150, y + 2, c.color));
			s.push(label(x + 36, y + 76, title, 21), label(x + 36, y + 106, c.notes[i], 16, MUTED));
			previous = node;
		});
		s.push(box(x + 22, 1000, 316, 105, c.fit, c.color, 19), label(x + 126, 963, 'BEST FOR', 18));
	});
	return s;
}

function apiTesting() {
	const s = sheet(
		'9 Types of API Testing',
		'One reference sheet: purpose, mechanism and a concrete example',
		1400,
		1500,
		'7492969330666729490'
	);
	const rows = [
		[
			'Smoke',
			'Basic request',
			'API',
			'Available?',
			'Critical endpoints respond',
			'GET /health → 200; no server errors',
			BLUE
		],
		[
			'Functional',
			'Test input',
			'API',
			'Actual vs expected',
			'Behavior matches requirements',
			'POST /orders → correct total and status',
			PURPLE
		],
		[
			'Contract',
			'Consumer',
			'Contract',
			'Provider',
			'Requests and responses agree',
			'Validate field names, types and error schema',
			TEAL
		],
		[
			'Integration',
			'Order API',
			'Inventory',
			'Payment',
			'Dependent services work together',
			'Create order → reserve stock → take payment',
			PINK
		],
		[
			'Regression',
			'Test suite',
			'Old / new',
			'Compare',
			'Existing behavior stays intact',
			'A discount change must not break order history',
			'#d1eff3'
		],
		[
			'Load',
			'Expected traffic',
			'API',
			'Latency',
			'Measure behavior at normal load',
			'Steady users → check latency and error rate',
			GOLD
		],
		[
			'Stress',
			'Traffic ramp-up',
			'API',
			'Breaking point',
			'Find limits and recovery behavior',
			'Exceed normal load → observe throttling and recovery',
			TEAL
		],
		[
			'Security',
			'Threat cases',
			'API',
			'Blocked?',
			'Check access and data protection',
			'User A requests User B’s order → forbidden',
			'#ffd9d5'
		],
		[
			'Fuzz',
			'Malformed inputs',
			'API',
			'Unexpected?',
			'Probe invalid and edge-case inputs',
			'Invalid JSON, long strings, negative quantities',
			BLUE
		]
	];
	rows.forEach(([name, a, b, c, purpose, example, color], i) => {
		const y = 155 + i * 138;
		s.push(
			box(30, y, 180, 128, name + '\nTesting', color, 24),
			box(220, y, 1150, 128, '', '#ffffff')
		);
		const nodes = [
			box(245, y + 24, 195, 55, a, color, 19),
			box(510, y + 24, 185, 55, b, color, 19),
			box(770, y + 24, 195, 55, c, color, 19)
		];
		s.push(
			...nodes,
			across(nodes[0], nodes[1], true),
			across(nodes[1], nodes[2], true),
			box(1000, y + 15, 350, 91, purpose, color, 20),
			label(245, y + 94, 'EXAMPLE   ' + example, 17, MUTED)
		);
	});
	return s;
}

function kafka() {
	const s = sheet(
		'Top 5 Kafka Use Cases',
		'From a durable event log to five different system architectures',
		1440,
		1510,
		'7490795004563673088'
	);
	const rows = [
		{
			title: 'Log analysis',
			fill: TEAL,
			inputs: ['Shopping cart logs', 'Order service logs', 'Payment logs'],
			steps: ['Kafka', 'Elasticsearch', 'Kibana'],
			end: 'Search + explore logs'
		},
		{
			title: 'Real-time ML\npipelines',
			fill: BLUE,
			inputs: ['User events', 'Product events', 'Application events'],
			steps: ['Kafka', 'Flink', 'Feature / data layer'],
			end: 'Models → predictions'
		},
		{
			title: 'Monitoring\n& alerting',
			fill: PINK,
			inputs: ['Service metrics', 'Application events', 'Health signals'],
			steps: ['Kafka', 'Flink', 'Monitors + alerts'],
			end: 'Detect + notify'
		},
		{
			title: 'Change data\ncapture',
			fill: GOLD,
			inputs: ['Source database', 'Transaction log', 'CDC connector'],
			steps: ['Kafka', 'Sink connectors', 'Target systems'],
			end: 'Search · cache · replicas'
		},
		{
			title: 'Event-driven\nmicroservices',
			fill: PURPLE,
			inputs: ['OrderCreated', 'PaymentSucceeded', 'InventoryReserved'],
			steps: ['Kafka', 'Consumer groups', 'Shipping / billing'],
			end: 'Independent consumers'
		}
	];
	rows.forEach((r, i) => {
		const y = 160 + i * 255;
		s.push(
			box(28, y, 1384, 238, '', i % 2 ? '#f5f9fc' : '#ffffff'),
			...icon(i === 3 ? 'database' : 'server', 94, y + 30, r.fill),
			label(48, y + 117, r.title, 25),
			path(
				[
					[242, y + 15],
					[242, y + 223]
				],
				{ strokeColor: '#b5bec9', strokeWidth: 1 }
			)
		);
		if (i === 3) {
			const db = box(275, y + 78, 165, 72, 'Source DB', GOLD, 21);
			const cdc = box(500, y + 78, 165, 72, 'CDC source', GOLD, 21);
			const log = box(725, y + 78, 165, 72, 'Kafka', GOLD, 23);
			s.push(
				db,
				cdc,
				log,
				across(db, cdc, true),
				across(cdc, log, true),
				label(288, y + 180, 'Transaction log → change events', 18, MUTED)
			);
			['Search sink', 'Cache sink', 'DB sink'].forEach((t, j) => {
				const sink = box(960, y + 22 + j * 67, 165, 50, t, GOLD, 18);
				const target = box(
					1190,
					y + 22 + j * 67,
					195,
					50,
					['Elasticsearch', 'Redis', 'Replica database'][j],
					'#ffffff',
					18
				);
				s.push(sink, target, across(log, sink, true), across(sink, target, true));
			});
			return;
		}
		const inputs = r.inputs.map((t, j) => box(275, y + 22 + j * 61, 245, 48, t, r.fill, 19));
		const nodes = r.steps.map((t, j) => box(610 + j * 265, y + 72, 215, 82, t, r.fill, 21));
		s.push(
			...inputs,
			...nodes,
			...inputs.map((n) => across(n, nodes[0], true)),
			across(nodes[0], nodes[1], true),
			across(nodes[1], nodes[2], true),
			label(870, y + 183, r.end, 20, MUTED)
		);
	});
	return s;
}

function cicd() {
	const s = sheet(
		'Integration → Delivery → Deployment',
		'The same tested artifact. Two different ways to reach production.',
		1200,
		1500,
		'7491157399484076033'
	);
	const commit = illustrated(
		s,
		380,
		145,
		440,
		'Commit / pull request',
		'A change enters the pipeline',
		'document',
		'#ffffff'
	);
	s.push(...panel(160, 310, 880, 290, 'CI / BUILD + TEST + VERIFY', BLUE));
	const build = illustrated(s, 195, 390, 315, 'Build', 'Compile + package', 'chip', '#ffffff');
	const checks = box(
		600,
		360,
		390,
		135,
		'Automated checks\n\nUnit · integration · security',
		'#ffffff',
		23
	);
	s.push(
		checks,
		down(commit, build, true),
		across(build, checks, true),
		box(718, 522, 190, 42, 'Checks pass', TEAL, 20)
	);
	const merge = illustrated(
		s,
		105,
		665,
		375,
		'Merge to main',
		'Accepted change',
		'document',
		'#ffffff'
	);
	const artifact = illustrated(s, 725, 665, 370, 'Artifact', 'Immutable build', 'server', GOLD);
	s.push(
		edge(
			checks,
			merge,
			[
				[795, 495],
				[795, 626],
				[290, 626],
				[290, 665]
			],
			true
		),
		across(merge, artifact, true),
		label(502, 690, 'Build once', 19, MUTED)
	);
	const staging = illustrated(
		s,
		390,
		845,
		420,
		'Staging',
		'Production-like environment',
		'server',
		BLUE
	);
	s.push(
		edge(
			artifact,
			staging,
			[
				[910, 769],
				[910, 897],
				[810, 897]
			],
			true
		)
	);
	const gate = box(350, 1000, 500, 58, 'Production readiness gate', '#ffffff', 24);
	s.push(gate, down(staging, gate));
	const delivery = box(
		70,
		1120,
		440,
		165,
		'Continuous delivery\n\nManual approval\nControlled release',
		GOLD,
		25
	);
	const deployment = box(
		690,
		1120,
		440,
		165,
		'Continuous deployment\n\nAutomated release\nAfter all gates pass',
		TEAL,
		25
	);
	s.push(
		delivery,
		deployment,
		edge(
			gate,
			delivery,
			[
				[460, 1058],
				[290, 1082],
				[290, 1120]
			],
			true,
			'#b37820'
		),
		edge(
			gate,
			deployment,
			[
				[740, 1058],
				[910, 1082],
				[910, 1120]
			],
			true,
			'#20886b'
		)
	);
	const prod = box(400, 1355, 400, 70, 'Production', TEAL, 26);
	s.push(
		prod,
		edge(
			delivery,
			prod,
			[
				[290, 1285],
				[290, 1390],
				[400, 1390]
			],
			true
		),
		edge(
			deployment,
			prod,
			[
				[910, 1285],
				[910, 1390],
				[800, 1390]
			],
			true
		)
	);
	return s;
}

function memory() {
	const s = sheet(
		'Short-term vs Long-term Memory',
		'Current-call context and cross-session persistence are different mechanisms.',
		1400,
		1560,
		'7488983080410460160'
	);
	s.push(
		...panel(35, 170, 650, 1290, 'SHORT-TERM MEMORY', '#f0f6ff'),
		...panel(715, 170, 650, 1290, 'LONG-TERM MEMORY', '#f1faf6')
	);
	const user = illustrated(
		s,
		130,
		215,
		460,
		'User input',
		'“Where is my order?”',
		'user',
		'#ffffff'
	);
	const context = box(70, 385, 580, 550, '', BLUE);
	s.push(context, label(95, 405, 'Context window', 28));
	const items = [
		['System prompt', 'Role + instructions', 'document'],
		['Conversation history', 'Messages in this session', 'document'],
		['Tool outputs', 'Order lookup result', 'chip'],
		['Retrieved content', 'Relevant customer preferences', 'database']
	];
	items.forEach(([t, sub, k], i) => illustrated(s, 90, 465 + i * 112, 540, t, sub, k, '#ffffff'));
	const llm = illustrated(
		s,
		130,
		1005,
		460,
		'LLM reasoning',
		'Use the assembled context',
		'chip',
		BLUE
	);
	const answer = box(130, 1205, 460, 84, 'Response\n“Your order arrives Thursday.”', '#ffffff', 23);
	s.push(
		down(user, context, true),
		down(context, llm, true),
		down(llm, answer, true),
		answer,
		box(
			85,
			1340,
			550,
			75,
			'Finite context: older content may be\ntrimmed or summarized as the call grows.',
			'#ffffff',
			20
		)
	);
	const user2 = illustrated(
		s,
		800,
		215,
		470,
		'New session',
		'“Did my order arrive?”',
		'user',
		'#ffffff'
	);
	const retrieval = illustrated(
		s,
		800,
		385,
		470,
		'Retrieval',
		'Find relevant stored memories',
		'database',
		TEAL
	);
	const ctx = box(770, 550, 550, 405, '', '#ffffff');
	s.push(ctx, label(795, 572, 'Context window', 28));
	[
		'Current input + system prompt',
		'Conversation history',
		'Tool outputs',
		'Retrieved memory'
	].forEach((t, i) => s.push(box(795, 632 + i * 73, 500, 56, t, TEAL, 21)));
	const store = box(770, 1070, 490, 335, '', TEAL);
	s.push(store, label(794, 1090, 'Persistent memory store', 26));
	[
		'Episodic: what happened',
		'Semantic: facts + preferences',
		'Procedural: how to do the task'
	].forEach((t, i) => s.push(box(793, 1155 + i * 74, 445, 58, t, '#ffffff', 20)));
	s.push(
		down(user2, retrieval, true),
		down(retrieval, ctx, true),
		edge(
			store,
			retrieval,
			[
				[770, 1230],
				[742, 1230],
				[742, 437],
				[800, 437]
			],
			true
		),
		edge(
			ctx,
			store,
			[
				[1320, 805],
				[1340, 805],
				[1340, 1235],
				[1260, 1235]
			],
			true
		),
		label(885, 989, 'Extract + update key information', 20, '#237558')
	);
	return s;
}

function gitHistory() {
	const s = sheet(
		'git merge vs git rebase',
		'Preserve the branch structure — or replay commits onto a new base.',
		1200,
		1530,
		'7480284642747772930'
	);
	/** @param {number} x @param {number} y @param {string} text @param {string} color */
	const commit = (x, y, text, color) => ({
		...oval(x, y, 64, 64, color),
		label: { text, fontFamily: 2, fontSize: 20 }
	});
	/** @param {Shape[]} nodes */
	const chain = (nodes) => {
		s.push(...nodes);
		nodes.slice(1).forEach((n, i) => s.push(across(nodes[i], n, true)));
	};
	for (const [i, title, color] of /** @type {Array<[number,string,string]>} */ ([
		[0, 'INITIAL STATE', GREY],
		[1, 'AFTER GIT MERGE', TEAL],
		[2, 'AFTER GIT REBASE', BLUE]
	])) {
		const y = 180 + i * 405;
		s.push(...panel(40, y, 1120, 370, title, '#ffffff'));
		const main = ['A', 'B', 'C', 'D'].map((t, j) =>
			commit(110 + j * 170, y + 100, t, j < 2 ? GREY : BLUE)
		);
		chain(main);
		s.push(label(480, y + 43, i === 2 ? 'Main stays at D' : 'Main branch', 21, '#2462aa'));
		if (i < 2) {
			const feature = ['E', 'F', 'G'].map((t, j) => commit(480 + j * 200, y + 255, t, GOLD));
			chain(feature);
			s.push(
				edge(
					main[1],
					feature[0],
					[
						[304, y + 148],
						[340, y + 255],
						[480, y + 279]
					],
					true
				),
				label(780, y + 209, 'Feature branch', 20, '#8f5e12')
			);
			if (i === 1) {
				const merge = commit(1005, y + 100, 'H', color);
				s.push(
					merge,
					across(main[3], merge, true),
					edge(
						feature[2],
						merge,
						[
							[904, y + 255],
							[1029, y + 210],
							[1029, y + 148]
						],
						true
					),
					label(868, y + 45, 'Two-parent merge', 20, '#237558')
				);
			}
		} else {
			const fresh = ['E′', 'F′', 'G′'].map((t, j) => commit(790 + j * 130, y + 100, t, GOLD));
			chain(fresh);
			s.push(across(main[3], fresh[0], true));
			const old = ['E', 'F', 'G'].map((t, j) => commit(480 + j * 170, y + 260, t, GREY));
			chain(old);
			s.push(
				edge(
					main[1],
					old[0],
					[
						[304, y + 148],
						[340, y + 260],
						[480, y + 284]
					],
					true
				),
				label(440, y + 215, 'Original commits replaced on this branch', 19, MUTED),
				label(820, y + 45, 'New commit identities', 20, '#8f5e12')
			);
		}
	}
	s.push(
		label(
			65,
			1410,
			'Rebase rewrites history. Coordinate before rewriting a shared branch.',
			21,
			MUTED
		)
	);
	return s;
}

/** @type {Array<[string, string, string, string, () => Shape[]]>} */
const definitions = [
	[
		'harness',
		'Harness engineering',
		'Six stages, two feedback paths, observability and constraints.',
		'7498043434084196353',
		harness
	],
	[
		'inference-engines',
		'Ollama vs vLLM vs SGLang',
		'Three complete serving flows with queue, cache and fit comparisons.',
		'7495506067385106432',
		engines
	],
	[
		'api-testing',
		'Nine API testing types',
		'Nine colored rows with mechanisms, purposes and concrete examples.',
		'7492969330666729490',
		apiTesting
	],
	[
		'kafka',
		'Five Kafka use cases',
		'Five mini-architectures, from log analysis to event-driven services.',
		'7490795004563673088',
		kafka
	],
	[
		'cicd',
		'CI, delivery and deployment',
		'Build, checks, artifact and staging, then manual or automated release.',
		'7491157399484076033',
		cicd
	],
	[
		'memory',
		'Short-term vs long-term memory',
		'Nested context windows, retrieval and a persistent memory store.',
		'7488983080410460160',
		memory
	],
	[
		'git-history',
		'Git merge vs rebase',
		'Initial history, a two-parent merge, and replayed commits with new IDs.',
		'7480284642747772930',
		gitHistory
	],
	[
		'data-agent',
		'Data agent architecture',
		'Latent Space edition: numbered flows, illustrated tools, authentic logos and editable layers.',
		'7467951928778330114',
		createDataAgentPreset
	]
];

/** @type {Preset[]} */
export const DRAW_REFERENCE_PRESETS = definitions.map(
	([id, title, description, urn, createShapes]) => ({
		id: `bytebytego-${id}`,
		label: title,
		description,
		source: {
			author: 'Alex Xu / ByteByteGo',
			url: sourceUrl(urn),
			note:
				id === 'data-agent'
					? 'Source-faithful layout with a Latent Space palette, native pictograms and bundled logos. Not a pixel-exact or animated copy.'
					: 'Editable reconstruction; simplified glyphs and wording. Not a pixel-exact or animated copy.'
		},
		preview:
			id === 'data-agent'
				? '/draw-presets/bytebytego-data-agent-ls.webp'
				: `/draw-presets/bytebytego-${id}.webp`,
		createShapes
	})
);
