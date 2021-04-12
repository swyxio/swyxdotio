<script>
  let options =
    "{&quot;settings&quot;:{&quot;after_subscribe&quot;:{&quot;action&quot;:&quot;message&quot;,&quot;success_message&quot;:&quot;Success! Now check your email to confirm your subscription.&quot;,&quot;redirect_url&quot;:&quot;&quot;},&quot;analytics&quot;:{&quot;google&quot;:null,&quot;facebook&quot;:null,&quot;segment&quot;:null,&quot;pinterest&quot;:null,&quot;sparkloop&quot;:null,&quot;googletagmanager&quot;:null},&quot;modal&quot;:{&quot;trigger&quot;:&quot;timer&quot;,&quot;scroll_percentage&quot;:null,&quot;timer&quot;:5,&quot;devices&quot;:&quot;all&quot;,&quot;show_once_every&quot;:15},&quot;powered_by&quot;:{&quot;show&quot;:true,&quot;url&quot;:&quot;https://convertkit.com?utm_source=dynamic&amp;utm_medium=referral&amp;utm_campaign=poweredby&amp;utm_content=form&quot;},&quot;recaptcha&quot;:{&quot;enabled&quot;:false},&quot;return_visitor&quot;:{&quot;action&quot;:&quot;custom_content&quot;,&quot;custom_content&quot;:&quot;You already signed up to the newsletter so I'm not showing a signup box. Nice, right?&quot;},&quot;slide_in&quot;:{&quot;display_in&quot;:&quot;bottom_right&quot;,&quot;trigger&quot;:&quot;timer&quot;,&quot;scroll_percentage&quot;:null,&quot;timer&quot;:5,&quot;devices&quot;:&quot;all&quot;,&quot;show_once_every&quot;:15},&quot;sticky_bar&quot;:{&quot;display_in&quot;:&quot;top&quot;,&quot;trigger&quot;:&quot;timer&quot;,&quot;scroll_percentage&quot;:null,&quot;timer&quot;:5,&quot;devices&quot;:&quot;all&quot;,&quot;show_once_every&quot;:15}},&quot;version&quot;:&quot;5&quot;}"
  export let placeholder = 'I solemnly swear to never spam you.'
  let isSignedUp = false
  if (typeof window !== 'undefined') {
      isSignedUp = localStorage.getItem('swyxSignedUp') === 'yes'
  }
  function show() {
    localStorage.setItem('swyxSignedUp', 'no')
    isSignedUp = false
  }
  function storeStorage() {
    localStorage.setItem('swyxSignedUp', 'yes')
  }
</script>

<svelte:head>
  <script src="https://f.convertkit.com/ckjs/ck.5.js"></script>
</svelte:head>

