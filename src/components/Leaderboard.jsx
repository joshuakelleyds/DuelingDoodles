// import necessary dependencies
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Typography, Box, Paper } from '@mui/material';
import Rough from 'roughjs/bundled/rough.esm';
import { Bar, BarH, Scatter, Pie, Donut } from 'react-roughviz';
import { mobileTabletCheck } from '../utils';

/**
 * Leaderboard component that displays leaderboard data and various graphs.
 * @param {Object} props - the component props
 * @param {Array} props.LeaderboardData - initial table data
 * @param {Array} props.colNames - column names for the table
 * @param {Object} props.tableStyleOptions - styling options for the table
 * @param {Array} props.barData - data for the bar chart
 * @param {Array} props.barHData - data for the horizontal bar chart
 * @param {Object} props.scatterData - data for the scatter plot
 * @param {Array} props.pieData - data for the pie chart
 * @param {Array} props.donutData - data for the donut chart
 * @param {Object} props.chartOptions - options for the charts
 * @param {number} props.numGraphs - number of graphs to display
 * @param {Array} props.graphTypes - types of graphs to display
 * @param {Function} props.onClose - callback function for closing the leaderboard
 * @returns {JSX.Element} the rendered leaderboard component
 */
const Leaderboard = ({
  LeaderboardData, // initial table data
  colNames = [], // column names
  tableStyleOptions = {}, // table style options
  barData = [], // bar chart data
  barHData = [], // horizontal bar chart data
  scatterData = {}, // scatter plot data
  pieData = [], // pie chart data
  donutData = [], // donut chart data
  chartOptions = {}, // chart options
  numGraphs, // number of graphs
  graphTypes = [], // graph types
  onClose, // callback function for closing the leaderboard
}) => {
  // state to store the table data
  const [tableData, setTableData] = useState(LeaderboardData || []);
  // ref to store the canvas element for the table
  const tableCanvasRef = useRef(null);
  // check if the device is mobile or tablet
  const isMobile = mobileTabletCheck();
  // get the device pixel ratio for high-resolution rendering
  const dpr = window.devicePixelRatio || 1;

  // calculate the table dimensions based on the device type
  const [tableWidth, tableHeight] = useMemo(() => {
    // set width and height based on device type (mobile or desktop)
    const width = isMobile ? Math.min(window.innerWidth * 0.9, 500) : Math.floor(window.innerWidth * 0.6);
    const height = isMobile ? Math.min(window.innerHeight * 0.7, 500) : Math.floor(window.innerHeight * 0.8);
    return [width, height];
  }, [isMobile]);

  /**
   * resizes the canvas based on the table data and device type
   * @param {HTMLCanvasElement} canvas - the canvas element
   * @param {Array} columnWidths - array of column widths
   */
  const resizeCanvas = useCallback((canvas, columnWidths) => {
    if (!canvas || !columnWidths) return;

    const totalWidth = columnWidths.reduce((sum, width) => sum + width, 0); // calculate total width of all columns
    const numRows = tableData.length; // get the number of rows in the table
    const cellHeight = Math.floor(tableHeight / (numRows + 1)) + 15; // adjust this value to make cells taller
    const totalHeight = (numRows + 1) * cellHeight; // calculate total height of the table

    if (isMobile) {
      canvas.width = totalWidth * dpr; // set canvas width for high-resolution rendering
      canvas.height = totalHeight * dpr; // set canvas height for high-resolution rendering
      canvas.style.width = `${Math.min(totalWidth, tableWidth)}px`; // set CSS width for the canvas
      canvas.style.height = `${Math.min(totalHeight, tableHeight)}px`; // set CSS height for the canvas
      const ctx = canvas.getContext('2d'); // get the 2d context of the canvas
      ctx.scale(dpr, dpr); // scale the context for high-resolution rendering
    } else {
      canvas.width = totalWidth; // set canvas width for desktop
      canvas.height = totalHeight; // set canvas height for desktop
    }
  }, [tableData, tableHeight, tableWidth, isMobile, dpr]);

  /**
   * calculates the column widths based on the table data
   * @param {CanvasRenderingContext2D} ctx - the canvas rendering context
   * @returns {Array} array of column widths
   */
  const calculateColumnWidths = useCallback((ctx) => {
    if (!ctx) return [];

    const numCols = tableData[0]?.length || 0; // get the number of columns in the table
    const maxWidths = Array(numCols).fill(0); // initialize an array to store the maximum width for each column

    tableData.forEach((row) => {
      row.forEach((cell, columnIndex) => {
        let cellWidth = ctx.measureText(cell.toString()).width; // measure the width of the cell content
        if (cellWidth < 15) {
          cellWidth = 15; // set a minimum width for the cell
        }
        maxWidths[columnIndex] = Math.max(maxWidths[columnIndex], cellWidth); // update the maximum width for the column if necessary
      });
    });

    colNames.forEach((header, columnIndex) => {
      const headerWidth = ctx.measureText(header).width * 1.3; // measure the width of the header text and add padding
      maxWidths[columnIndex] = Math.max(maxWidths[columnIndex], headerWidth) * 2.3; // update the maximum width for the column if necessary
    });

    return maxWidths; // return the array of column widths
  }, [tableData, colNames]);

  /**
   * draws the table on the canvas
   */
  const drawTable = useCallback(() => {
    if (!tableCanvasRef.current) return;

    const tableCanvas = tableCanvasRef.current; // get the canvas element
    const tableCtx = tableCanvas.getContext('2d'); // get the 2d context of the canvas
    tableCtx.clearRect(0, 0, tableCanvas.width, tableCanvas.height); // clear the canvas
    const roughCanvas = Rough.canvas(tableCanvas); // create a rough.js canvas for the hand-drawn effect

    const numRows = tableData.length; // get the number of rows in the table

    const columnWidths = calculateColumnWidths(tableCtx); // calculate the column widths
    resizeCanvas(tableCanvas, columnWidths); // resize the canvas based on the column widths

    const cellHeight = Math.floor(tableHeight / (numRows + 1)) + 15; // adjust this value to make cells taller

    const isLandscape = window.innerWidth > window.innerHeight; // check if the device is in landscape orientation

    const headerFontSize = isMobile
      ? isLandscape
        ? '2vw'
        : '5vw'
      : `${Math.min(Math.floor(cellHeight * 0.08), Math.floor(Math.min(...columnWidths) * 0.08))}vmin`; // calculate the font size for headers
    const cellFontSize = isMobile
      ? isLandscape
        ? '1.5vw'
        : '4vw'
      : `${Math.min(Math.floor(cellHeight * 0.07), Math.floor(Math.min(...columnWidths) * 0.07))}vmin`; // calculate the font size for cells

    const headerColors = tableStyleOptions.headerColors || [
      '#e3968e', '#91a6bc', '#a8c6a0', '#b8a3bb', '#e6b87d',
      '#e6e6a3', '#b8a690', '#e2b0c2', '#c9c9c9',
    ]; // define the colors for the header cells
    const cellColor = tableStyleOptions.cellColor || '#FFFFFF'; // define the color for the data cells

    // draw the header cells
    let currentX = 0;
    colNames.forEach((header, columnIndex) => {
      const cellWidth = columnWidths[columnIndex];
      const color = headerColors[columnIndex % headerColors.length];
      roughCanvas.rectangle(currentX, 0, cellWidth, cellHeight, {
        fill: color,
        fillStyle: 'hachure',
        fillWeight: 10,
        hachureAngle: 30,
        roughness: 3,
        bowing: 1,
        stroke: 'grey',
        strokeWidth: 3,
      }); // draw the header cell rectangle with a hand-drawn effect
      tableCtx.font = `${headerFontSize} Virgil`;
      tableCtx.fillStyle = 'grey';
      tableCtx.textAlign = 'center';
      tableCtx.textBaseline = 'middle';
      tableCtx.fillText(header, currentX + cellWidth / 2, cellHeight / 2); // draw the header text
      currentX += cellWidth;
    });

    // draw the data cells
    tableData.forEach((row, rowIndex) => {
      let currentX = 0;
      row.forEach((cell, columnIndex) => {
        const cellWidth = columnWidths[columnIndex];
        const y = (rowIndex + 1) * cellHeight;
        roughCanvas.rectangle(currentX, y, cellWidth, cellHeight, {
          fill: cellColor,
          fillStyle: 'solid',
          roughness: 2,
          bowing: 1,
          stroke: 'grey',
          strokeWidth: 2,
        }); // draw the data cell rectangle with a hand-drawn effect
        tableCtx.font = `${cellFontSize} Virgil`;
        tableCtx.fillStyle = 'grey';
        tableCtx.textAlign = 'center';
        tableCtx.textBaseline = 'middle';
        tableCtx.fillText(cell.toString(), currentX + cellWidth / 2, y + cellHeight / 2); // draw the cell text
        currentX += cellWidth;
      });
    });
  }, [tableData, colNames, tableStyleOptions, calculateColumnWidths, resizeCanvas, tableHeight, isMobile]);

  useEffect(() => {
    drawTable(); // draw the table when the component mounts or the table data changes
  }, [drawTable]);

  /**
   * formats the data for each graph type
   * @param {string} graphType - the type of graph
   * @param {Array} data - the data for the graph
   * @returns {Object} the formatted data
   */
  const formatData = (graphType, data) => {
    switch (graphType) {
      case 'bar':
      case 'barH':
      case 'pie':
      case 'donut':
        return { labels: data[0], values: data[1] }; // return the formatted data for bar, barH, pie, and donut charts
      case 'scatter':
        return { x: data[0], y: data[1] }; // return the formatted data for scatter plot
      default:
        return data; // return the data as is for any other graph type
    }
  };

  /**
   * renders the specified graph type with error handling
   * @param {string} graphType - the type of graph to render
   * @param {Array|Object} data - the data for the graph
   * @returns {JSX.Element|null} the rendered graph component or null on error
   */
  const renderGraph = useCallback((graphType, data) => {
    if (!data) return null; // return null if data is not available

    try {
      const formattedData = formatData(graphType, data); // format the data based on the graph type

      if (
        graphType === "pie" && (
          !Array.isArray(formattedData.values) ||
          formattedData.values.some((value) => value <= 0)
        )
      ) {
        throw new Error('Values prop must be an array of positive numbers for pie chart.');
      }

      const graphOptions = {
        ...(chartOptions[graphType] || {}),
        labels: { show: true, fontSize: '1rem', fontFamily: 'Virgil', color: 'grey' },
        margin: { top: 40, right: 40, bottom: 80, left: 150 }, // add margin to prevent labels from getting cut off
      };

      const commonProps = {
        data: formattedData,
        labels: 'labels',
        values: 'values',
        ...graphOptions,
        width: isMobile ? Math.floor(window.innerWidth * 0.9) : Math.floor(window.innerWidth * 0.35),
        height: isMobile
          ? Math.floor(window.innerHeight * 0.5 / numGraphs)
          : Math.floor(window.innerHeight * 0.7 / numGraphs),
        font: 'Virgil',
        style: { marginBottom: '20px' },
      };

      switch (graphType) {
        case 'bar':
          return React.createElement(Bar, commonProps); // render bar chart
        case 'barH':
          return React.createElement(BarH, commonProps); // render horizontal bar chart
        case 'scatter':
          return React.createElement(Scatter, commonProps); // render scatter plot
        case 'pie':
          return React.createElement(Pie, commonProps); // render pie chart
        case 'donut':
          return React.createElement(Donut, commonProps); // render donut chart
        default:
          return null; // return null for any other graph type
      }
    } catch (error) {
      console.error(`Error rendering ${graphType} graph:`, error); // log the error
      return null; // return null if an error occurs
    }
  }, [isMobile, numGraphs, chartOptions]);

  /**
   * helper function to get the data based on the graph type
   * @param {string} graphType - the type of graph
   * @returns {Array|Object} the data for the graph
   */
  const getGraphData = (graphType) => {
    switch (graphType) {
      case 'bar':
        return barData; // return bar chart data
      case 'barH':
        return barHData; // return horizontal bar chart data
      case 'scatter':
        return scatterData; // return scatter plot data
      case 'pie':
        return pieData; // return pie chart data
      case 'donut':
        return donutData; // return donut chart data
      default:
        return []; // return empty array for any other graph type
    }
  };

  return React.createElement(motion.div, {
    initial: { opacity: 0, scale: 0.8 }, // initial animation state
    animate: { opacity: 1, scale: 1 }, // animate to this state
    exit: { opacity: 0, scale: 0.8 }, // exit animation state
    transition: { duration: 0.3 }, // animation duration
    className: "fixed top-0 left-0 w-full h-full flex justify-center items-center bg-white z-50"
  }, React.createElement(Paper, {
    elevation: 3,
    style: {
      position: 'relative',
      borderRadius: '42px',
      padding: isMobile ? '20px' : '40px',
      boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
      backgroundColor: '#f5f5f5',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      width: isMobile ? '95%' : '95%',
      maxHeight: isMobile ? '100vh' : '100vh',
      margin: '0 auto',
    }
  }, React.createElement(Box, {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    mb: 2,
    width: "100%"
  }, React.createElement(Typography, {
    variant: "h4",
    component: "div",
    fontFamily: "Virgil",
    style: {
      fontSize: isMobile ? 'min(6vw, 6vh)' : 'min(5vw, 5vh)',
    },
    textAlign: "center"
  }, "Leaderboard")), React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
      gap: isMobile ? '20px' : '20px',
    }
  }, React.createElement("canvas", {
    ref: tableCanvasRef,
    style: { marginLeft: '0%', width: isMobile ? '100%' : '50%', height: isMobile ? '60vh' : 'auto' }
  }), !isMobile && React.createElement("div", {
    style: {
      width: '50%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-start',
      alignItems: 'center',
      gap: '5px',
    }
  }, graphTypes.map((graphType) => React.createElement("div", { key: graphType }, renderGraph(graphType, getGraphData(graphType)))))), React.createElement("button", {
    onClick: onClose,
    type: "button",
    className: "inline-flex items-center px-4 py-2 font-bold leading-6 shadow rounded-full text-white bg-gray-400 hover:bg-gray-300 transition ease-in-out duration-150",
    style: {
      position: 'absolute',
      bottom: '5px',
      right: '5px',
      fontSize: 'min(2vw, 2vh)',
    }
  }, "Close")));
};

export default Leaderboard;