import React from 'react'
import Layout from '@narative/gatsby-theme-novela/src/components/Layout'
// import Section from '@narative/gatsby-theme-novela/src/components/Section'
import SEO from '@narative/gatsby-theme-novela/src/components/SEO'
import Heading from '@narative/gatsby-theme-novela/src/components/Heading'
import Media from '@narative/gatsby-theme-novela/src/components/Media/Media.Img'
import { RichText } from '@narative/gatsby-theme-novela/src/components/Media'
import { MDXRenderer } from 'gatsby-plugin-mdx'
import { useColorMode } from 'theme-ui'

import './index.css'
import mediaqueries from '@narative/gatsby-theme-novela/src/styles/media'
import styled from '@emotion/styled'
import { graphql, Link } from 'gatsby'

export const query = graphql`
  query {
    pageData: allFile(filter: { sourceInstanceName: { eq: "homePage" } }) {
      edges {
        node {
          id
          childMdx {
            body
          }
          absolutePath
          name
        }
      }
    }
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
  const [colorMode] = useColorMode()
  const author = props.data.author.edges[0].node
  const pageData = props.data.pageData.edges.map(({ node }) => node)
  // const Currentprojects = pageData.find((v) => v.childMdx.body === 'currentprojects')
  // const Intro =
  // const OpenSource = pageData.find((v) => v.childMdx.body === 'opensource')
  console.log({ colorMode })
  return (
    // <Layout>
    <div style={{ backgroundColor: colorMode === 'dark' ? '#113' : 'papayawhip' }}>
      <SEO pathname={'/'} />
      <Section relative id="MainPage">
        {/* <HeadingContainer style={{ maxWidth: `${hero.maxWidth}px` }}> */}
        {/* <HeadingContainer> */}
        {/* <Heading.h2>This is the homepage of Shawn Wang on the web!</Heading.h2> */}
        {/* </HeadingContainer> */}
        <SubheadingContainer>
          <BioContainer>
            {/* <BioAvatar> */}
            <BioAvatarInner>
              <Media src={author.avatar.image.fluid} />
            </BioAvatarInner>
            <Heading.h1>swyx</Heading.h1>

            <ul style={{ color: colorMode !== 'dark' ? '#116' : 'papayawhip' }}>
              <li
                style={{
                  display: 'block',
                  margin: 3,
                  zoom: 1,
                }}
              >
                Navigate to:
              </li>
              <li
                style={{
                  display: 'inline-block',
                  margin: 3,
                  zoom: 1,
                  fontWeight: 'bold',
                }}
              >
                <Link style={{ color: colorMode !== 'dark' ? '#116' : 'papayawhip' }} to="/writing">
                  Writing
                </Link>
              </li>
              <li
                style={{
                  display: 'inline-block',
                  margin: 3,
                  zoom: 1,
                  fontWeight: 'bold',
                }}
              >
                <Link style={{ color: colorMode !== 'dark' ? '#116' : 'papayawhip' }} to="/talks">
                  Talks
                </Link>
              </li>
            </ul>
            {/* </BioAvatar> */}
            {/* <BioText>
              swyx is an Infinite Builder working on Developer Experience at Netlify. In his free time he helps people
              Learn in Public at Egghead.io and /r/reactjs.
            </BioText> */}
          </BioContainer>
        </SubheadingContainer>
        <RichText content={pageData.find((v) => v.name === 'intro').childMdx.body} />
        <RichText content={pageData.find((v) => v.name === 'opensource').childMdx.body} />
        <RichText content={pageData.find((v) => v.name === 'currentprojects').childMdx.body} />
      </Section>
    </div>
  )
}

const BioContainer = styled.div`
  display: flex;
  align-items: center;
  position: relative;
  left: -10px;
`

// const BioAvatar = styled.div`
//   position: relative;
//   height: 40px;
//   width: 40px;
//   border-radius: 50%;
//   background: rgba(0, 0, 0, 1);
//   margin-right: 16px;
//   margin: 10px 26px 10px 10px;

//   &::after {
//     content: '';
//     position: absolute;
//     left: -5px;
//     top: -5px;
//     width: 50px;
//     height: 50px;
//     border-radius: 50%;
//     border: 1px solid rgba(0, 0, 0, 1);
//   }
// `

const BioAvatarInner = styled.div`
  height: 40px;
  width: 40px;
  border: 3px solid black;
  border-radius: 50%;
  background: rgba(0, 0, 0, 1);
  margin-right: 16px;
  overflow: hidden;
`

const BioText = styled.p`
  max-width: 430px;
  font-size: 14px;
  line-height: 1.45;
  /* color: ${(p) => p.theme.colors.grey}; */
  color: black;
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
  /* margin-bottom: 100px;

  ${mediaqueries.desktop`
    margin-bottom: 80px;
  `};

  ${mediaqueries.tablet`
    margin-bottom: 60px;
  `}; */

  /* ${mediaqueries.phablet`
    display: none;
  `}; */
`

const Section = styled.section`
  width: 90%;
  max-width: 1220px;
  margin: 0 auto;
  /* padding: 0 0rem; */

  ${mediaqueries.desktop`
    max-width: 850px;
  `};
`

// ${p =>
//   p.narrow
//     ? mediaqueries.tablet`
//         padding: 0 2rem;
//         max-width: 527px;
//       `
//     : mediaqueries.tablet`
//         padding: 0 4rem;
//         max-width: 567px;
//       `}

// ${mediaqueries.phablet`
//   max-width: 100%;
// `};
