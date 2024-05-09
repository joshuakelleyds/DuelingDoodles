import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Typography, Box, IconButton, Paper } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import Rough from 'roughjs/bundled/rough.esm';

const Leaderboard = ({
  initialTableData,
  initialChartData,
  modelNames = [],
  tableStyleOptions = {},
  chartStyleOptions = {},
  onClose,
}) => {
  const [tableData, setTableData] = useState(initialTableData || []);
  const [chartData, setChartData] = useState(initialChartData || []);
  const tableCanvasRef = useRef(null);
  const chartCanvasRef = useRef(null);

  const resizeCanvas = (canvas, width, height) => {
    canvas.width = width;
    canvas.height = height;
  };

  useEffect(() => {
    const handleResize = () => {
      const tableWidth = Math.min(window.innerWidth * 0.45, 800);
      const tableHeight = Math.min(window.innerHeight * 0.35, 500);
      const chartWidth = Math.min(window.innerWidth * 0.45, 800);
      const chartHeight = Math.min(window.innerHeight * 0.35, 500);

      drawTable(tableWidth, tableHeight);
      drawChart(chartWidth, chartHeight);
    };

    handleResize(); // Initial draw
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [tableData, chartData]);

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
      const headerFontSize = Math.floor(cellHeight * 0.3);
      const cellFontSize = Math.floor(cellHeight * 0.3);
      const headerColors = tableStyleOptions.headerColors || ['#b3e2cd', '#fdcdac', '#cbd5e8', '#f4cae4', '#e6f5c9', '#fff2ae', '#f1e2cc', '#cccccc'];
      const cellColor = tableStyleOptions.cellColor || '#FFFFFF';

      // Draw header cells
      tableData[0]?.forEach((_, index) => {
        const x = index * cellWidth;
        const color = headerColors[index % headerColors.length];
        tableRoughCanvas.rectangle(x, 0, cellWidth, cellHeight, {
          fill: color,
          fillStyle: 'hachure',
          fillWeight: 10,
          hachureAngle: 30,
          roughness: 4,
          bowing: 1,
          stroke: 'grey',
          strokeWidth: 3,
        });
        tableCtx.font = `${headerFontSize}px Virgil`;
        tableCtx.fillStyle = 'grey';
        tableCtx.textAlign = 'center';
        tableCtx.textBaseline = 'middle';
        tableCtx.imageSmoothingEnabled = true;
        tableCtx.fillText(`${modelNames[index]}`, x + cellWidth / 2, cellHeight / 2);
      });

      // Draw data cells
      tableData.forEach((row, rowIndex) => {
        row.forEach((cell, columnIndex) => {
          const x = columnIndex * cellWidth;
          const y = (rowIndex + 1) * cellHeight;
          tableRoughCanvas.rectangle(x, y, cellWidth, cellHeight, {
            fill: cellColor,
            fillStyle: 'solid',
            roughness: 3,
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

  const drawChart = (width, height) => {
    if (chartCanvasRef.current) {
      const chartCanvas = chartCanvasRef.current;
      resizeCanvas(chartCanvas, width, height);
      const chartCtx = chartCanvas.getContext('2d');
      chartCtx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
      const chartRoughCanvas = Rough.canvas(chartCanvas);

      const barWidth = Math.floor(width / (chartData.length * 1.5));
      const barMargin = barWidth / 3;
      const maxBarHeight = height - 60;
      const chartX = 30;
      const chartY = 30;
      const fontSize = Math.floor(maxBarHeight * 0.1);
      const colors = chartStyleOptions.colors || ['#b3e2cd', '#fdcdac', '#cbd5e8', '#f4cae4', '#e6f5c9', '#fff2ae', '#f1e2cc', '#cccccc'];

      // Draw bar chart
      chartData.forEach((value, index) => {
        const barHeight = (value / 100) * maxBarHeight;
        const x = chartX + index * (barWidth + barMargin);
        const y = chartY + maxBarHeight - barHeight;
        const color = colors[index % colors.length];

        chartRoughCanvas.rectangle(x, y, barWidth, barHeight, {
          fill: color,
          fillStyle: 'hachure',
          fillWeight: 10,
          hachureAngle: 30,
          roughness: 4,
          bowing: 1,
          strokeWidth: 3,
          stroke: 'grey',
        });

        chartCtx.font = `${fontSize}px Virgil`;
        chartCtx.fillStyle = 'black';
        chartCtx.textAlign = 'center';
        chartCtx.fillText(value.toString(), x + barWidth / 2, y - 10);
      });
    }
  };

  const handleRefresh = () => {
    setTableData(initialTableData || []);
    setChartData(initialChartData || []);
  };

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
          borderRadius: '42px',
          padding: '40px',
          boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
          backgroundColor: '#f5f5f5',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: '100%',
          maxHeight: '100vh',
          margin: '0 auto',
        }}
      >
        <Box display="flex" justifyContent="center" alignItems="center" mb={4} width="100%">
          <Typography variant="h4" component="div" fontFamily="Virgil" textAlign="center">
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
          <canvas ref={tableCanvasRef} style={{ marginLeft: '0%' }} />
          <canvas ref={chartCanvasRef} style={{ marginRight: '0%' }} />
        </div>
        <Box display="flex" justifyContent="flex-end" mt={4}>
          <button
            onClick={onClose}
            type="button"
            className="inline-flex items-center px-6 py-3 font-bold leading-6 shadow rounded-full text-white bg-gray-400 hover:bg-gray-300 transition ease-in-out duration-150"
          >
            Close
          </button>
        </Box>
      </Paper>
    </motion.div>
  );
};

export default Leaderboard;