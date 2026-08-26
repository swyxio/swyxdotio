<script>
	export let isOwner = false;
	/** @type {Array<{id:string,name:string,description:string,owner?:boolean,tools:Array<{id:string,name:string,description:string,href:string,reload?:boolean,badge?:string}>}>} */
	const groups = [
		{
			id: 'workspace',
			name: 'Your workspace',
			description: 'Think, write, and make.',
			tools: [
				{ id: 'draw', name: 'Draw', description: 'A multipage whiteboard.', href: '/tools/draw' },
				{
					id: 'box',
					name: 'Big text box',
					description: 'Text stays on your device.',
					href: '/tools/box'
				}
			]
		},
		{
			id: 'team',
			name: 'Team swyx',
			description: 'Separate app sign-in and team access.',
			tools: [
				{
					id: 'cap',
					name: 'Cap',
					description: 'Record and share your screen.',
					href: '/tools/cap',
					reload: true,
					badge: 'Team access'
				},
				{
					id: 'calendar',
					name: 'swyxcal',
					description: 'Team scheduling. Bookings paused.',
					href: 'https://cal.swyx.io/app',
					reload: true,
					badge: 'Invited team'
				}
			]
		},
		{
			id: 'owner',
			name: 'Site owner',
			description: 'Publishing and media utilities.',
			owner: true,
			tools: [
				{
					id: 'podcast',
					name: 'Podcast studio',
					description: 'Publish to your existing feeds.',
					href: '/tools/podcast',
					badge: 'Site owner'
				},
				{
					id: 'reclip',
					name: 'Reclip',
					description: 'Open the media downloader.',
					href: '/tools/reclip',
					badge: 'Site owner'
				}
			]
		}
	];
</script>

