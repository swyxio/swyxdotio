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
    <iframe width="560" height="315" src="https://www.youtube.com/embed/nyFHR0dDZo0" frameborder="0" allow="autoplay; encrypted-media" webkitallowfullscreen mozallowfullscreen  allowfullscreen></iframe>
    <ul>
      <li>
        Youtube: 
        <A href="https://www.youtube.com/watch?v=nyFHR0dDZo0">
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
        <ul>
          <li>"Hey! Just wanted to say as a dev who's aspiring to continuously improve that your talk was amazing."</li>
          <li>"enjoyed your talk! I've been really reading into message queue usage in microservices and so its nice to see it explained in front-end context on while that model makes sense. thanks!"</li>
          <li>"Loved your talk Shawn." - /u/stolinski 😍</li>
        </ul>
      </li>
      <li>
        Private
        <ul>
          <li>i thought it was awesome! thanks for representing!</li>
          <li>hey! awesome talk and nice to see a fellow FSA repping!</li>
        </ul>
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
  </div>
)
}
export default ReactRally