{#if isSignedUp}
  <div>
    <p>
      You already signed up previously so we're not showing a form. Thank you!
    </p>
    <button on:click={show}>Show anyway</button>
  </div>
{:else}
  <form
    action="https://app.convertkit.com/forms/2193112/subscriptions"
    method="post"
    data-sv-form="2193112"
    data-uid="67e2f27256"
    data-format="inline"
    data-version="5"
    data-options={options}
    class="mt-3"
  >
    <ul
      class="formkit-alert formkit-alert-error"
      data-element="errors"
      data-group="alert"
    />

    <div
      data-element="fields"
      data-stacked="true"
      class="seva-fields formkit-fields w-full"
    >
      <div class="formkit-field sm:flex">
        <input
          class="formkit-input appearance-none block w-full px-3 py-3 border
          border-gray-300 text-sm leading-6 rounded-md
          placeholder-gray-500 shadow-sm focus:outline-none
          focus:placeholder-gray-400 focus:ring-4 focus:ring-blue-200 focus:bg-yellow-100
          focus:border-blue-300 transition duration-150 ease-in-out
          text-gray-900 sm:flex-1"
          name="email_address"
          aria-label="Email Address"
          {placeholder}
          required=""
          type="email"
        />
        <button
          type="submit"
          on:click={storeStorage}
          data-element="submit"
          class="formkit-submit formkit-submit mt-3 w-full px-6 py-3 border border-transparent text-base
          leading-6 font-medium rounded-md text-white bg-indigo-600
          shadow-sm hover:bg-indigo-400 focus:outline-none
          focus:border-gray-300 focus:ring-gray focus:bg-red-500
          active:bg-indigo-400 transition duration-150 ease-in-out sm:mt-0
          sm:ml-3 sm:flex-shrink-0 sm:inline-flex sm:items-center
          sm:w-auto hover:animate-wiggle"
        >
          <div class="formkit-spinner">
            <div />
            <div />
            <div />
          </div>
          <span class="">Subscribe</span>
        </button>
      </div>
      <div class="formkit-field">
        <div role="button" tabindex="0">
          <fieldset
            data-group="checkboxes"
            class="formkit-5494"
            type="Custom"
            order="1"
            save_as="Tag"
            group="field"
          >
            <div
              class="formkit-checkboxes text-sm mt-2"
              data-element="tags-checkboxes"
              data-group="checkbox"
            >
              <input
                class="formkit-checkbox"
                id="tag-45274896-2310032"
                type="checkbox"
                name="tags[]"
                value="2310032"
                checked
              />
              <label for="tag-45274896-2310032"
                >Send a TL;DR of the top 10 swyx.io posts!
              </label>
            </div>
          </fieldset>
        </div>
      </div>
    </div>
    <div
      class="formkit-guarantee hidden"
      data-element="guarantee"
      style="color: rgb(77, 77, 77); font-size: 13px; font-weight: 400;"
    >
      We won't send you spam. Unsubscribe at any time.
    </div>
    <div class="formkit-powered-by-convertkit-container hidden">
      <a
        href="https://convertkit.com?utm_source=dynamic&amp;utm_medium=referral&amp;utm_campaign=poweredby&amp;utm_content=form"
        data-element="powered-by"
        class="formkit-powered-by-convertkit"
        data-variant="dark"
        target="_blank"
        rel="noopener noreferrer"
        >Built with ConvertKit
      </a>
    </div>
    <!-- <input
    aria-label="Email"
    id="tlemail"
    name="email"
    type="email"
    class="appearance-none block w-full px-3 py-3 border
    border-gray-300 text-sm leading-6 rounded-md
    placeholder-gray-500 shadow-sm focus:outline-none
    focus:placeholder-gray-400 focus:ring-4 focus:ring-blue-200 focus:bg-yellow-100
    focus:border-blue-300 transition duration-150 ease-in-out
    text-gray-900 sm:flex-1"
    placeholder="I solemnly swear to never spam you."
    />
    <input type="hidden" value="1" name="embed" />
    <button
    type="submit"
    class="mt-3 w-full px-6 py-3 border border-transparent text-base
        leading-6 font-medium rounded-md text-white bg-indigo-600
        shadow-sm hover:bg-indigo-400 focus:outline-none
        focus:border-gray-300 focus:ring-gray focus:bg-yellow-200
        active:bg-indigo-400 transition duration-150 ease-in-out sm:mt-0
        sm:ml-3 sm:flex-shrink-0 sm:inline-flex sm:items-center
        sm:w-auto hover:animate-wiggle"
    >
    Subscribe via Email
    </button> -->
  </form>
{/if}
<!-- <form
      action="https://tinyletter.com/swyx"
      method="post"
      target="popupwindow"
      onsubmit="window.open('https://tinyletter.com/swyx', 'popupwindow', 'scrollbars=yes,width=800,height=600');return true"
      class="mt-3 sm:flex"
    >
      <input
        aria-label="Email"
        id="tlemail"
        name="email"
        type="email"
        class="appearance-none block w-full px-3 py-3 border
        border-gray-300 text-sm leading-6 rounded-md
        placeholder-gray-500 shadow-sm focus:outline-none
        focus:placeholder-gray-400 focus:ring-4 focus:ring-blue-200 focus:bg-yellow-100
        focus:border-blue-300 transition duration-150 ease-in-out
        text-gray-900 sm:flex-1"
        placeholder="I solemnly swear to never spam you."
      />
      <input type="hidden" value="1" name="embed" />
      <button
        type="submit"
        class="mt-3 w-full px-6 py-3 border border-transparent text-base
          leading-6 font-medium rounded-md text-white bg-indigo-600
          shadow-sm hover:bg-indigo-400 focus:outline-none
          focus:border-gray-300 focus:ring-gray focus:bg-yellow-200
          active:bg-indigo-400 transition duration-150 ease-in-out sm:mt-0
          sm:ml-3 sm:flex-shrink-0 sm:inline-flex sm:items-center
          sm:w-auto hover:animate-wiggle"
      >
        Subscribe via Email
      </button>
    </form> -->
