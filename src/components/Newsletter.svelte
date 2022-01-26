<script>
	import { onMount } from 'svelte';

	let isNewsletterOpen = true;
	let isSubscribed = 'no';
	onMount(() => {
		isSubscribed = localStorage.getItem('isSubscribed');
		if (isSubscribed === 'subscribed') isNewsletterOpen = false;
	});
	function toggleNewsletter() {
		isNewsletterOpen = !isNewsletterOpen;
		isSubscribed = 'subscribed';
		localStorage.setItem('isSubscribed', 'subscribed');
	}
</script>

<section class="mb-16 w-full" id="newsletter">
	<div
		class="my-4 w-full border-y border-blue-200 bg-blue-50 p-6 dark:border-gray-600 dark:bg-gray-800 sm:rounded sm:border-x"
	>
		<div class="flex items-center justify-between space-x-4 text-gray-900 dark:text-gray-100">
			{#if isSubscribed === 'subscribed'}
			<p class="md:text-xl">
				Thanks for subscribing to the newsletter!
			</p>
			{:else}
			<p class="text-lg font-bold md:text-xl">
				Get updates on new posts and projects
			</p>
			{/if}

			<button
				aria-label="Toggle Newsletter CTA"
				class="flex h-9 w-9  items-center justify-center rounded-lg ring-gray-300 transition-all hover:ring-2"
				on:click={toggleNewsletter}
			>
				{#if isNewsletterOpen}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-5 w-5"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path
							fill-rule="evenodd"
							d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
							clip-rule="evenodd"
						/>
					</svg>
				{:else}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-5 w-5"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path
							fill-rule="evenodd"
							d="M15.707 4.293a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-5-5a1 1 0 011.414-1.414L10 8.586l4.293-4.293a1 1 0 011.414 0zm0 6a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-5-5a1 1 0 111.414-1.414L10 14.586l4.293-4.293a1 1 0 011.414 0z"
							clip-rule="evenodd"
						/>
					</svg>
				{/if}
			</button>
		</div>
		{#if isNewsletterOpen}
			<!-- <p class="my-1 text-gray-800 dark:text-gray-200">
				You know the deal <span class="font-bold"
					>Lorem ipsum dolor sit, amet consectetur adipisicing elit. Libero, ducimus.</span
				>.
			</p> -->

			<div id="revue-embed">
				<form
					class="relative my-4"
					action="https://www.getrevue.co/profile/swyx/add_subscriber"
					method="post"
					id="revue-form"
					name="revue-form"
					target="_blank"
				>
					<div class="revue-form-group formkit-field sm:flex">
						<input
							class="formkit-input mt-1 block 
						w-full appearance-none 
						rounded-lg
						border-gray-300 bg-white px-4 py-2 pr-32 text-gray-900 
						placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
							aria-label="Email Address"
							placeholder="your@email.com"
							type="email"
							name="member[email]"
							id="member_email"
						/>
						<div class="revue-form-actions">
							<input
								type="submit"
								on:click={toggleNewsletter}
								class="absolute flex right-0 top-0 sm:hidden items-center justify-center rounded-r-lg bg-zinc-100 px-4 
							py-2 font-medium text-gray-900 hover:text-gray-700 
							dark:bg-zinc-700 dark:text-gray-100
							hover:dark:text-yellow-200"
								value={'Subscribe'}
								name="member[subscribe]"
								id="member_submit"
							/>
							<input
								type="submit"
								on:click={toggleNewsletter}
								class="absolute hidden right-0 top-1 sm:flex items-center justify-center rounded-r-lg bg-zinc-100 px-4 
							py-2 font-medium text-gray-900 hover:text-gray-700 
							dark:bg-zinc-700 dark:text-gray-100
							hover:dark:text-yellow-200"
								value={isSubscribed ? 'Subscribe again why not' : 'Subscribe'}
								name="member[subscribe]"
								id="member_submit"
							/>
						</div>
					</div>
					<div class="revue-form-footer hidden">
						By subscribing, you agree with Revue’s <a
							target="_blank"
							href="https://www.getrevue.co/terms">Terms of Service</a
						>
						and <a target="_blank" href="https://www.getrevue.co/privacy">Privacy Policy</a>.
					</div>

					<!-- <form class="relative my-4" action="https://www.getrevue.co/profile/swyx/add_subscriber" method="post" id="revue-form" name="revue-form"  target="_blank">
					<div class="revue-form-group formkit-field sm:flex">

					</div>
				<input
					type="email"
					aria-label="Email Address"
					name="member[email]" id="member_email"
					placeholder="your@email.com"
					autocomplete="email"
					required={true}
					class="px-4 py-2 mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full border-gray-300 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 pr-32"
				/><button
					class="flex items-center justify-center absolute right-1 top-1 px-4 pt-1 font-medium h-8 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded w-28"
					type="submit">Subscribe</button
				>
			</form>
		-->
				</form>
			</div>
			<p class="mt-2 text-sm text-gray-800 dark:text-gray-200">
				3000+ subscribers including my Mom – <a href="https://www.getrevue.co/profile/swyx"
					>see past issues</a
				>
			</p>
		{/if}
	</div>
</section>
