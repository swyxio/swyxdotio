import React from 'react'
import Container from 'gatsby-theme-dev-blog/src/components/Container'
import { useTheme } from 'gatsby-theme-dev-blog/src/components/Theming'
import { css } from '@emotion/core'
import { rhythm } from 'gatsby-theme-dev-blog/src/lib/typography'
import swyx from './swyx.jpg'
export const Hero = () => {
  const theme = useTheme()
  return (
    <section
      css={css`
        color: ${theme.colors.white};
        width: 100%;
        background: ${theme.colors.primary};
        /* padding: 20px 0 30px 0; */
        display: flex;
      `}
    >
      <Container
        css={css`
          display: flex;
          /* flex-direction: column; */
          /* justify-content: space-between; */
          align-items: center;
        `}
      >
        <img
          src={swyx}
          css={css`
            border-radius: 50%;
            padding-right: 1rem;
          `}
        />
        <h1
          css={css`
            color: ${theme.colors.white};
            position: relative;
            z-index: 5;
            line-height: 1.5;
            margin: 0;
            max-width: ${rhythm(30)};
          `}
        >
          shawn / @swyx / site
        </h1>
      </Container>
      <div
        css={css`
          height: 150px;
          overflow: hidden;
        `}
      />
    </section>
  )
}
