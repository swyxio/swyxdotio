import { path, oval, group } from './draw-illustration.js';
import {
	LS_DIAGRAM as C,
	diagramBox as box,
	diagramCaption as caption,
	diagramText as text,
	diagramIcon as icon,
	diagramLogo as logo,
	diagramStage as stage,
	diagramPill as pill
} from './draw-diagram-kit.js';
/** @typedef {import('./draw-presets.js').PresetShape} Shape */
const SOURCE = 'https://www.linkedin.com/feed/update/urn:li:activity:7467951928778330114/';

/** @param {Shape} a @param {Shape} b @param {Array<[number,number]>} points @param {boolean} [curve] @returns {Shape} */
function edge(a, b, points, curve = false) {
	// Keep orthogonal pipes straight between small rounded corners. A sparse
	// four-point spline otherwise bows far into adjacent labels.
	if (
		curve &&
		points.length > 2 &&
		points.slice(1).every((p, i) => p[0] === points[i][0] || p[1] === points[i][1])
	) {
		points = points.flatMap((p, i) => {
			if (!i || i === points.length - 1) return [p];
			const before = points[i - 1],
				after = points[i + 1];
			const radius = Math.min(
				10,
				Math.hypot(p[0] - before[0], p[1] - before[1]) / 3,
				Math.hypot(after[0] - p[0], after[1] - p[1]) / 3
			);
			return /** @type {Array<[number,number]>} */ ([
				[p[0] - Math.sign(p[0] - before[0]) * radius, p[1] - Math.sign(p[1] - before[1]) * radius],
				p,
				[p[0] + Math.sign(after[0] - p[0]) * radius, p[1] + Math.sign(after[1] - p[1]) * radius]
			]);
		});
	}
	return {
		...path(points),
		type: 'arrow',
		start: { id: a.id },
		end: { id: b.id },
		endArrowhead: 'arrow',
		strokeColor: C.ink,
		strokeWidth: 2.4,
		roundness: curve ? { type: 2 } : null
	};
}
/** @param {number} x @param {number} y @param {number} w @param {number} h @param {string} [fill] */
function boundary(x, y, w, h, fill = 'transparent') {
	return {
		...box(x, y, w, h, fill),
		strokeStyle: /** @type {const} */ ('dashed'),
		strokeColor: C.border,
		strokeWidth: 2
	};
}
/** Small grouped native ports keep parallel connectors on their intended tracks.
 * @param {number} x @param {number} y */
function port(x, y) {
	return { ...box(x - 1, y - 1, 2, 2, 'transparent'), strokeColor: 'transparent' };
}
/** Compact source-faithful composition; LS palette and lockup identify this adaptation.
 * The model name is the label in the supplied source, not a live model recommendation.
 * @returns {Shape[]} */
