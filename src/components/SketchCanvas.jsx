import React, { useEffect, useRef, useState } from 'react';
import { throttle } from '../utils.js';
import constants from '../constants.js';

const START_DRAW_EVENTS = ['mousedown', 'touchstart'];
const DRAW_EVENTS = ['mousemove', 'touchmove'];
const STOP_DRAW_EVENTS = ['mouseup', 'mouseout', 'touchend'];

const THROTTLE_MS = 5;
const CANVAS_SIZE = Math.max(window.screen.width, window.screen.height);
const SKETCH_PADDING = 2;

/**
 * adds event listeners to an element
 * @param {HTMLElement} item - the element to add event listeners to
 * @param {string[]} events - array of event names to listen for
 * @param {Function} fn - the event handler function
 */
function addEventListeners(item, events, fn) {
  events.forEach(event => item.addEventListener(event, fn));
}

/**
 * removes event listeners from an element
 * @param {HTMLElement} item - the element to remove event listeners from
 * @param {string[]} events - array of event names to remove
 * @param {Function} fn - the event handler function
 */
function removeEventListeners(item, events, fn) {
  events.forEach(event => item.removeEventListener(event, fn));
}

/**
 * gets the position of a mouse or touch event
 * @param {Event} event - the event object
 * @returns {number[]} array containing the x and y coordinates
 */
function getPosition(event) {
  if (event.touches && event.touches[0]) {
    const diff = (event.target.offsetHeight - document.body.offsetHeight) / 2;
    return [event.touches[0].clientX, event.touches[0].clientY - diff];
  } else {
    return [event.offsetX, event.offsetY];
  }
}

/**
 * SketchCanvas component for drawing on a canvas element
 * @param {Object} props - the component props
 * @param {Function} props.onSketchChange - callback function when the sketch changes
 * @param {boolean} props.disabled - whether the canvas is disabled for drawing
 * @param {Object} ref - the ref object to expose methods to parent components
 * @returns {JSX.Element} the canvas element
 */
function SketchCanvas({ onSketchChange, disabled }, ref) {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const [sketchBoundingBox, setSketchBoundingBox] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [timeSpentDrawing, setTimeSpentDrawing] = useState(0);

  useEffect(function() {
    const canvas = canvasRef.current;
    if (!contextRef.current) {
      contextRef.current = canvas.getContext('2d', { willReadFrequently: true });
    }

    const context = contextRef.current;
    context.imageSmoothingEnabled = true;
    context.lineWidth = constants.BRUSH_SIZE;
    context.lineJoin = 'round';
    context.lineCap = 'round';
    context.strokeStyle = '#36454F';
    context.shadowColor = 'rgba(0, 0, 0, 0.9)';
    context.shadowBlur = 1;

    const paddingLeft = (canvas.width - window.innerWidth) / 2;
    const paddingTop = (canvas.height - window.innerHeight) / 2;
    const brushRadius = constants.BRUSH_SIZE / 2;

    /**
     * handles window resize event to adjust canvas size
     */
    function handleResize() {
      canvas.style.width = window.innerWidth;
      canvas.style.height = window.innerHeight;
    }

    /**
     * starts drawing on the canvas
     * @param {Event} event - the event object
     */
    function startDrawing(event) {
      if (disabled) return;

      const [offsetX, offsetY] = getPosition(event);
      const canvasX = offsetX + paddingLeft;
      const canvasY = offsetY + paddingTop;
      context.moveTo(canvasX, canvasY);
      context.beginPath();
      context.lineTo(canvasX, canvasY);
      context.arc(canvasX, canvasY, 0.5, 0, 2 * Math.PI);
      context.stroke();

      setIsDrawing(true);
      setSketchBoundingBox(function(x) {
        return x === null
          ? [canvasX, canvasY, canvasX, canvasY]
          : [
              Math.min(x[0], canvasX - brushRadius),
              Math.min(x[1], canvasY - brushRadius),
              Math.max(x[2], canvasX + brushRadius),
              Math.max(x[3], canvasY + brushRadius),
            ];
      });
      onSketchChange();
    }

    /**
     * draws on the canvas
     * @param {Event} event - the event object
     */
    const draw = throttle(function(event) {
      if (!isDrawing || disabled) return;

      setTimeSpentDrawing(function(x) {
        return x + THROTTLE_MS;
      });

      const [offsetX, offsetY] = getPosition(event);
      const canvasX = offsetX + paddingLeft;
      const canvasY = offsetY + paddingTop;

      setSketchBoundingBox(function(x) {
        return x === null
          ? x
          : [
              Math.min(x[0], canvasX - brushRadius),
              Math.min(x[1], canvasY - brushRadius),
              Math.max(x[2], canvasX + brushRadius),
              Math.max(x[3], canvasY + brushRadius),
            ];
      });

      context.lineTo(canvasX, canvasY);
      context.stroke();
      onSketchChange();
    }, THROTTLE_MS);

    /**
     * stops drawing on the canvas
     */
    function stopDrawing() {
      setIsDrawing(false);
    }

    handleResize();
    window.addEventListener('resize', handleResize);
    addEventListeners(canvas, START_DRAW_EVENTS, startDrawing);
    addEventListeners(canvas, DRAW_EVENTS, draw);
    addEventListeners(canvas, STOP_DRAW_EVENTS, stopDrawing);

    return function() {
      window.removeEventListener('resize', handleResize);
      removeEventListeners(canvas, START_DRAW_EVENTS, startDrawing);
      removeEventListeners(canvas, DRAW_EVENTS, draw);
      removeEventListeners(canvas, STOP_DRAW_EVENTS, stopDrawing);
    };
  }, [isDrawing, onSketchChange, disabled]);

  /**
   * gets the current canvas data
   * @returns {ImageData|null} the image data from the canvas, or null if no sketch
   */
  function getCanvasData() {
    if (sketchBoundingBox === null) return null;

    const context = contextRef.current;

    let left = sketchBoundingBox[0];
    let top = sketchBoundingBox[1];
    let width = sketchBoundingBox[2] - sketchBoundingBox[0];
    let height = sketchBoundingBox[3] - sketchBoundingBox[1];
    let sketchSize = 2 * SKETCH_PADDING;

    if (width >= height) {
      sketchSize += width;
      top = Math.max(top - (width - height) / 2, 0);
    } else {
      sketchSize += height;
      left = Math.max(left - (height - width) / 2, 0);
    }

    const imgData = context.getImageData(
      left - SKETCH_PADDING,
      top - SKETCH_PADDING,
      sketchSize,
      sketchSize
    );

    return imgData;
  }

  /**
   * clears the canvas
   * @param {boolean} resetTimeSpentDrawing - whether to reset the drawing time
   */
  function clearCanvas(resetTimeSpentDrawing = false) {
    setSketchBoundingBox(null);
    const canvas = canvasRef.current;
    const context = contextRef.current;
    context.clearRect(0, 0, canvas.width, canvas.height);
    setIsDrawing(false);

    if (resetTimeSpentDrawing) {
      setTimeSpentDrawing(0);
    }
  }

  React.useImperativeHandle(ref, function() {
    return {
      getCanvasData: getCanvasData,
      clearCanvas: clearCanvas,
      getTimeSpentDrawing: function() {
        return timeSpentDrawing;
      },
    };
  });

  return React.createElement('canvas', {
    className: 'object-none w-full h-full',
    ref: canvasRef,
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
  });
}

SketchCanvas.displayName = 'SketchCanvas';
export default React.forwardRef(SketchCanvas);