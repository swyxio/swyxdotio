<div class="essay-mark">
	<div class="essay-mark-label">
		<span>A PERSONAL ESSAY</span>
		<div class="essay-mark-rule" aria-hidden="true"><i></i><i></i><i></i></div>
	</div>
	<img
		src="/assets/personal/two-cities.webp"
		alt=""
		width="1100"
		height="403"
		decoding="async"
		fetchpriority="low"
	/>
</div>

<style>
	.essay-mark {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		min-width: 0;
		margin: 0 0 0.35rem;
	}

	.essay-mark-label {
		flex: 0 0 auto;
		color: var(--page-gold);
		font: 600 0.7rem/1.4 var(--font-body);
		letter-spacing: 0.09em;
	}

	.essay-mark-rule {
		display: flex;
		gap: 3px;
		width: 3.75rem;
		margin-top: 0.55rem;
	}

	.essay-mark-rule i {
		flex: 1;
		height: 2px;
		background: #b75642;
	}

	.essay-mark-rule i:nth-child(2) {
		background: #427d86;
	}

	.essay-mark-rule i:nth-child(3) {
		background: #b48a3a;
	}

	.essay-mark img {
		display: block;
		width: min(15rem, 50%);
		height: auto;
		margin: 0;
		background: transparent;
	}

	@media (max-width: 600px) {
		.essay-mark img {
			width: min(11.5rem, 52%);
		}
	}
</style>
