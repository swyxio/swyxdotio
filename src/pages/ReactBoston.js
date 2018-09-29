import React from 'react'
import Link from 'gatsby-link'
import { A } from 'swyx-a'

// import { ReactTypeformEmbed } from 'react-typeform-embed';
// import * as typeformEmbed from '@typeform/embed'

function ReactBoston() {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: 0,
        paddingBottom: 'calc(56.25% + 40px)',
      }}
    >
      <h1>Babel ❤️ GraphQL</h1>
      <h5>a talk given at React Boston</h5>
      <p>solving the Double Declaration problem in clientside GraphQL</p>
      <p>
        Feedback:{' '}
        <button
          style={{
            backgroundColor: 'lightblue',
            borderRadius: 10,
            padding: 20,
          }}
          onClick={() =>
            window.open('https://shawnwang3.typeform.com/to/cC7sYD')
          }
        >
          <marquee>
            <h3>⚛️ GIVE FEEDBACK! ⚛️</h3>
          </marquee>
        </button>
      </p>
      <ul>
        <li>
          Github:
          <A href="https://github.com/sw-yx/babel-blade">babel-blade</A>
        </li>
        <li>
          Slides:
          <A href="https://babel-blade-talk.netlify.com/">Babel ❤️ GraphQL</A>
        </li>
      </ul>
    </div>
  )
}
export default ReactBoston
