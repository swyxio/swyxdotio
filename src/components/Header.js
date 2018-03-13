import React from "react";
import Link from "gatsby-link";
import MyModal from "./Modal";

class Header extends React.Component {
  state = { isOpen: false };
  handleMenuClick = e => {
    this.setState({ isOpen: true });
  };
  handleCloseModal = () => this.setState({ isOpen: false });
  render() {
    // const { handleMenuClick } = this.props;
    return (
      <header id="header" className="alt">
        <Link to="/" className="logo">
          <span>
            shawn <strong>swyx</strong> wang
          </span>
        </Link>
        <Link to="/projects" className="logo">
          <span>Projects</span>
        </Link>
        <Link to="/principles" className="logo">
          <span>Principles</span>
        </Link>
        <Link to="/writing" className="logo">
          <span>Writing</span>
        </Link>
        <Link to="/resources" className="logo">
          <span>Resources</span>
        </Link>
        <nav>
          {/*<a href="#menu" onClick={this.handleMenuClick}>*/}
          <a onClick={this.handleMenuClick}>Menu</a>
        </nav>
        <MyModal isOpen={this.state.isOpen} handleCloseModal={this.handleCloseModal} />
      </header>
    );
  }
}

export default Header;