export function createDataAgentPreset() {
	/** @type {Shape[]} */ const s = [
		{ ...box(0, 0, 1230, 1670, C.paper), strokeColor: C.paper, roundness: null },
		{ ...box(25, 27, 12, 56, C.purple), strokeColor: C.purple },
		text(51, 23, 'How OpenAI Built Its Data Agent', 42, true),
		logo('latent-space', 974, 30, 43),
		text(1026, 40, 'Latent Space', 23),
		boundary(91, 120, 1100, 419),
		boundary(104, 579, 1087, 997),
		{ ...boundary(189, 611, 943, 209, C.pale), strokeColor: C.purple },
		...pill(477, 99, 321, 'Offline Data Prep'),
		...pill(480, 558, 321, 'Runtime Workflow'),
		...stage(169, 600, 2),
		caption(115, 651, 146, 'Context\nassembly', 20, true),
		{
			...text(
				38,
				1620,
				'Diagram study after Alex Xu / ByteByteGo · Latent Space palette · View original ↗',
				16,
				false,
				C.muted
			),
			link: SOURCE
		}
	];
	// Offline sources: distinct visual identities, not a row of interchangeable cards.
	const internal = box(321, 193, 130, 116);
	const knowledge = box(727, 238, 133, 116);
	const past = box(1000, 208, 140, 116);
	s.push(
		...group([internal, ...icon('data-cluster', 332, 203, 108)]),
		caption(297, 155, 180, 'Internal Data', 24, true),
		...group([
			knowledge,
			logo('google-docs', 741, 251, 36),
			logo('slack', 796, 251, 36),
			logo('notion', 774, 305, 34)
		]),
		caption(692, 161, 205, 'Institutional\nknowledge', 23, true),
		...group([past, ...icon('conversations', 1015, 218, 111)]),
		caption(985, 145, 173, 'Past\nConversations', 23, true)
	);
	const meta = box(169, 364, 139, 63),
		human = box(319, 364, 139, 63),
		codex = box(469, 364, 139, 63);
	for (const [node, kind, title] of /** @type {Array<[Shape,string,string]>} */ ([
		[meta, 'table', 'Table usage\nmetadata'],
		[human, 'conversations', 'Human\nannotations'],
		[codex, 'sparkles', 'Codex\nenrichment']
	])) {
		s.push(
			...group([
				node,
				...icon(kind, node.x + 8, node.y + 13, 35),
				text(node.x + 50, node.y + 17, title, 13)
			])
		);
		s.push(
			edge(
				internal,
				node,
				[
					[386, 309],
					[386, 337],
					[node.x + 69, 337],
					[node.x + 69, 364]
				],
				true
			)
		);
	}
	const daily = box(320, 467, 136, 59, C.violet),
		index = box(734, 425, 133, 59, C.violet);
	s.push(
		...group([daily, caption(320, 478, 136, 'Daily Indexing\nJob', 17)]),
		...group([index, caption(734, 445, 133, 'Indexing Job', 17)])
	);
	for (const n of [meta, human, codex])
		s.push(
			edge(
				n,
				daily,
				[
					[n.x + 69, 427],
					[n.x + 69, 444],
					[388, 444],
					[388, 467]
				],
				true
			)
		);
	s.push(
		edge(knowledge, index, [
			[793, 354],
			[793, 425]
		])
	);
	// Use invisible native ellipse anchors coincident with database silhouettes so
	// semantic connectors retain real bindings when the user moves a grouped icon.
	const tableIndex = { ...oval(356, 635, 48, 44, 'transparent'), strokeColor: 'transparent' },
		knowledgeIndex = { ...oval(773, 635, 48, 44, 'transparent'), strokeColor: 'transparent' },
		memory = { ...box(1043, 635, 50, 55, 'transparent'), strokeColor: 'transparent' };
	s.push(
		...group([
			tableIndex,
			...icon('database', 351, 628, 57),
			caption(314, 690, 130, 'Table\ndescriptions\n(index)', 13)
		]),
		...group([
			knowledgeIndex,
			...icon('database', 768, 628, 57),
			caption(736, 690, 125, 'Institutional\nKnowledge\n(index)', 13)
		]),
		...group([memory, ...icon('document', 1039, 630, 60), caption(1018, 695, 99, 'Memory', 16)]),
		edge(daily, tableIndex, [
			[388, 526],
			[388, 635]
		]),
		edge(index, knowledgeIndex, [
			[800, 484],
			[800, 635]
		]),
		edge(past, memory, [
			[1070, 324],
			[1070, 635]
		])
	);
	const search = box(544, 716, 132, 57, C.lilac),
		scope = box(850, 759, 153, 57);
	s.push(
		...group([
			search,
			...icon('search', 549, 723, 42),
			caption(591, 730, 80, 'Similarity\nSearch', 15)
		]),
		...group([scope, caption(850, 772, 153, 'Fetch by scope\n+ Filters', 16)]),
		edge(
			tableIndex,
			search,
			[
				[404, 657],
				[580, 657],
				[580, 716]
			],
			true
		),
		edge(
			knowledgeIndex,
			search,
			[
				[773, 657],
				[620, 657],
				[620, 716]
			],
			true
		),
		edge(
			memory,
			scope,
			[
				[1070, 690],
				[1070, 787],
				[1003, 787]
			],
			true
		)
	);
	const assembled = box(554, 942, 100, 67, C.paper),
		embedding = box(210, 968, 143, 64);
	s.push(
		...group([
			assembled,
			...[C.pink, C.violet, C.lilac].map((fill, i) => ({
				...box(554, 942 + i * 22, 100, 22, fill),
				roundness: null
			})),
			caption(528, 1022, 155, 'Assembled\nContext', 17, true)
		]),
		...group([
			embedding,
			...icon('embedding', 215, 986, 48),
			caption(264, 987, 85, 'Embedding\nModel', 14)
		]),
		...stage(185, 945, 1),
		...group([box(212, 840, 58, 82), caption(212, 846, 58, '0.21\n-0.47\n⋮\n0.63', 15)]),
		edge(
			embedding,
			search,
			[
				[281.5, 968],
				[281.5, 745],
				[544, 745]
			],
			true
		)
	);
	// The two retrieval outputs remain separate; their captions explain the payload.
	s.push(
		edge(search, assembled, [
			[566, 773],
			[566, 942]
		]),
		edge(search, assembled, [
			[588, 773],
			[588, 942]
		]),
		...icon('table', 497, 846, 28),
		caption(465, 880, 93, 'Retrieved\nrelevant tables', 13),
		...icon('database', 620, 846, 27),
		caption(602, 880, 80, 'Retrieved\ncontent', 13),
		edge(
			scope,
			assembled,
			[
				[850, 787],
				[702, 787],
				[702, 922],
				[637, 922],
				[637, 942]
			],
			true
		)
	);
	// Query splits into embedding and runtime; the agent loop gets two curved paths.
	const user = { ...box(29, 1118, 52, 63, 'transparent'), strokeColor: 'transparent' },
		runtime = box(528, 1108, 157, 92),
		model = box(1015, 1091, 129, 129, C.violet);
	const queryPort = port(83, 1154),
		embeddingPort = port(83, 1141);
	s.push(
		...group([
			user,
			queryPort,
			embeddingPort,
			...icon('user', 23, 1112, 65),
			caption(14, 1185, 80, 'User', 17, true)
		]),
		...group([runtime, caption(528, 1140, 157, 'Runtime', 25)]),
		...group([
			model,
			logo('openai', 1044, 1114, 69),
			caption(1015, 1189, 129, 'GPT-5.5', 21, true)
		]),
		edge(queryPort, runtime, [
			[84, 1154],
			[528, 1154]
		]),
		text(158, 1163, 'Query', 17, true),
		edge(
			embeddingPort,
			embedding,
			[
				[84, 1141],
				[281.5, 1141],
				[281.5, 1032]
			],
			true
		),
		edge(assembled, runtime, [
			[604, 1009],
			[604, 1108]
		]),
		edge(
			runtime,
			model,
			[
				[685, 1140],
				[794, 1105],
				[913, 1105],
				[1015, 1134]
			],
			true
		),
		edge(
			model,
			runtime,
			[
				[1015, 1167],
				[911, 1198],
				[789, 1198],
				[685, 1167]
			],
			true
		),
		...stage(813, 1073, 3),
		caption(751, 1138, 180, 'Agentic loop', 18, true)
	);
	// Tools retain the category, pictogram and concrete operation independently.
	const tools = box(247, 1250, 716, 176, '#faf8fc'),
		systems = box(258, 1465, 703, 121, C.lilac);
	const toolPorts = [352, 521, 690, 859].map((x) => port(x, 1426));
	const systemPorts = [352, 521, 690, 859].map((x) => port(x, 1465));
	s.push(
		...group([tools, ...toolPorts]),
		{ ...boundary(259, 1274, 691, 128), strokeWidth: 1 },
		...pill(551, 1228, 107, 'Tools'),
		edge(tools, runtime, [
			[604, 1250],
			[604, 1200]
		]),
		...group([systems, ...systemPorts]),
		caption(258, 1474, 703, 'Data & systems', 18, true)
	);
	const entries = [
		['Company Context\nLookups', 'building', 'e.g., Org Info Lookup', C.blue],
		['Internal Knowledge\nBases', 'book', 'e.g., Docs Search', C.lilac],
		['Big Data\nSystems', 'database', 'e.g., DAG Lookup', C.pink],
		['Metadata\nServices', 'tag', 'e.g., Dataset Metadata', C.violet]
	];
	entries.forEach(([title, kind, example, fill], i) => {
		const x = 274 + i * 169,
			card = box(x, 1291, 156, 100, C.paper);
		s.push(
			...group([
				card,
				...icon(kind, x + 8, 1306, 32, fill),
				text(x + 47, 1305, title, 12.5),
				{ ...box(x + 9, 1355, 138, 24, fill), strokeWidth: 1.3 },
				caption(x + 9, 1361, 138, example, 10.5)
			])
		);
		const link = edge(toolPorts[i], systemPorts[i], [
			[x + 78, 1426],
			[x + 78, 1465]
		]);
		link.startArrowhead = 'arrow';
		s.push(link);
	});
	const names = ['Data Warehouse', 'Data Lake', 'Airflow', 'Spark', 'Metadata Catalog'];
	names.forEach((name, i) => {
		const x = 292 + i * 137;
		s.push(
			...(i === 2
				? [logo('apacheairflow', x + 31, 1511, 43)]
				: i === 3
					? [logo('apachespark', x + 26, 1506, 54)]
					: icon(i === 1 ? 'lake' : 'database', x + 31, 1510, 43)),
			caption(x - 8, 1560, 128, name, 12.5, true)
		);
	});
	return s;
}
