// import necessary dependencies for the component
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Typography, Box, IconButton, Paper } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import Rough from 'roughjs/bundled/rough.esm';
import { Bar, BarH, Line, Scatter } from 'react-roughviz';
import { mobileTabletCheck } from '../utils';

// define the leaderboard component
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
  // ref to store the table canvas element
  const tableCanvasRef = useRef(null);
  // check if the device is mobile or tablet
  const isMobile = mobileTabletCheck();

  // memoized table dimensions calculation to avoid recalculating on every render
  const [tableWidth, tableHeight] = useMemo(() => {
    const width = isMobile ? Math.floor(window.innerWidth * 0.7) : Math.floor(window.innerWidth * 0.4);
    const height = isMobile ? Math.floor(window.innerHeight * 0.6) : Math.floor(window.innerHeight * 0.65);
    return [width, height];
  }, [isMobile]);

  // function to resize the canvas
  const resizeCanvas = (canvas, width, height) => {
    // set canvas dimensions
    canvas.width = width;
    canvas.height = height;
  };

  // function to draw the table on the canvas
  const drawTable = useCallback(
    (width, height) => {
      // check if table canvas ref exists
      if (tableCanvasRef.current) {
        const tableCanvas = tableCanvasRef.current;
        // resize the table canvas
        resizeCanvas(tableCanvas, width, height);
        const tableCtx = tableCanvas.getContext('2d');
        // clear the table canvas
        tableCtx.clearRect(0, 0, tableCanvas.width, tableCanvas.height);
        // create a rough canvas for the table
        const roughCanvas = Rough.canvas(tableCanvas);

        // get number of rows and columns in the table data
        const numRows = tableData.length;
        const numCols = tableData[0]?.length || 0;

        // calculate cell dimensions
        const cellWidth = Math.floor(width / Math.max(numCols, 1)) - 2;
        const cellHeight = Math.floor(height / (numRows + 1)) - 2;

        // calculate font sizes
        const headerFontSize = `${Math.min(Math.floor(cellHeight * 0.035), Math.floor(cellWidth * 0.035))}vmin`;
        const cellFontSize = `${Math.min(Math.floor(cellHeight * 0.035), Math.floor(cellWidth * 0.035))}vmin`;

        // get header colors from style options or use defaults
        const headerColors = tableStyleOptions.headerColors || ['#fbb4ae', '#b3cde3', '#ccebc5', '#decbe4', '#fed9a6', '#ffffcc', '#e5d8bd', '#fddaec', '#f2f2f2'];
        // get cell color from style options or use default
        const cellColor = tableStyleOptions.cellColor || '#FFFFFF';

        // draw header cells
        colNames.forEach((header, index) => {
          const x = index * cellWidth;
          const color = headerColors[index % headerColors.length];
          // draw a rough rectangle for the header cell
          roughCanvas.rectangle(x, 0, cellWidth, cellHeight, {
            fill: color,
            fillStyle: 'hachure',
            fillWeight: 10,
            hachureAngle: 30,
            roughness: 3,
            bowing: 1,
            stroke: 'grey',
            strokeWidth: 3,
          });
          // set font and color for header text
          tableCtx.font = `${headerFontSize} Virgil`;
          tableCtx.fillStyle = 'grey';
          // set text alignment and baseline for header text
          tableCtx.textAlign = 'center';
          tableCtx.textBaseline = 'middle';
          // fill header text in the cell
          tableCtx.fillText(header, x + cellWidth / 2, cellHeight / 2);
        });

        // draw data cells
        tableData.forEach((row, rowIndex) => {
          row.forEach((cell, columnIndex) => {
            const x = columnIndex * cellWidth;
            const y = (rowIndex + 1) * cellHeight;
            // draw a rough rectangle for the data cell
            roughCanvas.rectangle(x, y, cellWidth, cellHeight, {
              fill: cellColor,
              fillStyle: 'solid',
              roughness: 2,
              bowing: 1,
              stroke: 'grey',
              strokeWidth: 2,
            });
            // set font and color for cell text
            tableCtx.font = `${cellFontSize} Virgil`;
            tableCtx.fillStyle = 'grey';
            // set text alignment and baseline for cell text
            tableCtx.textAlign = 'center';
            tableCtx.textBaseline = 'middle';
            // fill cell text in the cell
            tableCtx.fillText(cell.toString(), x + cellWidth / 2, y + cellHeight / 2);
          });
        });
      }
    },
    [tableData, colNames, tableStyleOptions]
  );

  // use effect to handle window resize and redraw the table
  useEffect(() => {
    // function to handle window resize
    const handleResize = () => {
      // redraw the table with new dimensions
      drawTable(tableWidth, tableHeight);
    };

    handleResize(); // initial draw
    window.addEventListener('resize', handleResize); // add resize event listener
    return () => window.removeEventListener('resize', handleResize); // cleanup resize event listener
  }, [drawTable, tableWidth, tableHeight]);

  // function to handle refresh button click
  const handleRefresh = useCallback(() => {
    // reset table data to initial data
    setTableData(initialTableData || []);
  }, [initialTableData]);

  // function to render graphs based on graph type
  const renderGraph = useCallback(
    (graphType, [labels, values]) => {
      // format data for the graph
      const formattedData = {
        labels,
        values,
      };

      // default chart options
      const defaultChartOptions = {
        roughness: 2,
        fillStyle: 'hachure',
        fillWeight: 3,
        stroke: 'grey',
        strokeWidth: 1,
        title: 'model performance',
        fontSize: 'min(2vw, 2vh)',
        titleFontSize: 'min(3vw, 3vh)',
      };

      // merge default chart options with user-provided options
      const graphOptions = {
        ...defaultChartOptions,
        ...(chartOptions[graphType] || {}),
      };

      // common props for all graph types
      const commonProps = {
        data: formattedData,
        labels: 'labels',
        values: 'values',
        ...graphOptions,
        width: isMobile ? Math.floor(window.innerWidth * 0.9) : Math.floor(window.innerWidth * 0.35),
        height: isMobile ? Math.floor(window.innerHeight * 0.5 / numGraphs) : Math.floor(window.innerHeight * 0.7 / numGraphs),
        font: 'Virgil',
        style: { marginBottom: '20px' },
      };

      // render different graph types based on graphType
      switch (graphType) {
        case 'bar':
          return <Bar {...commonProps} color="#cbd5e8" />;
        case 'barh':
          return <BarH {...commonProps} color="#ccebc5" />;
        case 'barh2':
          return <BarH {...commonProps} color="#ccebc5" />;
        case 'line':
          const lineData = values.map((value, index) => ({ x: index + 1, y: value }));
          return <Line {...commonProps} data={lineData} colors={['#f4cae4', '#e6f5c9']} />;
        case 'scatter':
          return <Scatter {...commonProps} radius={10} color="#fff2ae" />;
        default:
          return null;
      }
    },
    [isMobile, numGraphs, chartOptions]
  );

  // render the leaderboard component
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.3 }}
      className="fixed top-0 left-0 w-full h-full flex justify-center items-center bg-white z-50"
    >
      <Paper
        elevation={3}
        style={{
          position: 'relative', // allow absolute positioning of children
          borderRadius: '42px',
          padding: isMobile ? '20px' : '40px', // padding based on device type
          boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
          backgroundColor: '#f5f5f5',
          display: 'flex', // arrange children in a flex layout
          flexDirection: 'column',
          alignItems: 'center',
          width: isMobile ? '90%' : '85%', // adjust width based on device type
          maxHeight: isMobile ? '90vh' : '85vh', // adjust max height
          margin: '0 auto', // center horizontally
        }}
      >
        {/* header box containing title and refresh button */}
        <Box
          display="flex" // arrange children horizontally
          justifyContent="center" // center horizontally
          alignItems="center" // align vertically
          mb={2} // margin-bottom for spacing
          width="100%"
        >
          <Typography
            variant="h4"
            component="div"
            fontFamily="Virgil" // handwritten feel
            style={{
              fontSize: isMobile ? 'min(6vw, 6vh)' : 'min(5vw, 5vh)',
            }}
            textAlign="center"
          >
            Leaderboard
          </Typography>
          {/* refresh button */}
          <IconButton onClick={handleRefresh}>
            <RefreshIcon />
          </IconButton>
        </Box>

        {/* content section containing table and graphs */}
        <div
          style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row', // stack vertically for mobile
            justifyContent: 'space-between', // distribute space evenly
            alignItems: 'center',
            width: '100%',
            gap: isMobile ? '20px' : '20px', // gap between table and graphs
          }}
        >
          {/* canvas for the table */}
          <canvas
            ref={tableCanvasRef}
            style={{ marginLeft: '0%', width: isMobile ? '100%' : '50%' }}
          />

          {/* graph section, hidden on mobile */}
          {!isMobile && (
            <div
              style={{
                width: '50%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-start',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              {Object.entries(graphData).map(([graphType, data]) => (
                <div key={graphType}>{renderGraph(graphType, data)}</div>
              ))}
            </div>
          )}
        </div>

        {/* close button */}
        <button
          onClick={onClose}
          type="button"
          className="inline-flex items-center px-4 py-2 font-bold leading-6 shadow rounded-full text-white bg-gray-400 hover:bg-gray-300 transition ease-in-out duration-150"
          style={{
            position: 'absolute', // position button within the main container
            bottom: isMobile ? '10px' : '20px', // adjust positioning based on device type
            right: isMobile ? '10px' : '20px',
            fontSize: isMobile ? 'min(2vw, 2vh)' : 'min(2vw, 2vh)',
          }}
        >
          Close
        </button>
      </Paper>
    </motion.div>
  );
};

// export the leaderboard component
export default Leaderboard;