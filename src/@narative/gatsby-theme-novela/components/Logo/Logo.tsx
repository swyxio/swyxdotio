import React from 'react'
import styled from '@emotion/styled'

import mediaqueries from '@narative/gatsby-theme-novela/src/styles/media'

import svg from './letter-s-between-straight-parenthesis-symbol.svg'
const Logo = ({ fill = '#fff' }: { fill?: string }) => {
  const _fill = fill === '#000' ? null : fill
  return (
    <LogoContainer>
      <img src={svg} style={{ height: 23, width: 23, padding: 2, backgroundColor: _fill }} />
    </LogoContainer>
  )
}

export default Logo

const LogoContainer = styled.div`
  .Logo__Mobile {
    display: none;
  }

  ${mediaqueries.tablet`
    .Logo__Desktop {
      display: none;
    }
    
    .Logo__Mobile{
      display: block;
    }
  `}
`
