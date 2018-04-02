import React from 'react'
import Link from 'gatsby-link'

// const Header = () => (
//   <div
//     style={{
//       background: 'rebeccapurple',
//       marginBottom: '1.45rem',
//     }}
//   >
//     <div
//       style={{
//         margin: '0 auto',
//         maxWidth: 960,
//         padding: '1.45rem 1.0875rem',
//       }}
//     >
//       <h1 style={{ margin: 0 }}>
//         <Link
//           to="/"
//           style={{
//             color: 'white',
//             textDecoration: 'none',
//           }}
//         >
//           Gatsby
//         </Link>
//       </h1>
//     </div>
//   </div>
// )

import {
  Alignment,
  Button,
  Classes,
  Navbar,
  NavbarDivider,
  NavbarGroup,
  NavbarHeading,
  Switch,
} from '@blueprintjs/core'
const Header = () => (
  <Navbar>
    <NavbarGroup align={Alignment.RIGHT}>
      <NavbarHeading>shawn swyx wang</NavbarHeading>
      <NavbarDivider />
      <Link to="/">
        <Button className={Classes.MINIMAL} icon="home" text="Home" />
      </Link>
      <Link to="/page-2">
        <Button className={Classes.MINIMAL} icon="document" text="Files" />
      </Link>
    </NavbarGroup>
  </Navbar>
)

export default Header
