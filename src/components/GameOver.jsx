// import necessary dependencies
import React from 'react';
import { motion } from 'framer-motion';

/**
 * Animation configuration for the drop-in effect.
 */
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

/**
 * Creates an image URL from ImageData.
 * @param {ImageData} imageData - The ImageData object to convert.
 * @returns {string} - The data URL of the image.
 */
function createImageFromImageData(imageData) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  context.putImageData(imageData, 0, 0);
  return canvas.toDataURL();
}

/**
 * GameOver component displays the game over screen with player's score and predictions.
 * @param {Object} props - The component props.
 * @param {Array} props.predictions - The array of predictions made by the player.
 * @param {Function} props.onClick - The function to handle button clicks.
 * @returns {JSX.Element} - The rendered game over component.
 */
const GameOver = ({ predictions, onClick }) => {
  return (
    // main container with drop-in animation
    React.createElement(motion.div, {
      initial: 'hidden',
      animate: 'visible',
      variants: dropIn,
      exit: "hidden",
      className: 'absolute w-full h-full flex justify-center items-center flex-col px-8 text-center'
    },
    // game over title
    React.createElement('h1', {
      className: 'sm:text-7xl text-6xl mb-3 font-bold tracking-tight text-slate-900 text-center'
    }, 'Game Over!'),
    // display score
    React.createElement('h2', {
      className: 'mb-4 sm:text-2xl text-xl font-semibold text-slate-900'
    }, 'Score: ', predictions.filter(p => p.correct).length, ' / ', predictions.length),
    // container for predictions
    React.createElement('div', {
      className: 'max-w-full overflow-x-auto flex gap-4 px-8 p-4 rounded-lg shadow-[0_5px_25px_-5px_rgb(0,0,0,0.1),_0_8px_10px_-6px_rgb(0,0,0,0.1);]'
    },
    // map through predictions and display each
    predictions.map((p, i) =>
      React.createElement('div', {
        key: i,
        className: 'flex justify-center items-center w-full flex-col'
      },
      React.createElement('img', {
        className: 'max-h-[12rem] min-w-[12rem]',
        src: p.image ? createImageFromImageData(p.image) : ''
      }),
      React.createElement('p', {
        className: 'text-slate-900 text-lg font-semibold mt-2'
      }, p.target, ' ', p.correct ? '✅' : '❌'))
    )),
    // buttons for play again and main menu
    React.createElement('div', {
      className: 'flex mt-6 gap-4'
    },
    // play again button
    React.createElement('button', {
      onClick: () => onClick(true),
      type: "button",
      className: "inline-flex items-center px-4 py-2 font-semibold leading-6 shadow rounded-md text-[#555555]",
      style: { backgroundColor: "#ff9980" } // set button color to slightly darker pastel orange
    }, 'Play Again'),
    // main menu button
    React.createElement('button', {
      onClick: () => onClick(false),
      type: "button",
      className: "inline-flex items-center px-4 py-2 font-semibold leading-6 shadow rounded-md text-[#555555]",
      style: { backgroundColor: "#fffb91" } // set button color to slightly darker pastel yellow
    }, 'Main Menu'))
    )
  );
};

export default GameOver;