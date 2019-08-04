import React, { useState, useEffect } from 'react'
import styled from '@emotion/styled'
import { Link } from 'gatsby'
import { useColorMode } from 'theme-ui'

import Section from '@narative/gatsby-theme-novela/src/components/Section'
import Logo from '@narative/gatsby-theme-novela/src/components/Logo'

import mediaqueries from '@narative/gatsby-theme-novela/src/styles/media'

function NavigationHeader() {
  const [showBackArrow, setShowBackArrow] = useState<boolean>(false)

  const [colorMode] = useColorMode()
  const fill = colorMode === 'dark' ? '#fff' : '#000'

  useEffect(() => {
    const previousPath = localStorage.getItem('previousPath')
    const previousPathWasHomepage = previousPath === '/' || (previousPath && previousPath.includes('/page/'))
    const isNotPaginated = !location.pathname.includes('/page/')

    setShowBackArrow(previousPathWasHomepage && isNotPaginated)
  }, [])

  return (
    <Section>
      <NavContainer>
        <LogoLink
          to="/"
          data-a11y="false"
          title="Navigate back to the homepage"
          aria-label="Navigate back to the homepage"
        >
          {showBackArrow && (
            <BackArrowIconContainer>
              <BackArrowIcon />
            </BackArrowIconContainer>
          )}
          <Logo fill={fill} />
          <Hidden>Navigate back to the homepage</Hidden>
        </LogoLink>
        <div style={{ width: '100%', marginLeft: 10 }}>
          <RouteLink to="/writing">Writing</RouteLink>
          <RouteLink to="/talks">Talks</RouteLink>
        </div>
        <NavControls>
          <SharePageButton />
          <DarkModeToggle />
        </NavControls>
      </NavContainer>
    </Section>
  )
}

export default NavigationHeader

function DarkModeToggle() {
  const [colorMode, setColorMode] = useColorMode()
  const isDark = colorMode === `dark`

  function toggleColorMode(event) {
    event.preventDefault()
    setColorMode(isDark ? `light` : `dark`)
  }

  return (
    <IconWrapper
      isDark={isDark}
      onClick={toggleColorMode}
      data-a11y="false"
      aria-label={isDark ? 'Activate light mode' : 'Activate dark mode'}
      title={isDark ? 'Activate light mode' : 'Activate dark mode'}
    >
      <MoonOrSun isDark={isDark} />
      <MoonMask isDark={isDark} />
    </IconWrapper>
  )
}

function SharePageButton() {
  const [hasCopied, setHasCopied] = useState<boolean>(false)
  const [colorMode] = useColorMode()
  const isDark = colorMode === `dark`

  function copyToClipboardOnClick() {
    if (hasCopied) return

    const tempInput = document.createElement('input')
    document.body.appendChild(tempInput)
    tempInput.setAttribute('value', window.location.href)
    tempInput.select()
    document.execCommand('copy')
    document.body.removeChild(tempInput)

    setHasCopied(true)

    setTimeout(() => {
      setHasCopied(false)
    }, 1000)
  }

  const Icon = isDark ? ShareDarkModeOffIcon : ShareDarkModeOnIcon

  return (
    <IconWrapper
      isDark={isDark}
      onClick={copyToClipboardOnClick}
      data-a11y="false"
      aria-label="Copy URL to clipboard"
      title="Copy URL to clipboard"
    >
      <Icon />
      <ToolTip isDark={isDark} hasCopied={hasCopied}>
        Copied
      </ToolTip>
    </IconWrapper>
  )
}

function CloseLink({ fill }: { fill: string }) {
  return (
    <CloseLinkContainer to="/">
      <CloseIcon fill={fill} />
    </CloseLinkContainer>
  )
}

const CloseLinkContainer = styled(Link)`
  ${mediaqueries.tablet_up`
    display: none;
  `}
`

const BackArrowIconContainer = styled.div`
  position: absolute;
  left: -44px;
  top: 0;
  bottom: 0;
  transition: 0.2s transform var(--ease-out-quad);
  opacity: 0;
  padding-right: 30px;
  animation: fadein 0.3s linear forwards;

  @keyframes fadein {
    to {
      opacity: 1;
    }
  }

  ${mediaqueries.desktop_large`
    display: none;
  `}
`

const BackArrowIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15.41 16.09L10.83 11.5L15.41 6.91L14 5.5L8 11.5L14 17.5L15.41 16.09Z" fill="black" />
  </svg>
)

