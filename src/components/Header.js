import React from "react";
import Link from "gatsby-link";

// const Header = () => (
//   <div
//     style={{
//       background: "rebeccapurple",
//       marginBottom: "1.45rem"
//     }}
//   >
//     <div
//       style={{
//         margin: "0 auto",
//         maxWidth: 960,
//         padding: "1.45rem 1.0875rem"
//       }}
//     >
//       <h1 style={{ margin: 0 }}>
//         <Link
//           to="/"
//           style={{
//             color: "white",
//             textDecoration: "none"
//           }}
//         >
//           Gatsby
//         </Link>
//       </h1>
//     </div>
//   </div>
// );
const Header = () => (
  <header id="header" className="alt">
    <Link to="/" className="logo">
      <span>
        shawn <strong>swyx</strong> wang
      </span>
    </Link>
    <nav>
      <a href="#menu">Menu</a>
    </nav>
  </header>
);

export default Header;
