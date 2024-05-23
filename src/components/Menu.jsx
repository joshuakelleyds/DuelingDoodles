import React, { Suspense, useRef, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Canvas, useLoader, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { PencilLinesPass } from '../three/PencilLinesPass';
import DynamicShape from '../three/DynamicShape';

// animation variants for the drop-in effect
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

// effect setup component to add postprocessing effects
const EffectSetup = () => {
  const { scene, camera, gl } = useThree();

  useEffect(() => {
    const composer = new EffectComposer(gl);
    const renderPass = new RenderPass(scene, camera);
    const pencilLinesPass = new PencilLinesPass(scene, camera, window.innerWidth, window.innerHeight);

    composer.addPass(renderPass);
    composer.addPass(pencilLinesPass);

    const animate = () => {
      composer.render();
    };

    gl.setAnimationLoop(animate);

    return () => {
      gl.setAnimationLoop(null);
    };
  }, [scene, camera, gl]);

  return null;
};

// menu component that displays the game menu with a 3d model, title, and buttons
const Menu = ({ onClick, gameState, onLeaderboardClick }) => {
  const buttonColors = ['#fdcdac', '#e8b5d6'];

  useEffect(() => {
    const handleContextLoss = (event) => {
      event.preventDefault();
    };

    const handleContextRestored = () => {
      console.log('webgl context restored');
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
    'div',
    { className: 'relative w-full h-screen' },
    React.createElement(
      Suspense,
      { fallback: null },
      React.createElement(
        Canvas,
        { className: 'fixed top-0 left-0 w-full h-full', style: { zIndex: -1 } },
        React.createElement('ambientLight', { intensity: 1 }),
        React.createElement(DynamicShape, null),
        React.createElement(EffectSetup, null)
      )
    ),
    React.createElement(
      motion.div,
      {
        initial: 'hidden',
        animate: 'visible',
        variants: dropIn,
        exit: 'hidden',
        className: 'absolute inset-0 flex justify-center items-center',
      },
      React.createElement(
        'div',
        { className: 'relative z-10 flex flex-col items-center px-8 pb-8', style: { marginTop: '20vh' } },
        React.createElement(
          'h1',
          {
            className: 'text-6xl sm:text-7xl mb-4 font-extrabold tracking-tight text-slate-900 text-center',
          },
          'Dueling Doodles!'
        ),
        React.createElement(
          'h2',
          {
            className: 'text-2xl mb-10 font-semibold text-slate-900 text-center',
            style: { fontSize: 'min(3vw, 3vh)' },
          },
          'Benchmarking Lightweight Computer Vision Models through Sketch Recognition'
        ),
        React.createElement(
          'button',
          {
            onClick: onClick,
            disabled: gameState !== 'menu',
            type: 'button',
            style: { backgroundColor: buttonColors[0] },
            className: `text-md inline-flex items-center leading-5 shadow rounded-md text-[#555555] hover:opacity-80 transition ease-in-out duration-150 px-6 py-4 ${
              gameState === 'loading' ? 'cursor-not-allowed' : ''
            }`,
          },
          gameState === 'loading'
            ? React.createElement(
                React.Fragment,
                null,
                React.createElement(
                  'svg',
                  {
                    className: 'animate-spin -ml-1 mr-3 h-5 w-5 text-white',
                    xmlns: 'http://www.w3.org/2000/svg',
                    fill: 'none',
                    viewBox: '0 0 24 24',
                  },
                  React.createElement('circle', {
                    className: 'opacity-25',
                    cx: '12',
                    cy: '12',
                    r: '10',
                    stroke: 'currentColor',
                    strokeWidth: '4',
                  }),
                  React.createElement('path', {
                    className: 'opacity-75',
                    fill: 'currentColor',
                    d: 'M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z',
                  })
                ),
                'Loading neural network...'
              )
            : 'Play Game'
        ),
        React.createElement(
          'button',
          {
            onClick: onLeaderboardClick,
            type: 'button',
            style: { backgroundColor: buttonColors[1] },
            className:
              'text-md inline-flex items-center leading-6 shadow rounded-md text-[#555555] hover:opacity-80 transition ease-in-out duration-150 px-6 py-4 mt-4',
          },
          'Leaderboard'
        )
      )
    )
  );
};

export default Menu;