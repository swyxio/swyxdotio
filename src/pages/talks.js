import React from 'react'
import Layout from '@narative/gatsby-theme-novela/src/components/Layout'
import Section from '@narative/gatsby-theme-novela/src/components/Section'
import SEO from '@narative/gatsby-theme-novela/src/components/SEO'
import Heading from '@narative/gatsby-theme-novela/src/components/Heading'
// import Media from '@narative/gatsby-theme-novela/src/components/Media/Media.Img'

import mediaqueries from '@narative/gatsby-theme-novela/src/styles/media'
import styled from '@emotion/styled'
import { graphql } from 'gatsby'

export const query = graphql`
  query {
    author: allAuthorsYaml(filter: { featured: { eq: true } }) {
      edges {
        node {
          bio
          id
          name
          avatar {
            image: childImageSharp {
              fluid(maxWidth: 100, quality: 100) {
                ...GatsbyImageSharpFluid_withWebp
              }
            }
          }
        }
      }
    }
    site {
      siteMetadata {
        hero {
          heading
          maxWidth
        }
      }
    }
  }
`
export default function Home(props) {
  const {
    data: {
      site: {
        siteMetadata: { hero },
      },
      author: { edges },
    },
  } = props
  const author = edges[0].node
  return (
    <Layout>
      <SEO pathname={'/talks'} />
      <Section relative id="TalksPage">
        <HeadingContainer style={{ maxWidth: `${hero.maxWidth}px` }}>
          <Heading.h1>swyx talks</Heading.h1>
          <Heading.h2>Speaking at conferences and podcasts</Heading.h2>
        </HeadingContainer>
        <SubheadingContainer>
          <p>coming soon....</p>
        </SubheadingContainer>
      </Section>
    </Layout>
  )
}

const HeadingContainer = styled.div`
  margin: 100px 0;

  ${mediaqueries.desktop`
    width: 80%;
  `}

  ${mediaqueries.tablet`
    width: 100%;
  `}
`

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
