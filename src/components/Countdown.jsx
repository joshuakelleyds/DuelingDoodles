import { motion } from 'framer-motion';
import React from 'react';

/**
 * Animation variants for the Countdown component.
 */
const dropIn = {
  hidden: {
    y: "100vh",
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
  exit: {
    scale: 8,
    opacity: 0,
    transition: {
      duration: 1,
      type: "ease-out",
    },
  },
};

/**
 * Countdown component displays a countdown timer with animated transitions.
 *
 * @param {Object} props - The component props.
 * @param {number} props.countdown - The current value of the countdown timer.
 * @returns {JSX.Element} The rendered Countdown component.
 */
const Countdown = ({ countdown }) => {
  return React.createElement(
    motion.div,
    {
      initial: 'hidden',
      animate: 'visible',
      variants: dropIn,
      exit: "exit",
      className: 'pointer-events-none absolute w-full h-full flex justify-center items-center text-[#555555]',
    },
    React.createElement(
      'h1',
      {
        style: { transform: 'translateY(-0.8rem)' },
        className: 'text-9xl',
      },
      countdown > 0 ? countdown : 'Draw!'
    )
  );
};

export default Countdown;