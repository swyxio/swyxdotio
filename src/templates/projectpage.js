import React from "react";
// import Header from "../components/Header";
import Footer from "../components/Footer";
import Link from "gatsby-link";

const noPointer = { cursor: "default" };

export default ({ data }) => {
  const post = data.markdownRemark;
  // console.log("post.frontmatter", post.frontmatter);
  const stack = post.frontmatter.stack.split(" ");
  const CheckOut = (
    <ul className="actions icons">
      <li>
        {post.frontmatter.link && (
          <a href={post.frontmatter.link} target="_blank" className="button">
            Check it out
          </a>
        )}
      </li>
      <li>
        {post.frontmatter.github && (
          <a href={post.frontmatter.github} target="_blank">
            <div href="#" className="icon alt fa-github">
              <span className="label">GitHub</span>
            </div>
          </a>
        )}
      </li>
    </ul>
  );
  return (
    <div id="wrapper">
      <section id="banner" className="style2">
        <div className="inner">
          <span className="image">
            <img src="/images/pic07.jpg" alt="" />
          </span>
          <header className="major">
            <h1>{post.frontmatter.title}</h1>
          </header>
          <div className="content">
            <p>
              {post.frontmatter.blurb} | <i>{post.frontmatter.date}</i>
            </p>
          </div>
          {stack && (
            <ul className="actions">
              {stack.map(stackitem => (
                <li key={stackitem}>
                  <span className="button" style={noPointer}>
                    {stackitem}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
      <div id="main">
        <section id="two" className="spotlights">
          <section>
            <div className="image">
              <img
                src={post.frontmatter.landingscreenshot}
                alt=""
                data-position="center center"
              />
            </div>
            <div className="content">
              <div className="inner">
                <header className="major">
                  <h3>What is {post.frontmatter.title}?</h3>
                </header>
                <p>{post.frontmatter.blurb2}</p>
                {CheckOut}
              </div>
            </div>
          </section>
        </section>
        <section id="one">
          <div className="inner">
            <header className="major">
              <h2>Discussion</h2>
            </header>
            <div dangerouslySetInnerHTML={{ __html: post.html }} />
            {CheckOut}
            <hr />
            <Link to="/" className="button">
              Back to Home 🏠
            </Link>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
};

export const query = graphql`
  query BlogPostQuery($slug: String!) {
    markdownRemark(fields: { slug: { eq: $slug } }) {
      html
      frontmatter {
        title
        date(formatString: "MMMM, YYYY")
        blurb
        blurb2
        stack
        github
        link
        indexscreenshot
        landingscreenshot
      }
    }
  }
`;
