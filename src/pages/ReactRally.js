import React from 'react'
import Link from 'gatsby-link'
import { A } from 'swyx-a'

// import { ReactTypeformEmbed } from 'react-typeform-embed';
// import * as typeformEmbed from '@typeform/embed'

function ReactRally() {
  return (
  <div
    style={{
      position: 'relative',
      width: '100%',
      height: 0,
      paddingBottom: 'calc(56.25% + 40px)',
    }}
  >
  <h1>Why React is -not- Reactive</h1>
  <h5>a talk given at ReactNYC/React Rally</h5>
    <p>
    diving into React's push-pull data flow and the importance of the scheduler: 
    </p>
    <ul>
      <li>
           Github: <A href="https://github.com/sw-yx/reactive-react">
             reactive-react
           </A>
           </li>
    </ul>
    <p>
    Feedback: <button 
      style={{
        backgroundColor: 'lightblue',
        borderRadius: 10,
        padding: 20
      }}
      onClick={() => window.open("https://shawnwang3.typeform.com/to/cC7sYD")}
      ><marquee>
        <h3>⚛️ GIVE FEEDBACK! ⚛️</h3>
        </marquee>
    </button>
    </p> 
    <iframe src="//slides.com/swyx/why-react-is-not-reactive/embed" width="576" height="420" scrolling="no" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>
  </div>
)
}
export default ReactRally
