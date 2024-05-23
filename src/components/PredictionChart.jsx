import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

/**
 * PredictionChart component that shows a bubble chart physics simulation every x predictions
 * @param {Object[]} predictions - Array of prediction objects, each with a label and score.
 * @param {number} i - Index to choose the color scheme.
 * @returns {JSX.Element} - The SVG element with the chart.
 */
const PredictionChart = ({ predictions, i }) => {
  const chartRef = useRef(null); // reference to the SVG element
  const [simulation, setSimulation] = useState(null); // state to store the D3 simulation

  useEffect(() => {
    if (!predictions || predictions.length === 0) return; // do nothing if no predictions

    // set chart size based on window size
    const width = window.innerWidth / 4; // make the width a quarter of the window width
    const height = window.innerHeight; // make the height equal to the window height
    const minDimension = Math.min(width, height); // use the smaller dimension for sizing

    const range = window.innerWidth <= 768 ? [3, 90] : [minDimension * 0.025, minDimension * 0.4]; // different sizes for mobile
    const strength = window.innerWidth <= 768 ? .0001 : .005; // different strengths for mobile

    // create svg element
    const svg = d3.select(chartRef.current) // select the svg element
      .attr('width', width) // set its width
      .attr('height', height) // set its height
      .style('background', 'white'); // set background color

    // scales for circle size and color
    const radiusScale = d3.scaleSqrt() // square root scale for circle sizes
      .domain([0, 1]) // input values range from 0 to 1
      .range(range); // output sizes range

    const colorScale = i === 1 ? d3.scaleOrdinal(d3.schemePastel1) : d3.scaleOrdinal(d3.schemePastel2); // choose color scheme

    // stop and clear previous simulation if it exists
    if (simulation) {
      simulation.stop(); // stop it
      svg.selectAll('*').remove(); // clear svg contents
    }

    // create new simulation for positioning circles
    const newSimulation = d3.forceSimulation(predictions) // start simulation with predictions data
      .force('x', d3.forceX(width / 2).strength(0.01)) // force to center horizontally
      .force('y', d3.forceY(height / 2).strength(strength)) // force to center vertically
      .force('collide', d3.forceCollide().radius(d => radiusScale(d.score)).strength(.7)) // avoid overlap
      .force('center', d3.forceCenter(width / 2, height / 2)) // center everything
      .on('tick', () => {
        // update positions on each tick
        node.attr('transform', d => {
          const radius = radiusScale(d.score); // get circle radius
          d.x = Math.max(radius, Math.min(width - radius, d.x)); // keep inside bounds
          d.y = Math.max(radius, Math.min(height - radius, d.y)); // keep inside bounds
          return `translate(${d.x}, ${d.y})`; // move circle
        });
      });

    setSimulation(newSimulation); // save the new simulation

    // create groups for each circle and text
    const node = svg.selectAll('g') // select all groups
      .data(predictions) // bind data
      .enter() // create new elements
      .append('g') // append group elements
      .attr('transform', `translate(${width / 2}, ${height / 2})`); // start in the center

    // add circles to groups
    node.append('circle') // append a circle to each group
      .attr('r', d => radiusScale(d.score)) // set radius based on score
      .style('fill', (_, i) => colorScale(i)) // set fill color
      .style('fill-opacity', 1) // full opacity
      .attr('stroke', '#69a2b2') // border color
      .style('stroke-width', 2); // border width

    // add text labels to the first 10 circles
    node.filter((d, i) => i < 10) // only first 10
      .append('text') // append text
      .text(d => d.label) // set text content
      .style('text-anchor', 'middle') // center text
      .style('alignment-baseline', 'middle') // vertically align text
      .style('font-size', d => {
        const radius = radiusScale(d.score); // get radius
        const textLength = d.label.length; // get text length
        const fontSize = Math.min(radius, radius / (textLength / 3)); // calculate font size
        return `${fontSize}px`; // set font size
      })
      .style('fill', '#36454F'); // text color

    // cleanup when component unmounts
    return () => {
      newSimulation.stop(); // stop simulation
      svg.selectAll('*').remove(); // clear svg
    };
  }, [predictions]); // re-run effect when predictions change

  // render the svg element with a ref to access it in the effect
  return React.createElement('svg', {
    ref: chartRef,
    className: 'object-none w-full h-full',
    width: window.innerWidth / 4,
    height: window.innerHeight,
  });
};

export default PredictionChart;