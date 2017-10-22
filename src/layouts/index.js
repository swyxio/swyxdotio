import React from "react";
import PropTypes from "prop-types";
import Link from "gatsby-link";
import Helmet from "react-helmet";
import Header from "../components/Header";
import jQuery from "jquery";
import scrollX from "../js/jquery.scrollex.min";
import scrollY from "../js/jquery.scrolly.min";
import mainjs from "../js/main";
import skel from "../js/skel.min";
import utiljs from "../js/util";
import "./index.css";

// const TemplateWrapper = ({ children }) => (
class TemplateWrapper extends React.Component {
  componentDiDMount() {
    mainjs(jQuery);
    scrollX(jQuery);
    scrollY(jQuery);
    skell(jQuery);
    utiljs(jQuery);
  }
  render() {
    const { children } = this.props;
    return (
      <div>
        <Helmet
          title="Gatsby Default Starter"
          meta={[
            { name: "description", content: "Sample" },
            { name: "keywords", content: "sample, something" }
          ]}
        >
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1, user-scalable=no"
          />
          <link rel="stylesheet" href="/assets/css/main.css" />
        </Helmet>
        <Header />
        <div
          style={{
            // margin: "0 auto",
            // maxWidth: 960,
            // padding: "0px 1.0875rem 1.45rem",
            // paddingTop: 0
          }}
        >
          {children()}
        </div>

        <script src="assets/js/jquery.min.js" />
        <script src="assets/js/jquery.scrolly.min.js" />
        <script src="assets/js/jquery.scrollex.min.js" />
        <script src="assets/js/skel.min.js" />
        <script src="assets/js/util.js" />
        <script src="assets/js/main.js" />
        <nav id="menu">
          <ul className="links">
            <li>
              <a href="index.html">Hose</a>
            </li>
            <li>
              <a href="landing.html">Landing</a>
            </li>
            <li>
              <a href="generic.html">Generic</a>
            </li>
            <li>
              <a href="elements.html">Elements</a>
            </li>
          </ul>
          <ul className="actions vertical">
            <li>
              <a href="#" className="button special fit">
                Get Started
              </a>
            </li>
            <li>
              <a href="#" className="button fit">
                Log In
              </a>
            </li>
          </ul>
        </nav>
      </div>
    );
  }
}

TemplateWrapper.propTypes = {
  children: PropTypes.func
};

export default TemplateWrapper;