const CloseIcon = ({ fill }) => (
  <svg width="24" height="25" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M0 0.188477H24V24.2789H0V0.188477Z"
      stroke="black"
      stroke-opacity="0.01"
      stroke-width="0"
    />
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M19 6.58848L17.6 5.18848L12 10.7885L6.4 5.18848L5 6.58848L10.6 12.1885L5 17.7885L6.4 19.1885L12 13.5885L17.6 19.1885L19 17.7885L13.4 12.1885L19 6.58848Z"
      fill={fill}
    />
  </svg>
)

const ShareDarkModeOffIcon = () => (
  <svg width="24" height="20" viewBox="0 0 24 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M2 5C2 3.34328 3.34328 2 5 2H14C15.6567 2 17 3.34328 17 5V9C17 10.6567 15.6567 12 14 12H10C9.44771 12 9 12.4477 9 13C9 13.5523 9.44771 14 10 14H14C16.7613 14 19 11.7613 19 9V5C19 2.23872 16.7613 0 14 0H5C2.23872 0 0 2.23872 0 5V9C0 10.4938 0.656313 11.8361 1.6935 12.7509C2.10768 13.1163 2.73961 13.0767 3.10494 12.6625C3.47028 12.2483 3.43068 11.6164 3.0165 11.2511C2.39169 10.6999 2 9.89621 2 9V5ZM7 11C7 9.34328 8.34328 8 10 8H14C14.5523 8 15 7.55228 15 7C15 6.44772 14.5523 6 14 6H10C7.23872 6 5 8.23872 5 11V15C5 17.7613 7.23872 20 10 20H19C21.7613 20 24 17.7613 24 15V11C24 9.50621 23.3437 8.16393 22.3065 7.24906C21.8923 6.88372 21.2604 6.92332 20.8951 7.3375C20.5297 7.75168 20.5693 8.38361 20.9835 8.74894C21.6083 9.30007 22 10.1038 22 11V15C22 16.6567 20.6567 18 19 18H10C8.34328 18 7 16.6567 7 15V11Z"
      fill="white"
    />
  </svg>
)

const ShareDarkModeOnIcon = () => (
  <svg width="24" height="20" viewBox="0 0 24 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M2 5C2 3.34328 3.34328 2 5 2H14C15.6567 2 17 3.34328 17 5V9C17 10.6567 15.6567 12 14 12H10C9.44771 12 9 12.4477 9 13C9 13.5523 9.44771 14 10 14H14C16.7613 14 19 11.7613 19 9V5C19 2.23872 16.7613 0 14 0H5C2.23872 0 0 2.23872 0 5V9C0 10.4938 0.656313 11.8361 1.6935 12.7509C2.10768 13.1163 2.73961 13.0767 3.10494 12.6625C3.47028 12.2483 3.43068 11.6164 3.0165 11.2511C2.39169 10.6999 2 9.89621 2 9V5ZM7 11C7 9.34328 8.34328 8 10 8H14C14.5523 8 15 7.55228 15 7C15 6.44772 14.5523 6 14 6H10C7.23872 6 5 8.23872 5 11V15C5 17.7613 7.23872 20 10 20H19C21.7613 20 24 17.7613 24 15V11C24 9.50621 23.3437 8.16393 22.3065 7.24906C21.8923 6.88372 21.2604 6.92332 20.8951 7.3375C20.5297 7.75168 20.5693 8.38361 20.9835 8.74894C21.6083 9.30007 22 10.1038 22 11V15C22 16.6567 20.6567 18 19 18H10C8.34328 18 7 16.6567 7 15V11Z"
      fill="black"
    />
  </svg>
)

const NavContainer = styled.div`
  position: relative;
  z-index: 100;
  padding-top: 100px;
  display: flex;
  justify-content: space-between;

  ${mediaqueries.desktop_medium`
    padding-top: 50px;
  `};

  @media screen and (max-height: 800px) {
    padding-top: 50px;
  }
`

const RouteLink = styled(Link)`
  position: relative;
  margin-right: 10px;
  &:hover {
    color: pink;
  }
`
const LogoLink = styled(Link)`
  position: relative;

  &[data-a11y='true']:focus::after {
    content: '';
    position: absolute;
    left: -10%;
    top: -30%;
    width: 120%;
    height: 160%;
    border: 2px solid ${(p) => p.theme.colors.accent};
    background: rgba(255, 255, 255, 0.01);
    border-radius: 5px;
  }

  &:hover {
    ${BackArrowIconContainer} {
      transform: translateX(-3px);
    }
  }
`

