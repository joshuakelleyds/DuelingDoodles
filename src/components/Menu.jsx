// import dependencies
import React, { Suspense, useRef, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Canvas, useLoader, useFrame } from 'react-three-fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import doodlebobModel from '../assets/new.glb';

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

// define 3d model component
const Model = () => {
  // create a memoized draco loader instance for decompressing the model
  const dracoLoader = useMemo(() => {
    const loader = new DRACOLoader();
    loader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
    return loader;
  }, []);

  // load the gltf model using the gltf loader and draco loader
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
    scale: [1, 1, 1],
  });
};

// define menu component
const Menu = ({ onClick, gameState, onLeaderboardClick }) => {
  // define button colors
  const buttonColors = ["#a1d7c1", "#e8b5d6"];

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
      className: 'absolute w-full h-full flex justify-center items-center flex-col px-8 text-center',
    },
    [
      // render the model using suspense for async loading
      React.createElement(
        Suspense,
        { fallback: null, key: 'suspense' },
        React.createElement(Canvas, {
          className: 'mb-8',
          style: { width: '300px', height: '300px' },
          key: 'canvas',
        }, [
          React.createElement('ambientLight', { intensity: 0.8, key: 'ambientLight' }),
          React.createElement(Model, { key: 'model' }),
        ]),
      ),
      // render title, subtitle, play button, and leaderboard button
      React.createElement(
        'h1',
        {
          className: 'sm:text-8xl text-7xl mb-4 font-extrabold tracking-tight text-slate-900 text-center',
          key: 'title',
        },
        'Dueling Doodles'
      ),
      React.createElement(
        'h2',
        {
          className: 'sm:text-3xl text-xl mb-3 font-semibold text-slate-900',
          key: 'subtitle',
        },
        'Benchmarking Lightweight Vision Models through your doodles'
      ),
      React.createElement(
        'button',
        {
          onClick: onClick,
          disabled: gameState !== 'menu',
          type: 'button',
          style: { backgroundColor: buttonColors[0] },
          className: `inline-flex items-center px-4 py-2 font-semibold leading-6 shadow rounded-md text-white hover:opacity-80 transition ease-in-out duration-150 ${
            gameState === 'loading' ? 'cursor-not-allowed' : ''
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
      React.createElement(
        'button',
        {
          onClick: onLeaderboardClick,
          type: 'button',
          style: { backgroundColor: buttonColors[1] },
          className: 'inline-flex items-center px-4 py-2 font-semibold leading-6 shadow rounded-md text-white hover:opacity-80 transition ease-in-out duration-150 mt-4',
          key: 'leaderboardButton',
        },
        'Leaderboard',
      ),
    ],
  );
};

// export menu component
export default Menu;