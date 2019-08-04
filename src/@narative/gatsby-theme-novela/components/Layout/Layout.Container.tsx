import React from 'react'
import styled from '@emotion/styled'

import Navigation from '../Navigation/Navigation.Header'

function LayoutContainer(props) {
  return (
    <Container>
      <Navigation />
      {props.children}
    </Container>
  )
}

export default LayoutContainer

const Container = styled.div`
  position: relative;
  background: ${(p: { theme?: { colors: { background: string } } }) => p.theme.colors.background};
  transition: background 0.25s var(--ease-in-out-quad);
  min-height: 100vh;
`
