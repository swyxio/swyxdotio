import React from 'react'
import Link from 'gatsby-link'
import { A } from 'swyx-a'

const Talks = () => (
  <div
    style={{
      position: 'relative',
      width: '100%',
      height: 0,
      paddingBottom: 'calc(56.25% + 40px)',
    }}
  >
    <h1>Creating Create-React-App</h1>
    <h5>a talk given at ReactNYC</h5>
    <p>
      diving into the history of CRA, how CRA works, and my experience making{' '}
      <A href="https://github.com/sw-yx/create-react-app-parcel">
        create-react-app-parcel
      </A>
    </p>
    <iframe
      allowfullscreen
      style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        border: 'solid 1px #333',
      }}
      src="https://www.beautiful.ai/player/-LD4eaMxlqSlCy6biPmZ/Creating-Create-React-App"
    />
  </div>
)
export default Talks
