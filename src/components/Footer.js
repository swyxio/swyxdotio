import React from "react";
// import Link from "gatsby-link";

const Footer = () => (
  <footer id="footer">
    <div className="inner">
      <ul className="icons">
        <li>
          <a href="mailto:swyx-at-swyx-dot-io" className="icon alt fa-envelope">
            <span className="label">Email</span>
          </a>
        </li>
        <li>
          <a
            href="http://twitter.com/swyx"
            target="_blank"
            className="icon alt fa-twitter"
          >
            <span className="label">Twitter</span>
          </a>
        </li>
        <li>
          <a
            href="https://github.com/sw-yx/"
            target="_blank"
            className="icon alt fa-github"
          >
            <span className="label">GitHub</span>
          </a>
        </li>
        <li>
          <a
            href="https://www.linkedin.com/in/shawnswyxwang/"
            target="_blank"
            className="icon alt fa-linkedin"
          >
            <span className="label">LinkedIn</span>
          </a>
        </li>
      </ul>
      <ul className="copyright">
        <li>&copy; swyx</li>
        <li>
          <a href="http://twitter.com/swyx" target="_blank">
            Best contacted on Twitter
          </a>
        </li>
        <li>
          Design:{" "}
          <a href="https://html5up.net" target="_blank">
            HTML5 UP
          </a>
        </li>
      </ul>
    </div>
  </footer>
);

export default Footer;
