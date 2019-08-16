import React from 'react'
export default function Subscribe() {
  return (
    <form
      action="https://tinyletter.com/swyx"
      method="post"
      target="popupwindow"
      className="site-main-content__newsletter-form"
    >
      <p>
        Get updates on new writing and talks!
<br/>
      <input style={{width: '30ch', marginRight: '1rem'}} required="" type="email" name="email" id="tlemail" placeholder="email@domain.com" />
      <input type="hidden" name="embed" value="1" />

      <button data-element="submit" type="submit">
        Subscribe
      </button>
      </p>
      <p>
      <small>Powered by TinyLetter</small>
      </p>
    </form>
  )
}
