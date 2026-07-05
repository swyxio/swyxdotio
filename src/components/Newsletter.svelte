<section class="plain-section site-card w-full" id="newsletter">
	<h3 class="mb-2 text-xl font-bold">Subscribe to the newsletter</h3>
	<p class="mb-3">
		Join &gt;10,000 subscribers getting occasional updates on new posts and projects.
	</p>
	<form
		class="flex max-w-lg flex-wrap gap-2"
		action="https://buttondown.email/api/emails/embed-subscribe/swyx"
		method="post"
		target="popupwindow"
		on:submit={() => window.open('https://buttondown.email/swyx', 'popupwindow')}
	>
		<label class="sr-only" for="bd-email">Email for newsletter</label>
		<input
			class="plain-input min-w-0 flex-1"
			type="email"
			id="bd-email"
			name="email"
			placeholder="tim@apple.com"
			autocomplete="email"
			required={true}
		/>
		<button class="plain-button" type="submit">Subscribe</button>
	</form>
	<p class="plain-muted mt-3 text-sm">
		I also write an <a href="https://lspace.swyx.io/">AI newsletter</a> and a
		<a href="https://dx.tips/">DevRel/DevTools newsletter</a>.
	</p>
</section>
