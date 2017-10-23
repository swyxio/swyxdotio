import React from "react";
import PropTypes from "prop-types";
import Link from "gatsby-link";
import Helmet from "react-helmet";
import Header from "../components/Header";
import "./index.css";

// const TemplateWrapper = ({ children }) => (
class TemplateWrapper extends React.Component {
  state = { menu: false };
  handleMenuClick() {
    this.setState({ menu: !this.state.menu });
  }
  render() {
    const { children } = this.props;
    return (
      <div className={this.state.menu && "is-menu-visible"}>
        <Helmet
          title="@swyx || personal site"
          meta={[
            {
              name: "description",
              content: "this is the personal portfolio site for @swyx"
            },
            { name: "keywords", content: "personal site, portfolio, swyx" }
          ]}
        >
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1, user-scalable=no"
          />
          <link rel="stylesheet" href="/assets/css/main.css" />
        </Helmet>
        <Header handleMenuClick={this.handleMenuClick.bind(this)} />
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
      </div>
    );
  }
}

TemplateWrapper.propTypes = {
  children: PropTypes.func
};

export default TemplateWrapper;

// import jQuery from "jquery";
// import scrollX from "../js/jquery.scrollex.min";
// import scrollY from "../js/jquery.scrolly.min";
// import mainjs from "../js/main";
// import skel from "../js/skel.min";
// import utiljs from "../js/util";
// componentDiDMount() {
//   mainjs(jQuery);
//   scrollX(jQuery);
//   scrollY(jQuery);
//   skell(jQuery);
//   utiljs(jQuery);
// }
