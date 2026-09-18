<script>
	/** @type {import('$lib/portfolio').PortfolioCompany} */
	export let company;
	export let compact = false;
</script>

{#if company.exit}
	<div class="exit-mark" class:compact aria-hidden="true">
		<svg viewBox="0 0 96 96" fill="none">
			<circle cx="48" cy="45" r="35" fill="#f8efda" />
			<circle cx="48" cy="45" r="30" stroke="#c39b46" stroke-width="1" />
			<g stroke="#ae8333" stroke-width="1.5" stroke-linecap="round">
				<path d="M22 71C8 55 12 35 23 24M74 71C88 55 84 35 73 24" />
				<path
					d="M17 60L9 56M15 49L8 43M17 38L13 30M20 30L21 21M79 60L87 56M81 49L88 43M79 38L83 30M76 30L75 21"
				/>
			</g>
			<g fill="#b88b37">
				<path d="M48 2L50 7L55 9L50 11L48 16L46 11L41 9L46 7Z" />
				<path d="M7 15L8.5 18.5L12 20L8.5 21.5L7 25L5.5 21.5L2 20L5.5 18.5Z" />
				<path d="M88 67L89.5 70.5L93 72L89.5 73.5L88 77L86.5 73.5L83 72L86.5 70.5Z" />
				<circle cx="86" cy="15" r="2" />
				<circle cx="8" cy="73" r="1.5" />
			</g>
		</svg>
		<div class="acquirer-mark">
			<img src={company.exit.acquirerLogo} alt="" width="46" height="46" loading="lazy" />
		</div>
		<div class="origin-mark">
			{#if company.logo}
				<img src={company.logo} alt="" width="23" height="23" loading="lazy" />
			{/if}
		</div>
	</div>
{/if}

<style>
	.exit-mark.compact {
		flex-basis: 54px;
		width: 54px;
		height: 54px;
	}
	.compact .acquirer-mark {
		inset: 12px 12px 17px;
	}
	.compact .acquirer-mark img {
		width: 28px;
		height: 28px;
	}
	.compact .origin-mark {
		left: 18px;
		width: 19px;
		height: 19px;
		border-radius: 4px;
	}
	.compact .origin-mark img {
		width: 15px;
		height: 15px;
	}

	.exit-mark {
		position: relative;
		flex: 0 0 84px;
		width: 84px;
		height: 84px;
		color-scheme: light;
	}
	svg {
		width: 100%;
		height: 100%;
	}
	.acquirer-mark {
		position: absolute;
		inset: 20px 20px 26px;
		display: grid;
		place-items: center;
	}
	.acquirer-mark img {
		width: 44px;
		height: 44px;
		object-fit: contain;
		border-radius: 5px;
	}
	.origin-mark {
		position: absolute;
		bottom: 0;
		left: 28px;
		width: 29px;
		height: 29px;
		display: grid;
		place-items: center;
		background: white;
		border: 1px solid #dcc8a0;
		border-radius: 7px;
	}
	.origin-mark img {
		width: 23px;
		height: 23px;
		object-fit: contain;
		border-radius: 4px;
	}
</style>
