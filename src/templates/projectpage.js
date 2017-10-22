import React from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default ({ data }) => {
  const post = data.markdownRemark;
  console.log("post.frontmatter", post.frontmatter);
  return (
    <div id="wrapper">
      <Header />
      <section id="banner" className="style2">
        <div className="inner">
          <span className="image">
            <img src="/images/pic07.jpg" alt="" />
          </span>
          <header className="major">
            <h1>{post.frontmatter.title}</h1>
          </header>
          <div className="content">
            <p>{post.frontmatter.blurb}</p>
          </div>
        </div>
      </section>
      <div id="main">
        <section id="two" className="spotlights">
          <section>
            <a href="generic.html" className="image">
              <img
                src={post.frontmatter.indexscreenshot}
                alt=""
                data-position="center center"
              />
            </a>
            <div className="content">
              <div className="inner">
                <header className="major">
                  <h3>Description</h3>
                </header>
                <p>
                  Even though large tracts of Europe and many old and famous
                  States have fallen or may fall into the grip of the Gestapo
                  and all the odious apparatus of Nazi rule, we shall not flag
                  or fail. We shall go on to the end. We shall fight in France,
                  we shall fight on the seas and oceans, we shall fight with
                  growing confidence and growing strength in the air, we shall
                  defend our island, whatever the cost may be.{" "}
                </p>
                <ul className="actions">
                  <li>
                    <a
                      href={post.frontmatter.link}
                      target="_blank"
                      className="button"
                    >
                      Check it out
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </section>
        </section>
        <section id="one">
          <div className="inner">
            <header className="major">
              <h2>Description</h2>
            </header>
            <div dangerouslySetInnerHTML={{ __html: post.html }} />
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
