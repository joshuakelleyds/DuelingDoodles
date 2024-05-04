import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const PredictionChart = ({ output1 }) => {
  // Chart reference 
  const chartRef = useRef(null);
  
  useEffect(() => {
    if (!output1 || output1.length === 0) return;

    const width = window.innerWidth / 4;
    const height = window.innerHeight;

    const svg = d3.select(chartRef.current)
      .attr('width', width)
      .attr('height', height)
      .style('background', 'white');

    const radiusScale = d3.scaleSqrt()
      .domain([0, 1])
      .range([10, 225]);

    const simulation = d3.forceSimulation(output1)
      .force('x', d3.forceX(width / 2).strength(0.01))
      .force('y', d3.forceY(height / 2).strength(0.005))
      .force('collide', d3.forceCollide().radius(d => radiusScale(d.score) + 2).strength(0.7))
      .force('center', d3.forceCenter(width / 2, height / 2));

    const node = svg.selectAll('g')
      .data(output1)
      .enter()
      .append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`);

    node.append('circle')
      .attr('r', d => radiusScale(d.score))
      .style('fill', () => getRandomColor())
      .style('fill-opacity', 0.6)
      .attr('stroke', '#69a2b2')
      .style('stroke-width', 2);

    node.filter((d, i) => i < 10)
      .append('text')
      .text(d => d.label)
      .style('text-anchor', 'middle')
      .style('alignment-baseline', 'middle')
      .style('font-size', d => `${Math.max(12, radiusScale(d.score) / 3)}px`)
      .style('fill', '#FFFFFF');

    simulation.nodes(output1)
      .on('tick', () => {
        node.attr('transform', d => {
          const radius = radiusScale(d.score);
          d.x = Math.max(radius, Math.min(width - radius, d.x));
          d.y = Math.max(radius, Math.min(height - radius, d.y));
          return `translate(${d.x}, ${d.y})`;
        });
      });

    return () => {
      simulation.stop();
      svg.selectAll('*').remove();
    };
  }, [output1]);

  const getRandomColor = () => {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    return `rgb(${r},${g},${b})`;
  };

  return <svg ref={chartRef}></svg>;
};

export default PredictionChart;