import React from 'react'
import Link from 'gatsby-link'
// import { Button, Intent, Spinner } from '@blueprintjs/core'

const Alink = props => (
  <a href={props.href} target="_blank">
    {props.children}
  </a>
)

// using JSX:
// const mySpinner = <Spinner intent={Intent.PRIMARY} />
const IndexPage = () => (
  <div>
    <h1>Hello</h1>
    <p>this is the homepage of Shawn Wang</p>
    <p>I hope you are having a nice day.</p>
    <p>
      You can find me on <Alink href="https://twitter.com/swyx">Twitter</Alink>{' '}
      and <Alink href="https://github.com/sw-yx">Github</Alink>.
    </p>
    <p>Now go build something great.</p>
    <Link to="/page-2/">Go to page 2</Link>
  </div>
)

export default IndexPage
