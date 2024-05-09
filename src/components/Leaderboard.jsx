// Leaderboard.js
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Typography, Box, IconButton, Paper } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import Rough from 'roughjs/bundled/rough.esm';
import { Bar, BarH, Line, Scatter } from 'react-roughviz';

const Leaderboard = ({
  initialTableData,
  graphData = {},
  colNames = [],
  tableStyleOptions = {},
  chartOptions = {},
  onClose,
}) => {
  const [tableData, setTableData] = useState(initialTableData || []);
  const tableCanvasRef = useRef(null);

  const resizeCanvas = (canvas, width, height) => {
    canvas.width = width;
    canvas.height = height;
  };

  const drawTable = (width, height) => {
    if (tableCanvasRef.current) {
      const tableCanvas = tableCanvasRef.current;
      resizeCanvas(tableCanvas, width, height);
      const tableCtx = tableCanvas.getContext('2d');
      tableCtx.clearRect(0, 0, tableCanvas.width, tableCanvas.height);
      const tableRoughCanvas = Rough.canvas(tableCanvas);

      const numRows = tableData.length;
      const numCols = tableData[0]?.length || 0;

      const cellWidth = Math.floor(width / Math.max(numCols, 1)) - 2;
      const cellHeight = Math.floor(height / (numRows + 1)) - 2;
      const headerFontSize = Math.floor(cellHeight * 0.35);
      const cellFontSize = Math.floor(cellHeight * 0.3);
      const headerColors = tableStyleOptions.headerColors || ['#fbb4ae', '#b3cde3', '#ccebc5', '#decbe4', '#fed9a6', '#ffffcc', '#e5d8bd', '#fddaec', '#f2f2f2'];
      const cellColor = tableStyleOptions.cellColor || '#FFFFFF';

      // Draw header cells
      colNames.forEach((header, index) => {
        const x = index * cellWidth;
        const color = headerColors[index % headerColors.length];
        tableRoughCanvas.rectangle(x, 0, cellWidth, cellHeight, {
          fill: color,
          fillStyle: 'hachure',
          fillWeight: 10,
          hachureAngle: 30,
          roughness: 3,
          bowing: 1,
          stroke: 'grey',
          strokeWidth: 3,
        });
        tableCtx.font = `${headerFontSize}px Virgil`;
        tableCtx.fillStyle = 'grey';
        tableCtx.textAlign = 'center';
        tableCtx.textBaseline = 'middle';
        tableCtx.imageSmoothingEnabled = true;
        tableCtx.fillText(header, x + cellWidth / 2, cellHeight / 2);
      });

      // Draw data cells
      tableData.forEach((row, rowIndex) => {
        row.forEach((cell, columnIndex) => {
          const x = columnIndex * cellWidth;
          const y = (rowIndex + 1) * cellHeight;
          tableRoughCanvas.rectangle(x, y, cellWidth, cellHeight, {
            fill: cellColor,
            fillStyle: 'solid',
            roughness: 2,
            bowing: 1,
            stroke: 'grey',
            strokeWidth: 2,
          });
          tableCtx.font = `${cellFontSize}px Virgil`;
          tableCtx.fillStyle = 'grey';
          tableCtx.textAlign = 'center';
          tableCtx.textBaseline = 'middle';
          tableCtx.fillText(cell.toString(), x + cellWidth / 2, y + cellHeight / 2);
        });
      });
    }
  };

  useEffect(() => {
    const handleResize = () => {
      const tableWidth = Math.floor(window.innerWidth * 0.65); // Slightly bigger width (65% of screen width)
      const tableHeight = Math.floor(window.innerHeight * 0.5); // Double the height (50% of screen height)
      drawTable(tableWidth, tableHeight);
    };

    handleResize(); // Initial draw
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [tableData, tableStyleOptions]);

  const handleRefresh = () => {
    setTableData(initialTableData || []);
  };

  const renderGraph = (graphType, [labels, values]) => {
    const formattedData = {
      labels,
      values,
    };

    const defaultChartOptions = {
      roughness: 2,
      fillStyle: 'hachure',
      fillWeight: 3,
      stroke: 'grey',
      strokeWidth: 1,
      title: 'Model Performance',
    };

    const graphOptions = {
      ...defaultChartOptions,
      ...(chartOptions[graphType] || {}),
    };

    const commonProps = {
      data: formattedData,
      labels: 'labels',
      values: 'values',
      ...graphOptions,
      width: Math.floor(window.innerWidth * 0.3), // Slightly bigger width (35% of screen width)
      height: Math.floor(window.innerHeight * 0.3), // Significantly bigger height (35% of screen height)
      font: 'Virgil',
      style: { marginRight: '0%' },
    };

    switch (graphType) {
      case 'bar':
        return <Bar {...commonProps} color="#cbd5e8" />;
      case 'barh':
        return <BarH {...commonProps} color="#ccebc5" />;
      case 'line':
        const lineData = values.map((value, index) => ({ x: index + 1, y: value }));
        return <Line {...commonProps} data={lineData} colors={['#f4cae4', '#e6f5c9']} />;
      case 'scatter':
        return <Scatter {...commonProps} radius={10} color="#fff2ae" />;
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.3 }}
      className='fixed top-0 left-0 w-full h-full flex justify-center items-center bg-white z-50'
    >
      <Paper
        elevation={3}
        style={{
          borderRadius: '42px',
          padding: '40px',
          boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
          backgroundColor: '#f5f5f5',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '85%', // Slightly bigger width (85% of screen width)
          maxHeight: '85vh',
          margin: '0 auto',
        }}
      >
        <Box display='flex' justifyContent='center' alignItems='center' mb={4} width='100%'>
          <Typography variant='h4' component='div' fontFamily='Virgil' textAlign='center'>
            Leaderboard
          </Typography>
          <IconButton onClick={handleRefresh}>
            <RefreshIcon />
          </IconButton>
        </Box>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <canvas ref={tableCanvasRef} style={{ marginLeft: '0%', width: '50%' }} />
          <div style={{ width: '45%' }}>
            {Object.entries(graphData).map(([graphType, data]) => (
              <div key={graphType} style={{ marginBottom: '10px' }}>{renderGraph(graphType, data)}</div>
            ))}
          </div>
        </div>
        <Box display='flex' justifyContent='flex-end' mt={4}>
          <button
            onClick={onClose}
            type='button'
            className='inline-flex items-center px-6 py-3 font-bold leading-6 shadow rounded-full text-white bg-gray-400 hover:bg-gray-300 transition ease-in-out duration-150'
          >
            Close
          </button>
        </Box>
      </Paper>
    </motion.div>
  );
};

export default Leaderboard;