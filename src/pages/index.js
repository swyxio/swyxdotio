import React from 'react'
import Layout from '@narative/gatsby-theme-novela/src/components/Layout'
import Section from '@narative/gatsby-theme-novela/src/components/Section'
import SEO from '@narative/gatsby-theme-novela/src/components/SEO'
import Heading from '@narative/gatsby-theme-novela/src/components/Heading'
import Media from '@narative/gatsby-theme-novela/src/components/Media/Media.Img'

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
      <SEO pathname={'/'} />
      <Section relative id="MainPage">
        <HeadingContainer style={{ maxWidth: `${hero.maxWidth}px` }}>
          <Heading.h1>Hello there!</Heading.h1>
          <Heading.h2>This is the homepage of Shawn Wang on the web!</Heading.h2>
        </HeadingContainer>
        <SubheadingContainer>
          <BioContainer>
            <BioAvatar>
              <BioAvatarInner>
                <Media src={author.avatar.image.fluid} />
              </BioAvatarInner>
            </BioAvatar>
            <BioText>
              swyx is an Infinite Builder working on Developer Experience at Netlify. In his free time he helps people
              Learn in Public at Egghead.io and /r/reactjs.
            </BioText>
          </BioContainer>
        </SubheadingContainer>
      </Section>
    </Layout>
  )
}

const BioContainer = styled.div`
  display: flex;
  align-items: center;
  position: relative;
  left: -10px;
`

const BioAvatar = styled.div`
  position: relative;
  height: 40px;
  width: 40px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.25);
  margin-right: 16px;
  margin: 10px 26px 10px 10px;

  &::after {
    content: '';
    position: absolute;
    left: -5px;
    top: -5px;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    border: 1px solid rgba(0, 0, 0, 0.25);
  }
`

const BioAvatarInner = styled.div`
  height: 40px;
  width: 40px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.25);
  margin-right: 16px;
  overflow: hidden;
`

const BioText = styled.p`
  max-width: 430px;
  font-size: 14px;
  line-height: 1.45;
  color: ${(p) => p.theme.colors.grey};
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
