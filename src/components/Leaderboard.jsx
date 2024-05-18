import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Typography, Box, IconButton, Paper } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import Rough from 'roughjs/bundled/rough.esm';
import { Bar, BarH, Line, Scatter, Pie } from 'react-roughviz';
import { mobileTabletCheck } from '../utils';

const Leaderboard = ({
  initialTableData,
  graphData = {},
  colNames = [],
  tableStyleOptions = {},
  chartOptions = {},
  onClose,
  numGraphs,
}) => {
  // state to store the table data
  const [tableData, setTableData] = useState(initialTableData || []);
  // ref to store the canvas element for the table
  const tableCanvasRef = useRef(null);
  // check if the device is mobile or tablet
  const isMobile = mobileTabletCheck();
  // get the device pixel ratio for high-resolution rendering
  const dpr = window.devicePixelRatio || 1;

  // calculate the table dimensions based on the device type
  const [tableWidth, tableHeight] = useMemo(() => {
    const width = isMobile ? Math.min(window.innerWidth * 0.9, 500) : Math.floor(window.innerWidth * 0.6);
    const height = isMobile ? Math.min(window.innerHeight * 0.5, 300) : Math.floor(window.innerHeight * 0.65);
    return [width, height];
  }, [isMobile]);

  // resize the canvas based on the table data and device type
  const resizeCanvas = useCallback((canvas, columnWidths) => {
    const totalWidth = columnWidths.reduce((sum, width) => sum + width, 0);
    const numRows = tableData.length;
    const cellHeight = Math.floor(tableHeight / (numRows + 1)) + 5;
    const totalHeight = (numRows + 1) * cellHeight;

    if (isMobile) {
      canvas.width = totalWidth * dpr;
      canvas.height = totalHeight * dpr;
      canvas.style.width = `${Math.min(totalWidth, tableWidth)}px`;
      canvas.style.height = `${Math.min(totalHeight, tableHeight)}px`;
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
    } else {
      canvas.width = totalWidth;
      canvas.height = totalHeight;
    }
  }, [tableData, tableHeight, tableWidth, isMobile, dpr]);

  // calculate the column widths based on the table data
  const calculateColumnWidths = useCallback((ctx) => {
    const numCols = tableData[0]?.length || 0;
    const maxWidths = Array(numCols).fill(0);

    // find the maximum width for each column based on cell content
    tableData.forEach((row) => {
      row.forEach((cell, columnIndex) => {
        let cellWidth = ctx.measureText(cell.toString()).width;
        if (cellWidth < 15) {
          cellWidth = 15;
        }
        maxWidths[columnIndex] = Math.max(maxWidths[columnIndex], cellWidth);
      });
    });

    // find the maximum width for each column based on column headers
    colNames.forEach((header, columnIndex) => {
      const headerWidth = ctx.measureText(header).width * 1.3;
      maxWidths[columnIndex] = Math.max(maxWidths[columnIndex], headerWidth) * 2.3;
    });

    return maxWidths;
  }, [tableData, colNames]);

  // draw the table on the canvas
  const drawTable = useCallback(() => {
    if (tableCanvasRef.current) {
      const tableCanvas = tableCanvasRef.current;
      const tableCtx = tableCanvas.getContext('2d');
      // clear the canvas
      tableCtx.clearRect(0, 0, tableCanvas.width, tableCanvas.height);
      // create a rough.js canvas for the hand-drawn effect
      const roughCanvas = Rough.canvas(tableCanvas);

      const numRows = tableData.length;

      // calculate the column widths
      const columnWidths = calculateColumnWidths(tableCtx);
      // resize the canvas based on the column widths
      resizeCanvas(tableCanvas, columnWidths);

      // calculate the cell height based on the number of rows and table height
      const cellHeight = Math.floor(tableHeight / (numRows + 1)) + 5;

      // check if the device is in landscape orientation
      const isLandscape = window.innerWidth > window.innerHeight;

      // calculate the font sizes for headers and cells based on the device type and orientation
      const headerFontSize = isMobile ? (isLandscape ? '1.5vw' : '4vw') : `${Math.min(Math.floor(cellHeight * 0.08), Math.floor(Math.min(...columnWidths) * 0.08))}vmin`;
      const cellFontSize = isMobile ? (isLandscape ? '1vw' : '3.5vw') : `${Math.min(Math.floor(cellHeight * 0.07), Math.floor(Math.min(...columnWidths) * 0.07))}vmin`;

      // define the colors for the header cells
      const headerColors = tableStyleOptions.headerColors || ['#fbb4ae', '#b3cde3', '#ccebc5', '#decbe4', '#fed9a6', '#ffffcc', '#e5d8bd', '#fddaec', '#f2f2f2'];
      // define the color for the data cells
      const cellColor = tableStyleOptions.cellColor || '#FFFFFF';

      // draw the header cells
      let currentX = 0;
      colNames.forEach((header, columnIndex) => {
        const cellWidth = columnWidths[columnIndex];
        const color = headerColors[columnIndex % headerColors.length];
        // draw the header cell rectangle with a hand-drawn effect
        roughCanvas.rectangle(currentX, 0, cellWidth, cellHeight, {
          fill: color,
          fillStyle: 'hachure',
          fillWeight: 10,
          hachureAngle: 30,
          roughness: 3,
          bowing: 1,
          stroke: 'grey',
          strokeWidth: 3,
        });
        // set the font style for the header text
        tableCtx.font = `${headerFontSize} Virgil`;
        tableCtx.fillStyle = 'grey';
        tableCtx.textAlign = 'center';
        tableCtx.textBaseline = 'middle';
        // draw the header text
        tableCtx.fillText(header, currentX + cellWidth / 2, cellHeight / 2);
        currentX += cellWidth;
      });

      // draw the data cells
      tableData.forEach((row, rowIndex) => {
        let currentX = 0;
        row.forEach((cell, columnIndex) => {
          const cellWidth = columnWidths[columnIndex];
          const y = (rowIndex + 1) * cellHeight;
          // draw the data cell rectangle with a hand-drawn effect
          roughCanvas.rectangle(currentX, y, cellWidth, cellHeight, {
            fill: cellColor,
            fillStyle: 'solid',
            roughness: 2,
            bowing: 1,
            stroke: 'grey',
            strokeWidth: 2,
          });
          // set the font style for the cell text
          tableCtx.font = `${cellFontSize} Virgil`;
          tableCtx.fillStyle = 'grey';
          tableCtx.textAlign = 'center';
          tableCtx.textBaseline = 'middle';
          // draw the cell text
          tableCtx.fillText(cell.toString(), currentX + cellWidth / 2, y + cellHeight / 2);
          currentX += cellWidth;
        });
      });
    }
  }, [tableData, colNames, tableStyleOptions, calculateColumnWidths, resizeCanvas, tableHeight, isMobile]);

  // redraw the table when the component mounts or the table data changes
  useEffect(() => {
    const handleResize = () => {
      drawTable();
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawTable]);

  // handle the refresh button click
  const handleRefresh = useCallback(() => {
    setTableData(initialTableData || []);
  }, [initialTableData]);

  // render the specified graph type
  const renderGraph = useCallback((graphType, [labels, values]) => {
    const formattedData = {
      labels,
      values,
    };
    // merge default chart options with user-provided chart options
    const graphOptions = {
      ...(chartOptions[graphType] || {}),
    };

    // define common props for all graph types
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

    // render the appropriate graph component based on the graph type
    switch (graphType) {
      case 'bar':
        return React.createElement(Bar, { ...commonProps, color: "#cbd5e8" });
      case 'barh':
        return React.createElement(BarH, { ...commonProps });
      case 'line':
        const lineData = values.map((value, index) => ({ x: index + 1, y: value }));
        return React.createElement(Line, { ...commonProps, data: lineData, colors: ['#f4cae4', '#e6f5c9'] });
      case 'scatter':
        return React.createElement(Scatter, { ...commonProps});
      case 'pie':
        return React.createElement(Pie, { ...commonProps });
      default:
        return null;
    }
  }, [isMobile, numGraphs, chartOptions]);

  // render the leaderboard component
  return React.createElement(motion.div, {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.8 },
    transition: { duration: 0.3 },
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
  }, "Leaderboard"), React.createElement(IconButton, {
    onClick: handleRefresh
  }, React.createElement(RefreshIcon, null))), React.createElement("div", {
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
    style: { marginLeft: '0%', width: isMobile ? '100%' : '50%', height: isMobile ? '50vh' : 'auto' }
  }), !isMobile && React.createElement("div", {
    style: {
      width: '50%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-start',
      alignItems: 'center',
      gap: '5px',
    }
  }, Object.entries(graphData).map(([graphType, data]) => React.createElement("div", { key: graphType }, renderGraph(graphType, data))))), React.createElement("button", {
    onClick: onClose,
    type: "button",
    className: "inline-flex items-center px-4 py-2 font-bold leading-6 shadow rounded-full text-white bg-gray-400 hover:bg-gray-300 transition ease-in-out duration-150",
    style: {
      position: 'absolute',
      bottom: isMobile ? '10px' : '20px',
      right: isMobile ? '10px' : '20px',
      fontSize: isMobile ? 'min(2vw, 2vh)' : 'min(2vw, 2vh)',
    }
  }, "Close")));
};

export default Leaderboard;