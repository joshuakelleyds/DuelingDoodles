// Menu.js
// import required dependencies
import React from 'react';
import { motion } from 'framer-motion';
import pngImage from '../../public/doodlebob.png';

// define animation variants for drop-in effect
const dropIn = {
  hidden: {
    y: "-100vh",
    transition: {
      delay: 0.1,
      type: "spring",
      damping: 10,
      stiffness: 100,
    },
  },
  visible: {
    y: "0",
    opacity: 1,
    transition: {
      type: "spring",
      damping: 10,
      stiffness: 100,
    },
  },
};

// define Menu component
const Menu = ({ onClick, gameState, onLeaderboardClick }) => {
  // define button colors
  const buttonColors = ["#a1d7c1", "#e8b5d6"];

  // render Menu component using React.createElement
  return React.createElement(
    motion.div,
    {
      initial: "hidden",
      animate: "visible",
      variants: dropIn,
      exit: "hidden",
      className: "absolute w-full h-full flex justify-center items-center flex-col px-8 text-center",
    },
    [
      // render image element
      React.createElement("img", {
        key: "image",
        src: pngImage,
        alt: "PNG Image",
        className: "mb-8 w-64 h-64",
      }),
      // render title element
      React.createElement(
        "h1",
        {
          key: "title",
          className: "sm:text-8xl text-7xl mb-4 font-extrabold tracking-tight text-slate-900 text-center",
        },
        "Dueling Doodles"
      ),
      // render subtitle element
      React.createElement(
        "h2",
        {
          key: "subtitle",
          className: "sm:text-3xl text-xl mb-3 font-semibold text-slate-900",
        },
        "Benchmarking Lightweight Vision Models through your doodles"
      ),
      // render play button element
      React.createElement(
        "button",
        {
          key: "playButton",
          onClick: onClick,
          disabled: gameState !== 'menu',
          type: "button",
          style: { backgroundColor: buttonColors[0] },
          className: `inline-flex items-center px-4 py-2 font-semibold leading-6 shadow rounded-md text-white hover:opacity-80 transition ease-in-out duration-150 ${
            gameState === 'loading' ? 'cursor-not-allowed' : ''
          }`,
        },
        // render loading spinner if gameState is 'loading'
        gameState === 'loading' && React.createElement(
          "svg",
          {
            className: "animate-spin -ml-1 mr-3 h-5 w-5 text-white",
            xmlns: "http://www.w3.org/2000/svg",
            fill: "none",
            viewBox: "0 0 24 24",
          },
          [
            React.createElement("circle", {
              key: "circle",
              className: "opacity-25",
              cx: "12",
              cy: "12",
              r: "10",
              stroke: "currentColor",
              strokeWidth: "4",
            }),
            React.createElement("path", {
              key: "path",
              className: "opacity-75",
              fill: "currentColor",
              d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z",
            }),
          ]
        ),
        // render button text based on gameState
        gameState === 'loading' ? 'Loading neural network...' : 'Play Game'
      ),
      // render leaderboard button element
      React.createElement(
        "button",
        {
          key: "leaderboardButton",
          onClick: onLeaderboardClick,
          type: "button",
          style: { backgroundColor: buttonColors[1] },
          className: "inline-flex items-center px-4 py-2 font-semibold leading-6 shadow rounded-md text-white hover:opacity-80 transition ease-in-out duration-150 mt-4",
        },
        "Leaderboard"
      ),
    ]
  );
};

// export Menu component
export default Menu;