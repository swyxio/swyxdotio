import React from "react";
import Link from "gatsby-link";
import ReactModal from "react-modal";

class Modal extends React.Component {
  state = { isOpen: this.props.isOpen };
  componentWillReceiveProps(nextprops) {
    this.setState({ isOpen: nextprops.isOpen });
  }
  render() {
    return (
      <ReactModal
        isOpen={this.state.isOpen}
        // onAfterOpen={handleAfterOpenFunc}
        // onRequestClose={handleRequestCloseFunc}
        onRequestClose={this.props.handleCloseModal} // https://github.com/reactjs/react-modal/issues/462
        closeTimeoutMS={0}
        style={{ overlay: {}, content: { background: "rgba(0,0,0,0.1)" } }}
        contentLabel="Example Modal"
        portalClassName="ReactModalPortal"
        overlayClassName="ReactModal__Overlay"
        // className={this.state.isOpen && "is-menu-visible"}
        // bodyOpenClassName="ReactModal__Body--open"
        bodyOpenClassName="is-menu-visible"
        ariaHideApp={true}
        shouldCloseOnOverlayClick={true}
        role="dialog"
        // parentSelector={() => document.getElementById("___gatsby")}
        parentSelector={() => document.body}
      >
        <nav id="menu">
          <ul className="actions vertical">
            <li>
              <Link to="/">
                <div
                  onClick={this.props.handleCloseModal}
                  className="button special fit"
                >
                  Home
                </div>
              </Link>
            </li>
            <li>
              <div onClick={this.props.handleCloseModal} className="button fit">
                Close
              </div>
            </li>
          </ul>
        </nav>
      </ReactModal>
    );
  }
}

// <nav id="menu">
//           <Link to="/">
//             <button onClick={this.props.handleCloseModal}>Home</button>
//           </Link>
//           <button onClick={this.props.handleCloseModal}>Close Modal</button>
//         </nav>

export default Modal;

// <ul className="links">
//   <li>
//     <a href="index.html">Hose</a>
//   </li>
//   <li>
//     <a href="landing.html">Landing</a>
//   </li>
// </ul>
