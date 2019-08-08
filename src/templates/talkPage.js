import React, { useRef, useState, useEffect } from 'react'
import styled from '@emotion/styled'
import throttle from 'lodash/throttle'
import { graphql, useStaticQuery } from 'gatsby'
import { GridItem, MetaData, Excerpt } from './sharedComponents'

import Layout from '@narative/gatsby-theme-novela/src/components/Layout'
import { RichText } from '@narative/gatsby-theme-novela/src/components/Media'
import Progress from '@narative/gatsby-theme-novela/src/components/Progress'
import Section from '@narative/gatsby-theme-novela/src/components/Section'

import mediaqueries from '@narative/gatsby-theme-novela/src/styles/media'
import { debounce } from '@narative/gatsby-theme-novela/src/utils'
import Heading from '@narative/gatsby-theme-novela/src/components/Heading'

import ArticleAside from '@narative/gatsby-theme-novela/src/sections/article/Article.Aside'
import ArticleHero from '@narative/gatsby-theme-novela/src/sections/article/Article.Hero'
import ArticleControls from '@narative/gatsby-theme-novela/src/sections/article/Article.Controls'
// import ArticlesNext from '@narative/gatsby-theme-novela/src/sections/article/Article.Next'
import ArticleSEO from '@narative/gatsby-theme-novela/src/sections/article/Article.SEO'
import ArticleShare from '@narative/gatsby-theme-novela/src/sections/article/Article.Share'

const siteQuery = graphql`
  {
    allSite {
      edges {
        node {
          siteMetadata {
            name
          }
        }
      }
    }
  }
`

function Article({ pageContext, location }) {
  const contentSectionRef = useRef()

  const [hasCalculated, setHasCalculated] = useState(false)
  const [contentHeight, setContentHeight] = useState(0)

  const results = useStaticQuery(siteQuery)
  const name = results.allSite.edges[0].node.siteMetadata.name

  const { talk, next } = pageContext
  const author = { potato: 'potato' }
  // console.log({ talk, next })

  useEffect(() => {
    const calculateBodySize = throttle(() => {
      const contentSection = contentSectionRef.current

      if (!contentSection) return

      /**
       * If we haven't checked the content's height before,
       * we want to add listeners to the content area's
       * imagery to recheck when it's loaded
       */
      if (!hasCalculated) {
        const debouncedCalculation = debounce(calculateBodySize)
        const $imgs = contentSection.querySelectorAll('img')

        $imgs.forEach(($img) => {
          // If the image hasn't finished loading then add a listener
          if (!$img.complete) $img.onload = debouncedCalculation
        })

        // Prevent rerun of the listener attachment
        setHasCalculated(true)
      }

      // Set the height and offset of the content area
      setContentHeight(contentSection.getBoundingClientRect().height)
    }, 20)

    calculateBodySize()

    window.addEventListener('resize', calculateBodySize)
    return () => window.removeEventListener('resize', calculateBodySize)
  }, [])

  const { slug, body, video, url, date, title, desc, description, excerpt, venues, topic, ...filteredTalk } = talk
  return (
    <Layout>
      <ArticleSEO article={talk} author={author} location={location} />
      {/* <ArticleHero article={talk} author={author} /> */}
      <ArticleAside contentHeight={contentHeight}>
        <Progress contentHeight={contentHeight} />
      </ArticleAside>
      <MobileControls>
        <ArticleControls />
      </MobileControls>
      <Section narrow>
        <HeadingContainer style={{ maxWidth: `960px` }}>
          <Heading.h1>{talk.title}</Heading.h1>
          <Heading.h3>{talk.excerpt}</Heading.h3>
          <MetaData>
            <h3 style={{ display: 'inline', padding: 3, backgroundColor: 'rgba(100, 100, 200, 0.1)' }}>
              Topic: {talk.topic}
            </h3>{' '}
            · {talk.date || '🤷🏼‍'} · {talk.venues || 'somewhere on Earth'}
          </MetaData>
          <Excerpt>{talk.excerpt && <span>{talk.excerpt}</span>}</Excerpt>
        </HeadingContainer>
        <SubheadingContainer>
          <p>
            {talk.video && (
              <span>
                Video: <a href={talk.video}>{talk.video}</a>
              </span>
            )}
            {talk.url && (
              <span>
                URL: <a href={talk.url}>{talk.url}</a>
              </span>
            )}
            {talk.description && <p>Description: {talk.description}</p>}
          </p>
        </SubheadingContainer>
        {Object.keys(filteredTalk).length > 0 && (
          <pre style={{ backgroundColor: 'rgba(0,0,0,0.1)', margin: 10, overflow: 'scroll' }}>
            {JSON.stringify(filteredTalk, null, 2)}
          </pre>
        )}
        {/* <Paginator {...pageContext} /> */}
      </Section>
      <ArticleBody hasHero={!!talk.hero} ref={contentSectionRef}>
        <RichText content={talk.body}>
          <ArticleShare author={author} />
        </RichText>
      </ArticleBody>
      {next.length > 0 && (
        <NextArticle narrow>
          {/* <FooterNext>More articles from {name}</FooterNext> */}
          <FooterNext>Want more?!</FooterNext>
          <ArticlesNext talks={next} />
          <FooterSpacer />
        </NextArticle>
      )}
    </Layout>
  )
}

