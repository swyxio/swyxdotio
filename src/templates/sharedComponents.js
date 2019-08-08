import React from 'react'
import Media from '@narative/gatsby-theme-novela/src/components/Media/Media.Img'
import styled from '@emotion/styled'
import { css } from '@emotion/core'
import mediaqueries from '@narative/gatsby-theme-novela/src/styles/media'
import { Link } from 'gatsby'
import Heading from '@narative/gatsby-theme-novela/src/components/Heading'
export const GridItem = ({ talk, narrow }) => {
  if (!talk) return null
  talk = talk.node

  const hasOverflow = narrow && talk.title.length > 35

  return (
    <ArticleLink to={'talks/' + talk.slug} data-a11y="false">
      <Item>
        {talk.hero && (
          <Image narrow={narrow}>
            <Media src={narrow ? talk.hero.narrow.fluid : talk.hero.regular.fluid} />
          </Image>
        )}
        <MetaData>
          {talk.date || '🤷🏼‍'} · {talk.venues || 'somewhere on Earth'}
        </MetaData>
        <Title dark hasOverflow={hasOverflow}>
          {talk.title}
        </Title>
        {/* <Excerpt narrow={narrow} hasOverflow={hasOverflow}> */}
        <Excerpt narrow={narrow} hasOverflow={hasOverflow}>
          <div style={{ display: 'block' }}>
            <span
              style={{
                display: 'inline',
                padding: 3,
                backgroundColor: 'rgba(100, 100, 200, 0.1)',
              }}
            >
              Topic: {talk.topic}
            </span>
            {talk.excerpt && <div>{talk.excerpt}</div>}
          </div>
        </Excerpt>
      </Item>
    </ArticleLink>
  )
}

const ArticleLink = styled(Link)`
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  border-radius: 5px;
  z-index: 1;
  transition: transform 0.33s var(--ease-out-quart);
  -webkit-tap-highlight-color: rgba(255, 255, 255, 0);

  &:hover ${Image}, &:focus ${Image} {
    transform: translateY(-1px);
    box-shadow: 0 50px 80px -20px rgba(0, 0, 0, 0.27), 0 30px 50px -30px rgba(0, 0, 0, 0.3);
  }

  &:hover h2,
  &:focus h2 {
    color: ${(p) => p.theme.colors.accent};
  }

  &[data-a11y='true']:focus::after {
    content: '';
    position: absolute;
    left: -1.5%;
    top: -2%;
    width: 103%;
    height: 104%;
    border: 3px solid ${(p) => p.theme.colors.accent};
    background: rgba(255, 255, 255, 0.01);
    border-radius: 5px;
  }

  ${mediaqueries.phablet`
    &:hover ${Image} {
      transform: none;
      box-shadow: initial;
    }

    &:active {
      transform: scale(0.97) translateY(3px);
    }
  `}
`

const Item = styled.div`
  position: relative;

  ${mediaqueries.tablet`
    margin-bottom: 60px;
  `}

  @media (max-width: 540px) {
    background: ${(p) => p.theme.colors.card};
  }

  ${mediaqueries.phablet`
    margin-bottom: 40px;
    box-shadow: 0px 20px 40px rgba(0, 0, 0, 0.2);
    border-bottom-right-radius: 5px;
    border-bottom-left-radius: 5px;
  `}
`

const Image = styled.div`
  position: relative;
  height: 280px;
  box-shadow: 0 30px 60px -10px rgba(0, 0, 0, ${(p) => (p.narrow ? 0.22 : 0.3)}),
    0 18px 36px -18px rgba(0, 0, 0, ${(p) => (p.narrow ? 0.25 : 0.33)});
  margin-bottom: 30px;
  transition: transform 0.3s var(--ease-out-quad), box-shadow 0.3s var(--ease-out-quad);

  & > div {
    height: 100%;
  }

  ${mediaqueries.tablet`
    height: 200px;
    margin-bottom: 35px;
  `}

  ${mediaqueries.phablet`
    overflow: hidden;
    margin-bottom: 0;
    box-shadow: none;
    border-top-right-radius: 5px;
    border-top-left-radius: 5px;
  `}
`

export const MetaData = styled.div`
  font-weight: 600;
  font-size: 16px;
  color: ${(p) => p.theme.colors.grey};
  opacity: 0.33;

  ${mediaqueries.phablet`
    max-width: 100%;
    padding:  0 20px 30px;
  `}
`

const Title = styled(Heading.h2)`
  font-size: 21px;
  font-family: ${(p) => p.theme.fonts.serif};
  margin-bottom: ${(p) => (p.hasOverflow ? '45px' : '10px')};
  transition: color 0.3s ease-in-out;
  ${limitToTwoLines};

  ${mediaqueries.tablet`
    font-size: 24px;  
    margin-bottom: 15px;
  `}

  ${mediaqueries.phablet`
    font-size: 22px;  
    padding: 30px 20px 0;
    margin-bottom: 10px;
    -webkit-line-clamp: 3;
  `}
`
export const Excerpt = styled.div`
  ${limitToTwoLines};
  font-size: 16px;
  margin-bottom: 10px;
  color: ${(p) => p.theme.colors.grey};
  display: ${(p) => (p.hasOverflow ? 'none' : 'box')};
  max-width: ${(p) => (p.narrow ? '415px' : '515px')};

  ${mediaqueries.desktop`
    display: -webkit-box;
  `}

  ${mediaqueries.phablet`
    margin-bottom; 15px;
  `}

  ${mediaqueries.phablet`
    max-width: 100%;
    padding:  0 20px;
    margin-bottom: 20px;
    -webkit-line-clamp: 3;
  `}
`

const limitToTwoLines = css`
  text-overflow: ellipsis;
  overflow-wrap: normal;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  display: -webkit-box;
  white-space: normal;
  overflow: hidden;

  ${mediaqueries.phablet`
    -webkit-line-clamp: 3;
  `}
`