const NavControls = styled.div`
  display: flex;
  align-items: center;
`

const ToolTip = styled.div<{ isDark: boolean; hasCopied: boolean }>`
  position: absolute;
  padding: 4px 13px;
  background: ${(p) => (p.isDark ? '#000' : 'rgba(0,0,0,0.1)')};
  color: ${(p) => (p.isDark ? '#fff' : '#000')};
  border-radius: 5px;
  font-size: 14px;
  top: -35px;
  opacity: ${(p) => (p.hasCopied ? 1 : 0)};
  transform: ${(p) => (p.hasCopied ? 'translateY(-3px)' : 'none')};
  transition: transform 0.3s ease-in-out, opacity 0.3s ease-in-out;

  &::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: -6px;
    margin: 0 auto;
    width: 0;
    height: 0;
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-top: 6px solid ${(p) => (p.isDark ? '#000' : 'rgba(0,0,0,0.1)')};
  }
`

const IconWrapper = styled.button<{ isDark: boolean }>`
  opacity: 0.5;
  position: relative;
  border-radius: 5px;
  width: 40px;
  height: 25px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.3s ease;
  margin-left: 30px;

  &:hover {
    opacity: 1;
  }

  &[data-a11y='true']:focus::after {
    content: '';
    position: absolute;
    left: 0;
    top: -30%;
    width: 100%;
    height: 160%;
    border: 2px solid ${(p) => p.theme.colors.accent};
    background: rgba(255, 255, 255, 0.01);
    border-radius: 5px;
  }

  ${mediaqueries.tablet`
    display: inline-flex;
    transform: scale(0.708);
    margin-left: 10px;


    &:hover {
      opacity: 0.5;
    }
  `}
`

// This is based off a codepen! Much appreciated to: https://codepen.io/aaroniker/pen/KGpXZo
const MoonOrSun = styled.div<{ isDark: boolean }>`
  position: relative;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: ${(p) => (p.isDark ? '4px' : '2px')} solid ${(p) => p.theme.colors.primary};
  background: ${(p) => p.theme.colors.primary};
  transform: scale(${(p) => (p.isDark ? 0.55 : 1)});
  transition: all 0.45s ease;
  overflow: ${(p) => (p.isDark ? 'visible' : 'hidden')};

  &::before {
    content: '';
    position: absolute;
    right: -9px;
    top: -9px;
    height: 24px;
    width: 24px;
    border: 2px solid ${(p) => p.theme.colors.primary};
    border-radius: 50%;
    transform: translate(${(p) => (p.isDark ? '14px, -14px' : '0, 0')});
    opacity: ${(p) => (p.isDark ? 0 : 1)};
    transition: transform 0.45s ease;
  }

  &::after {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin: -4px 0 0 -4px;
    position: absolute;
    top: 50%;
    left: 50%;
    box-shadow: 0 -23px 0 ${(p) => p.theme.colors.primary}, 0 23px 0 ${(p) => p.theme.colors.primary},
      23px 0 0 ${(p) => p.theme.colors.primary}, -23px 0 0 ${(p) => p.theme.colors.primary},
      15px 15px 0 ${(p) => p.theme.colors.primary}, -15px 15px 0 ${(p) => p.theme.colors.primary},
      15px -15px 0 ${(p) => p.theme.colors.primary}, -15px -15px 0 ${(p) => p.theme.colors.primary};
    transform: scale(${(p) => (p.isDark ? 1 : 0)});
    transition: all 0.35s ease;

    ${mediaqueries.tablet`
      transform: scale(${(p) => (p.isDark ? 0.92 : 0)});
    `}
  }
`

const MoonMask = styled.div<{ isDark: boolean }>`
  position: absolute;
  right: -1px;
  top: -8px;
  height: 24px;
  width: 24px;
  border-radius: 50%;
  border: 0;
  background: ${(p) => p.theme.colors.background};
  transform: translate(${(p) => (p.isDark ? '14px, -14px' : '0, 0')});
  opacity: ${(p) => (p.isDark ? 0 : 1)};
  transition: background 0.25s var(--ease-in-out-quad), transform 0.45s ease;
`

const Hidden = styled.span`
  width: 0px;
  height: 0px;
  visibility: hidden;
  opacity: 0;
  display: inline-block;
  overflow: hidden;
  position: absolute;
`
