import React from 'react'
import { graphql, useStaticQuery } from 'gatsby'
import Layout from 'gatsby-theme-dev-blog/src/components/Layout'
import Container from 'gatsby-theme-dev-blog/src/components/Container'
import { MDXRenderer } from 'gatsby-plugin-mdx'
export default function AboutPage() {
  const {
    site,
    allFile: { nodes },
  } = useStaticQuery(graphql`
    query MyQuery {
      site {
        ...site
        siteMetadata {
          author {
            minibio
          }
        }
      }
      allFile(filter: { sourceInstanceName: { eq: "aboutfiles" } }) {
        nodes {
          childMdx {
            id
            body
          }
          name
        }
      }
    }
  `)
  const {
    siteMetadata: { author },
  } = site
  console.log({ nodes })
  return (
    <Layout site={site} noFooter>
      <Container>
        <h1>About {author.name}</h1>
        <p
          dangerouslySetInnerHTML={{
            __html: author.minibio,
          }}
        />
        <hr />

        <MDXRenderer>{nodes.find((v) => v.name === 'intro').childMdx.body}</MDXRenderer>
        <MDXRenderer>{nodes.find((v) => v.name === 'opensource').childMdx.body}</MDXRenderer>
        <MDXRenderer>{nodes.find((v) => v.name === 'currentprojects').childMdx.body}</MDXRenderer>
      </Container>
    </Layout>
  )
}
