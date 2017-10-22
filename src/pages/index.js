import React from "react";
import Link from "gatsby-link";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default ({ data }) => {
  return (
    <div id="wrapper">
      <Header />

      <section id="banner" className="major">
        <div className="inner">
          <header className="major">
            <h1>swyx || home</h1>
          </header>
          <div className="content">
            <p>
              Indie hacker with a CFA / <br />
              this is my porfolio
            </p>
            <ul className="actions">
              <li>
                <a href="#one" className="button next scrolly">
                  Get Started
                </a>
              </li>
            </ul>
          </div>
        </div>
      </section>
      <div id="main">
        <section id="one" className="tiles">
          {data.allMarkdownRemark.edges.map(
            ({ node }) =>
              console.log("node.frontmatter", node.frontmatter) || (
                <article
                  style={{
                    backgroundImage: `url('${node.frontmatter
                      .indexscreenshot}')`
                  }}
                  key={node.fields.slug}
                >
                  <span className="image">
                    <img src={node.frontmatter.indexscreenshot} alt="" />
                  </span>
                  <header className="major">
                    <h3>
                      <Link to={node.fields.slug} className="link">
                        {node.frontmatter.title}
                      </Link>
                    </h3>
                    <p>{node.frontmatter.blurb}</p>
                  </header>
                </article>
              )
          )}
        </section>

        <section id="two">
          <div className="inner">
            <header className="major">
              <h2>Lorem Ipsum</h2>
            </header>
            <p>This will be filled up later on</p>
            <ul className="actions">
              <li>
                <a href="landing.html" className="button next">
                  Get Started
                </a>
              </li>
            </ul>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
};
export const query = graphql`
  query IndexQuery {
    allMarkdownRemark(sort: { fields: [frontmatter___date], order: DESC }) {
      totalCount
      edges {
        node {
          frontmatter {
            title
            date(formatString: "DD MMMM, YYYY")
            indexscreenshot
            blurb
          }
          fields {
            slug
          }
          excerpt
        }
      }
    }
  }
`;
