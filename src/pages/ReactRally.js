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
        Youtube: 
        <A href="https://www.youtube.com/watch?v=SaO-7Lk5hZ8">
          React Rally 2018
        </A>
      </li>
      <li>
        Github: 
        <A href="https://github.com/sw-yx/reactive-react">
          reactive-react
        </A>
      </li>
      <li>
        Slides: 
        <A href="https://slides.com/swyx/why-react-is-not-reactive#/">
          Why React is *not* Reactive
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
    <iframe width="560" height="315" src="https://www.youtube.com/embed/SaO-7Lk5hZ8" frameborder="0" allow="autoplay; encrypted-media" webkitallowfullscreen mozallowfullscreen  allowfullscreen></iframe>
  </div>
)
}
export default ReactRally