<nav class="cabinet" aria-label="Your tools">
	{#each groups.filter((group) => !group.owner || isOwner) as group}
		<section class:owner-tools={group.owner} aria-labelledby={'tools-' + group.id}>
			<header>
				<h2 id={'tools-' + group.id}>{group.name}</h2>
				<p>{group.description}</p>
			</header>
			<ul>
				{#each group.tools as tool}
					<li class:labelled-drawer={tool.badge}>
						<a href={tool.href} class="drawer" data-sveltekit-reload={tool.reload}>
							<span class="drawer-face">
								<img
									src={'/assets/tools-cabinet/' + tool.id + '.webp'}
									alt=""
									width="420"
									height="420"
								/>
								<span class="drawer-copy"
									><strong>{tool.name}</strong><span class="description">{tool.description}</span
									></span
								>
								<span class="mobile-arrow" aria-hidden="true">›</span>
							</span>
							<span class="drawer-pull">
								{#if tool.badge}<span class="brass-label">{tool.badge}</span>{:else}<span
										class="cup-handle"
										aria-hidden="true"
									></span>{/if}
							</span>
						</a>
					</li>
				{/each}
			</ul>
		</section>
	{/each}
</nav>

<style>
	.cabinet {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 18px;
		position: relative;
		z-index: 1;
		--wood: url('/assets/tools-cabinet/wood.webp');
		--paper: #f4ead7;
		--ink: #35291e;
		padding: 12px;
		border: 5px ridge #82603c;
		border-radius: 4px;
		background: #513820 var(--wood) repeat;
		background-size: 420px;
		box-shadow:
			inset 0 0 0 2px #2c1d11,
			0 8px 14px #24180e26,
			0 2px 2px #24180e44;
	}
	section {
		min-width: 0;
	}
	.owner-tools {
		grid-column: 1 / -1;
	}
	header {
		color: #f4ead7;
		padding: 2px 4px 10px;
	}
	header h2 {
		margin: 0;
		font-family: var(--font-display);
		font-size: 1.15rem;
		font-weight: 500;
	}
	header p {
		margin: 4px 0 0;
		font-size: 0.7rem;
		color: #ead7b9;
	}
	ul {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 10px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	li {
		min-width: 0;
	}
	.drawer {
		display: grid;
		height: 100%;
		grid-template-rows: 1fr auto;
		padding: 5px;
		color: var(--ink);
		text-decoration: none;
		border: 1px solid #b08958;
		border-radius: 3px;
		background: #674424 var(--wood) center / 360px;
		box-shadow:
			0 0 0 2px #291b10,
			inset 1px 1px 2px #e0b37599,
			2px 3px 4px #160f0b88;
		transition:
			transform 160ms ease,
			box-shadow 160ms ease;
	}
	.drawer-face {
		display: flex;
		flex-direction: column;
		align-items: center;
		min-height: 229px;
		padding: 12px 8px 13px;
		background: var(--paper) url('/assets/tools-cabinet/paper.webp') center / 360px;
		border: 1px solid #51331d;
		border-radius: 3px;
		box-shadow:
			inset 2px 3px 12px #5c381a3d,
			inset 0 0 0 2px #d9c49b;
	}
	img {
		width: 132px;
		height: 132px;
		object-fit: contain;
		background: transparent;
		margin-bottom: 8px;
	}
	.drawer-copy {
		display: grid;
		gap: 7px;
		text-align: center;
	}
	strong {
		font-family: var(--font-display);
		font-size: 1.25rem;
		line-height: 1.12;
		font-weight: 600;
	}
	.description {
		font-size: 0.8rem;
		line-height: 1.4;
		max-width: 19ch;
		color: #65513e;
	}
	.drawer-pull {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 74px;
		margin: 5px 1px 0;
		border: 1px solid #3d2816;
		border-radius: 2px;
		background: #674424 var(--wood) bottom / 280px;
		box-shadow:
			inset 0 1px 1px #d4ad7188,
			inset 0 -3px 4px #21140888,
			0 1px 1px #c19b5d66;
	}
	.cup-handle {
		display: block;
		width: 118px;
		height: 60px;
		background: url('/assets/tools-cabinet/brass-pull.webp') center / contain no-repeat;
	}
	.brass-label {
		position: relative;
		min-width: 95px;
		padding: 4px 13px;
		border: 3px ridge #b79a5e;
		border-radius: 3px;
		background: linear-gradient(100deg, #b69655, #dcc390 45%, #baa06a);
		color: #302317;
		font-family: var(--font-mono);
		font-size: 0.65rem;
		font-weight: 600;
		text-align: center;
		letter-spacing: 0.03em;
		box-shadow: 1px 2px 2px #1b130e88;
	}
	.brass-label::before,
	.brass-label::after {
		position: absolute;
		content: '·';
		top: 0;
		bottom: 0;
		display: grid;
		align-items: center;
		color: #503b20;
		font-size: 1rem;
	}
	.brass-label::before {
		left: 2px;
	}
	.brass-label::after {
		right: 2px;
	}
	.mobile-arrow {
		display: none;
	}
	.drawer:focus-visible {
		outline: 3px solid #fff4ce;
		outline-offset: 3px;
	}
	@media (hover: hover) {
		.drawer:hover {
			transform: translateY(-3px);
			box-shadow:
				0 0 0 2px #ba955e,
				2px 7px 8px #160f0baa;
			color: var(--ink);
		}
	}
	@media (min-width: 601px) {
		.owner-tools .drawer-face {
			display: grid;
			grid-template-columns: 80px minmax(0, 1fr);
			gap: 12px;
			min-height: 100px;
			padding: 8px 16px;
		}
		.owner-tools img {
			width: 80px;
			height: 80px;
			margin: 0;
		}
		.owner-tools .drawer-copy {
			text-align: left;
		}
		.owner-tools .description {
			max-width: none;
		}
		.owner-tools .drawer-pull {
			display: none;
		}
	}
	@media (min-width: 601px) and (max-width: 850px) {
		.cabinet {
			grid-template-columns: minmax(0, 1fr);
		}
		.drawer-face {
			min-height: 210px;
		}
	}
	@media (max-width: 600px) {
		.cabinet {
			grid-template-columns: minmax(0, 1fr);
			gap: 18px;
			padding: 8px;
			border-width: 4px;
		}
		ul {
			grid-template-columns: minmax(0, 1fr);
			gap: 9px;
		}
		.drawer {
			padding: 4px;
			position: relative;
		}
		.drawer-face {
			display: grid;
			grid-template-columns: 66px minmax(0, 1fr) 14px;
			gap: 9px;
			min-height: 92px;
			padding: 9px;
		}
		img {
			width: 66px;
			height: 66px;
			margin: 0;
		}
		.drawer-copy {
			text-align: left;
			gap: 4px;
		}
		strong {
			font-size: 1.18rem;
		}
		.description {
			font-size: 0.73rem;
			max-width: none;
		}
		.mobile-arrow {
			display: block;
			font-size: 1.7rem;
		}
		.drawer-pull {
			display: none;
			min-height: 0;
		}
		.labelled-drawer .drawer-face {
			padding-bottom: max(25px, 1.65rem);
		}
		.labelled-drawer .drawer-pull {
			display: flex;
			position: absolute;
			background: transparent;
			border: 0;
			box-shadow: none;
			margin: 0;
			bottom: 8px;
			left: 88px;
		}
		.labelled-drawer .brass-label {
			font-size: 0.53rem;
			min-width: 0;
			padding: 0 10px;
			border-width: 2px;
		}
	}
	@media (forced-colors: active) {
		.cabinet,
		.drawer,
		.drawer-face,
		.brass-label {
			background: Canvas;
			color: CanvasText;
			border: 1px solid CanvasText;
			box-shadow: none;
		}
		.cup-handle {
			background: none;
		}
		.drawer-pull {
			background: Canvas;
			border-color: CanvasText;
			box-shadow: none;
		}
		header,
		header p,
		.description {
			color: CanvasText;
		}
		.drawer:focus-visible {
			outline-color: Highlight;
		}
	}
</style>
