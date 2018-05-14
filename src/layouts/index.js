import React from 'react'
import PropTypes from 'prop-types'
import Helmet from 'react-helmet'

import Header from '../components/Header'
import './index.css'

const TemplateWrapper = ({ children }) => (
  <div>
    <link href="https://unpkg.com/normalize.css@^7.0.0" rel="stylesheet" />
    <link
      href="https://unpkg.com/@blueprintjs/core@^2.0.0/lib/css/blueprint.css"
      rel="stylesheet"
    />
    <link
      href="https://unpkg.com/@blueprintjs/icons@^2.0.0/lib/css/blueprint-icons.css"
      rel="stylesheet"
    />
    <Helmet
      title="swyx.io home"
      meta={[
        { name: 'description', content: 'home page for shawn swyx wang' },
        { name: 'keywords', content: 'swyx, shawn swyx wang' },
      ]}
    />
    <Header />
    <div
      style={{
        margin: '0 auto',
        maxWidth: 960,
        padding: '0px 1.0875rem 1.45rem',
        paddingTop: 0,
      }}
    >
      {children()}
    </div>
  </div>
)

TemplateWrapper.propTypes = {
  children: PropTypes.func,
}

export default TemplateWrapper
