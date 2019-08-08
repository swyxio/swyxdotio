import React from 'react'
import styled from '@emotion/styled'
import { css } from '@emotion/core'
import { GridItem } from './sharedComponents'
// import { Link } from 'gatsby'
// import Media from '@narative/gatsby-theme-novela/src/components/Media/Media.Img'
import mediaqueries from '@narative/gatsby-theme-novela/src/styles/media'
import Section from '@narative/gatsby-theme-novela/src/components/Section'
import SEO from '@narative/gatsby-theme-novela/src/components/SEO'
import Layout from '@narative/gatsby-theme-novela/src/components/Layout'
// import Paginator from '@narative/gatsby-theme-novela/src/components/Navigation/Navigation.Paginator'
import Heading from '@narative/gatsby-theme-novela/src/components/Heading'

// import ArticlesHero from '@narative/gatsby-theme-novela/src/sections/articles/Articles.Hero'
import ArticlesGridLayoutProvider from '@narative/gatsby-theme-novela/src/sections/articles/Articles.Grid.Context'
// import ArticlesGrid from '@narative/gatsby-theme-novela/src/sections/articles/Articles.Grid'

function TalkList(props) {
  const { location, pageContext } = props
  const talks = pageContext.talks.map((x) => ({ node: x }))

  return (
    <ArticlesGridLayoutProvider articles={talks}>
      <Layout>
        <SEO pathname={location.pathname} />
        {/* <ArticlesHero /> */}
        <Section narrow>
          <HeadingContainer style={{ maxWidth: `960px` }}>
            <Heading.h1>swyx talks</Heading.h1>
            <Heading.h3>Speaking at conferences and podcasts</Heading.h3>
          </HeadingContainer>
          {/* <SubheadingContainer>
            <p>Speaking at conferences and podcasts</p>
          </SubheadingContainer> */}
          <ArticlesGridTiles talks={talks} />
          {/* <Paginator {...pageContext} /> */}
        </Section>
        {/* <ArticlesGradient /> */}
      </Layout>
    </ArticlesGridLayoutProvider>
  )
}

export default TalkList

/**
 *
 * just display stuff below
 *
 */

function ArticlesGridTiles({ talks }) {
  if (!talks) return null
  let bisectTalks = []
  let pair = null
  talks.forEach((t) => {
    if (pair) {
      bisectTalks.push([pair, t])
      pair = null
    } else {
      pair = t
    }
  })
  return bisectTalks.map((talkPair) => (
    <Grid>
      <GridItem talk={talkPair[0]} />
      <GridItem talk={talkPair[1]} narrow />
    </Grid>
  ))
}

// const ArticlesGradient = styled.div`
//   position: absolute;
//   bottom: 0;
//   left: 0;
//   width: 100%;
//   height: 590px;
//   z-index: 0;
//   pointer-events: none;
//   background: ${(p) => p.theme.colors.gradient};
//   transition: background 0.3s var(--ease-in-out-quad);
// `

const HeadingContainer = styled.div`
  margin: 100px 0;

  ${mediaqueries.desktop`
    width: 80%;
  `}

  ${mediaqueries.tablet`
    width: 100%;
  `}
`

// const SubheadingContainer = styled.div`
//   display: flex;
//   align-items: center;
//   justify-content: space-between;
//   margin-bottom: 100px;

//   ${mediaqueries.desktop`
//     margin-bottom: 80px;
//   `};

//   ${mediaqueries.tablet`
//     margin-bottom: 60px;
//   `};

//   ${mediaqueries.phablet`
//     display: none;
//   `};
// `

const wide = '1fr'
const narrow = '457px'
// const limitToTwoLines = css`
//   text-overflow: ellipsis;
//   overflow-wrap: normal;
//   -webkit-line-clamp: 2;
//   -webkit-box-orient: vertical;
//   display: -webkit-box;
//   white-space: normal;
//   overflow: hidden;

//   ${mediaqueries.phablet`
//     -webkit-line-clamp: 3;
//   `}
// `

const Grid = styled.div`
  position: relative;
  display: grid;
  grid-template-columns: ${(p) => (p.reverse ? `${narrow} ${wide}` : `${wide} ${narrow}`)};
  grid-template-rows: 2;
  column-gap: 30px;
  margin-bottom: 80px;

  ${mediaqueries.desktop_medium`
    grid-template-columns: 1fr 1fr;
  `}

  ${mediaqueries.tablet`
    grid-template-columns: 1fr;
    margin-bottom: 0;
  `}
`
