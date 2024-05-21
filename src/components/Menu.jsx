// import dependencies
import React, { Suspense, useRef, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Canvas, useLoader, useFrame } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import doodlebobModel from '../assets/new.glb';

/**
 * Animation variants for the drop-in effect.
 */
const dropIn = {
  hidden: {
    y: '-100vh',
    transition: {
      delay: 0.1,
      type: 'spring',
      damping: 10,
      stiffness: 100,
    },
  },
  visible: {
    y: '0',
    opacity: 1,
    transition: {
      type: 'spring',
      damping: 10,
      stiffness: 100,
    },
  },
};

/**
 * Model component that loads and renders a 3D model.
 * @returns {JSX.Element} The 3D model component.
 */
const Model = () => {
  // create a memoized draco loader instance for decompressing the model
  const dracoLoader = useMemo(() => {
    // draco is a lightweight threejs loader
    const loader = new DRACOLoader();
    loader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
    return loader;
  }, []);

  // load the gltf model using the gltf loader 
  const gltf = useLoader(GLTFLoader, doodlebobModel, (loader) => {
    loader.setDRACOLoader(dracoLoader);
  });

  // create a ref to store a reference to the 3d model
  const modelRef = useRef();

  // animate the model on every frame
  useFrame(({ clock }) => {
    const rotation = clock.getElapsedTime() * 0.3;
    if (modelRef.current) {
      modelRef.current.rotation.y = rotation;
      modelRef.current.rotation.x = rotation;
    }
  });

  // render the model using react-three-fiber's primitive component
  return React.createElement('primitive', {
    ref: modelRef,
    object: gltf.scene,
    position: [0, 0, 0],
    scale: [0.55, 0.55, 0.55],
  });
};

/**
 * Menu component that displays the game menu with a 3D model, title, and buttons.
 * @param {Object} props - The component props.
 * @param {Function} props.onClick - Callback function for the play button click event.
 * @param {string} props.gameState - The current game state.
 * @param {Function} props.onLeaderboardClick - Callback function for the leaderboard button click event.
 * @returns {JSX.Element} The menu component.
 */
const Menu = ({ onClick, gameState, onLeaderboardClick }) => {
  // define button colors
  const buttonColors = ['#fdcdac', '#e8b5d6'];

  // handle WebGL context loss and restore
  useEffect(() => {
    const handleContextLoss = (event) => {
      event.preventDefault();
    };

    const handleContextRestored = () => {
      console.log('WebGL context restored');
    };

    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.addEventListener('webglcontextlost', handleContextLoss);
      canvas.addEventListener('webglcontextrestored', handleContextRestored);
    }

    return () => {
      if (canvas) {
        canvas.removeEventListener('webglcontextlost', handleContextLoss);
        canvas.removeEventListener('webglcontextrestored', handleContextRestored);
      }
    };
  }, []);

  return React.createElement(
    motion.div,
    {
      initial: 'hidden',
      animate: 'visible',
      variants: dropIn,
      exit: 'hidden',
      className: 'absolute w-full h-full flex justify-center items-center flex-col px-8 text-center pb-8', // Added padding-bottom
    },
    [
      // render the model using suspense for async loading
      React.createElement(
        Suspense,
        { fallback: null, key: 'suspense' },
        React.createElement(Canvas, {
          className: 'mb-8',
          style: { width: '400px', height: '400px' },
          key: 'canvas',
        }, [
          React.createElement('ambientLight', { intensity: 1, key: 'ambientLight' }),
          React.createElement(Model, { key: 'model' }),
        ]),
      ),
      // render title
      React.createElement(
        'h1',
        {
          className: 'sm:text-7xl text-7xl mb-4 font-extrabold tracking-tight text-slate-900 text-center',
          key: 'title',
        },
        'Dueling Doodles!'
      ),
      // render subtitle
      React.createElement(
        'h2',
        {
          className: 'sm:text-2xl text-2xl mb-10 font-semibold text-slate-900', // Reduced margin-bottom to mb-2
          key: 'subtitle',
        },
        'Benchmarking Lightweight Vision AI through Sketch Recognition'
      ),
      // render play button
      React.createElement(
        'button',
        {
          onClick: onClick,
          disabled: gameState !== 'menu',
          type: 'button',
          style: { backgroundColor: buttonColors[0] },
          className: `sm:text-md inline-flex items-center leading-5 shadow rounded-md text-[#555555] hover:opacity-80 transition ease-in-out duration-150 sm:px-3 sm:py-2 md:px-3 md:py-2 lg:px-6 lg:py-4${
            gameState === 'loading' ? ' cursor-not-allowed' : ''
          }`,
          key: 'playButton',
        },
        gameState === 'loading'
          ? [
              React.createElement(
                'svg',
                {
                  className: 'animate-spin -ml-1 mr-3 h-5 w-5 text-white',
                  xmlns: 'http://www.w3.org/2000/svg',
                  fill: 'none',
                  viewBox: '0 0 24 24',
                  key: 'loadingSpinner',
                },
                [
                  React.createElement('circle', {
                    className: 'opacity-25',
                    cx: '12',
                    cy: '12',
                    r: '10',
                    stroke: 'currentColor',
                    strokeWidth: '4',
                    key: 'circle',
                  }),
                  React.createElement('path', {
                    className: 'opacity-75',
                    fill: 'currentColor',
                    d: 'M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z',
                    key: 'path',
                  }),
                ],
              ),
              'Loading neural network...',
            ]
          : 'Play Game',
      ),
      // render leaderboard button
      React.createElement(
        'button',
        {
          onClick: onLeaderboardClick,
          type: 'button',
          style: { backgroundColor: buttonColors[1] },
          className: 'sm:text-md inline-flex items-center leading-6 shadow rounded-md text-[#555555] hover:opacity-80 transition ease-in-out duration-150 sm:px-2 sm:py-1 md:px-3 md:py-2 lg:px-6 lg:py-4 mt-4', // Changed margin-top to mt-4
          key: 'leaderboardButton',
        },
        'Leaderboard',
      ),
    ],
  );
};
export default Menu;