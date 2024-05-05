import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

const PredictionChart = ({ predictions }) => {
  const chartRef = useRef(null);
  const [simulation, setSimulation] = useState(null);

  useEffect(() => {
    if (!predictions || predictions.length === 0) return;

    // set chart size based on window size
    const width = window.innerWidth / 4; // set width to 1/4 of window width
    const height = window.innerHeight; // set height to window height
    const minDimension = Math.min(width, height); // find the smaller dimension (width or height)

    const range = window.innerWidth <= 768 ? [6, 90] : [minDimension * 0.03, minDimension * 0.4]; // check for mobile devices
    const strength = window.innerWidth <= 768 ? .0001 : .005; // check for mobile devices

    // create svg element to contain the chart
    const svg = d3.select(chartRef.current) // select the svg element using the ref
      .attr('width', width) // set the width of the svg
      .attr('height', height) // set the height of the svg
      .style('background', 'white'); // set the background color of the svg

    // create scales for circle size and color
    const radiusScale = d3.scaleSqrt() // use square root scale for circle size
      .domain([0, 1]) // set the input domain from 0 to 1
      .range(range); // set the output range for circle sizes

    const colorScale = d3.scaleOrdinal(d3.schemeCategory10); // create an ordinal color scale with d3's built-in color scheme

    // stop and remove previous simulation if it exists
    if (simulation) {
      simulation.stop(); // stop the previous simulation
      svg.selectAll('*').remove(); // remove all elements from the svg
    }

    // create new simulation with forces to position the circles
    const newSimulation = d3.forceSimulation(predictions) // create a new force simulation with the predictions data
      .force('x', d3.forceX(width / 2).strength(0.01)) // add an x-positioning force towards the center of the svg, with weak strength
      .force('y', d3.forceY(height / 2).strength(strength)) // add a y-positioning force towards the center of the svg, with weak strength
      .force('collide', d3.forceCollide().radius(d => radiusScale(d.score)).strength(.7)) // add a collision force to prevent circle overlap, with radius based on score
      .force('center', d3.forceCenter(width / 2, height / 2))// add a centering force to keep the circles in the center of the svg
      .on('tick', () => {
        // update circle positions on each simulation tick
        node.attr('transform', d => {
          const radius = radiusScale(d.score); // get the radius of the circle based on its score
          d.x = Math.max(radius, Math.min(width - radius, d.x)); // constrain the x position to keep the circle within the svg bounds
          d.y = Math.max(radius, Math.min(height - radius, d.y)); // constrain the y position to keep the circle within the svg bounds
          return `translate(${d.x}, ${d.y})`; // set the position of the circle group
        });
      });

    setSimulation(newSimulation); // store the new simulation in state

    // create groups to hold each circle and text element
    const node = svg.selectAll('g') // select all 'g' elements in the svg (there are none yet)
      .data(predictions) // bind the predictions data to the selection
      .enter() // for each data point that doesn't have a corresponding element, create a new one
      .append('g') // append a new 'g' element for each data point
      .attr('transform', `translate(${width / 2}, ${height / 2})`); // position the 'g' element at the center of the svg

    // add circles to the groups
    node.append('circle') // append a 'circle' element to each 'g'
      .attr('r', d => radiusScale(d.score)) // set the radius of the circle based on the score, using the radius scale
      .style('fill', (_, i) => colorScale(i)) // set the fill color of the circle using the color scale and index
      .style('fill-opacity', 0.6) // set the fill opacity of the circle
      .attr('stroke', '#69a2b2') // set the stroke color of the circle
      .style('stroke-width', 2); // set the stroke width of the circle

    // add text labels to the first 10 circles
    node.filter((d, i) => i < 10) // filter the nodes to only include the first 10
      .append('text') // append a 'text' element to each filtered node
      .text(d => d.label) // set the text content to the label of the data point
      .style('text-anchor', 'middle') // center the text horizontally
      .style('alignment-baseline', 'middle') // center the text vertically
      .style('font-size', d => {
        const radius = radiusScale(d.score); // get the radius of the circle
        const textLength = d.label.length; // get the length of the label text
        const fontSize = Math.min(radius, radius / (textLength / 3)); // calculate the font size based on the radius and text length
        return `${fontSize}px`; // set the font size in pixels
      })
      .style('fill', '#FFFFFF'); // set the text color to white

    // cleanup function to stop simulation when component unmounts
    return () => {
      newSimulation.stop(); // stop the simulation
      svg.selectAll('*').remove(); // remove all elements from the svg
    };
  }, [predictions]); // re-run the effect whenever the predictions data changes

    return React.createElement('svg', {
    ref: chartRef,
    className: 'object-none w-full h-full',
    width: window.innerWidth / 4,
    height: window.innerHeight,
  }); // render the svg element with a ref to access it in the effect
};

export default PredictionChart;