function ArticlesNext({ talks }) {
  if (!talks) return null
  return (
    <Grid>
      <GridItem talk={talks[0]} />
      <GridItem talk={talks[1]} narrow />
    </Grid>
  )
}

export default Article

/**
 *
 *
 *
 * utils
 */

const SubheadingContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 100px;

  ${mediaqueries.desktop`
    margin-bottom: 80px;
  `};

  ${mediaqueries.tablet`
    margin-bottom: 60px;
  `};

  ${mediaqueries.phablet`
    display: none;
  `};
`
const MobileControls = styled.div`
  position: relative;
  padding-top: 60px;
  transition: background 0.2s linear;
  text-align: center;

  ${mediaqueries.tablet_up`
    display: none;
  `}
`

const ArticleBody = styled.article`
  position: relative;
  padding: ${(p) => (p.hasHero ? '160px' : '0px')} 0 35px;
  padding-left: 68px;
  transition: background 0.2s linear;

  ${mediaqueries.tablet`
    padding: 70px 0 80px;
  `}

  ${mediaqueries.phablet`
    padding: 60px 0;
  `}
`

const NextArticle = styled(Section)`
  display: block;
`

const FooterNext = styled.h3`
  position: relative;
  opacity: 0.25;
  margin-bottom: 100px;
  font-weight: 400;
  color: #000;

  ${mediaqueries.tablet`
    margin-bottom: 60px;
  `}

  &::after {
    content: '';
    position: absolute;
    background: #000;
    width: ${(910 / 1140) * 100}%;
    height: 1px;
    right: 0;
    top: 11px;

    ${mediaqueries.tablet`
      width: ${(600 / 1140) * 100}%;
    `}

    ${mediaqueries.phablet`
      width: ${(400 / 1140) * 100}%;
    `}

    ${mediaqueries.phone`
      width: 90px
    `}
  }
`

const FooterSpacer = styled.div`
  margin-bottom: 65px;
`

const wide = '1fr'
const narrow = '457px'
const Grid = styled.div`
  position: relative;
  display: grid;
  ${(p) => {
    if (p.numberOfArticles === 1) {
      return `
      grid-template-columns: 1fr;
      grid-template-rows: 1
    `
    } else {
      return `
      grid-template-columns: ${wide} ${narrow};
      grid-template-rows: 2;
      `
    }
  }}
  column-gap: 30px;
  margin: 0 auto;
  max-width: ${(p) => (p.numberOfArticles === 1 ? '680px' : '100%')};

  ${mediaqueries.desktop`
    grid-template-columns: 1fr 1fr;
  `}

  ${mediaqueries.tablet`
    grid-template-columns: 1fr;
  `}
`
const HeadingContainer = styled.div`
  margin: 100px 0;

  ${mediaqueries.desktop`
    width: 80%;
  `}

  ${mediaqueries.tablet`
    width: 100%;
  `}
`
