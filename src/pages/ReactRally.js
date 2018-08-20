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
      <li>
        <A href="https://www.reddit.com/r/reactjs/comments/98lbpi/why_react_is_not_reactive_react_rally_2018/">
        Reddit
        </A>
      </li>
      <li>
        Twitter shoutouts!
        <ul>
          <li>
            <A href="https://twitter.com/JemYoung/status/1030896519115751424">
            Jem Young
            </A>
          </li>
          <li>
            <A href="https://twitter.com/kyleshevlin/status/1030134445838233600">
            Kyle Shevlin
            </A>
          </li>
          <li>
            <A href="https://twitter.com/amberleyjohanna/status/1030135278663426048">
            Amberley Johanna
            </A>
          </li>
          <li>
            <A href="https://twitter.com/mweststrate/status/1030140251640135680">
            Michel Weststrate
            </A>
          </li>
          <li>
            <A href="https://twitter.com/kentcdodds/status/1030132879827685376">
            Kent C. Dodds
            </A>
          </li>
          <li>
            <A href="https://twitter.com/MatthewGerstman/status/1030132442768658432">
            Matthew Gerstman
            </A>
          </li>
          <li>
            <A href="https://twitter.com/aweary/status/1030138785302896640">
            Brandon Dail
            </A>
          </li>
          <li>
            <A href="https://twitter.com/kurtiskemple/status/1030133624807378944">
            Kurt Kemple
            </A>
          </li>
        </ul>
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
