import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

const PredictionChart = ({ output1 }) => {
  const chartRef = useRef(null);  // ref for svg element
  const [simulation, setSimulation] = useState(null);  // state for d3 simulation

  useEffect(() => {
    if (!output1 || output1.length === 0) return;  // exit if output1 is empty

    const width = window.innerWidth / 4;  // chart width
    const height = window.innerHeight;  // chart height
    const minDimension = Math.min(width, height);  // minimum dimension
    const range = window.innerWidth <= 768 ? [1, 70] : [minDimension * 0.03, minDimension * 0.4];  // scale range

    const svg = d3.select(chartRef.current)  // select svg
      .attr('width', width)  // set width
      .attr('height', height)  // set height
      .style('background', 'white');  // set background

    const radiusScale = d3.scaleSqrt()  // radius scale
      .domain([0, 1])  // domain for radius
      .range(range);  // range for radius

    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);  // color scale

    // stop and cleanup previous simulation
    if (simulation) {
      simulation.stop();
      svg.selectAll('*').remove();
    }

    const newSimulation = d3.forceSimulation(output1)  // new simulation
      .force('x', d3.forceX(width / 2).strength(0.01))  // x force
      .force('y', d3.forceY(height / 2).strength(0.005))  // y force
      .force('collide', d3.forceCollide().radius(d => radiusScale(d.score)).strength(0.7))  // collision force
      .force('center', d3.forceCenter(width / 2, height / 2))  // center force
      .on('tick', () => {  // on tick event
        node.attr('transform', d => {
          const radius = radiusScale(d.score);
          d.x = Math.max(radius, Math.min(width - radius, d.x));
          d.y = Math.max(radius, Math.min(height - radius, d.y));
          return `translate(${d.x}, ${d.y})`;
        });
      });

    setSimulation(newSimulation);  // set new simulation

    const node = svg.selectAll('g')  // create node groups
      .data(output1)
      .enter()
      .append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`);

    node.append('circle')  // append circles
      .attr('r', d => radiusScale(d.score))
      .style('fill', (_, i) => colorScale(i))
      .style('fill-opacity', 0.6)
      .attr('stroke', '#69a2b2')
      .style('stroke-width', 2);

    node.filter((d, i) => i < 10)  // append text for first 10 nodes
      .append('text')
      .text(d => d.label)
      .style('text-anchor', 'middle')
      .style('alignment-baseline', 'middle')
      .style('font-size', d => {
        const radius = radiusScale(d.score);
        const textLength = d.label.length;
        const fontSize = Math.min(radius, radius / (textLength / 3));
        return `${fontSize}px`;
      })
      .style('fill', '#FFFFFF');

    return () => {  // cleanup function
      newSimulation.stop();
      svg.selectAll('*').remove();
    };
  }, [output1]);

  return <svg ref={chartRef}></svg>;  // return svg
};

export default PredictionChart;
