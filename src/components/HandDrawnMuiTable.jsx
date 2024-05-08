// HandDrawnMuiTable.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { styled } from '@mui/system';

const HandDrawnTableContainer = styled(TableContainer)({
  borderRadius: '16px',
  overflow: 'hidden',
  backgroundColor: '#cccccc',
});

const HandDrawnTablePaper = styled(Paper)({
  backgroundColor: '#cccccc',
});

const HandDrawnTableCell = styled(TableCell, { shouldForwardProp: (prop) => prop !== 'isLastRow' && prop !== 'isLastColumn' })(
  ({ isLastRow, isLastColumn }) => ({
    fontFamily: 'Virgil',
    fontSize: '20px',
    color: '#000000',
    borderRight: isLastColumn ? 'none' : '2px solid black',
    borderBottom: isLastRow ? 'none' : '2px solid black',
    '&:first-child': {
      borderLeft: 'none',
    },
  })
);

const HandDrawnMuiTable = ({ onClose }) => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const generateRandomData = () => {
      const rows = Math.floor(Math.random() * 5) + 1;
      const columns = Math.floor(Math.random() * 5) + 1;
      return Array(rows)
        .fill()
        .map(() =>
          Array(columns)
            .fill()
            .map(() => Math.floor(Math.random() * 100))
        );
    };

    const interval = setInterval(() => {
      const newData = generateRandomData();
      setData(newData);
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed top-0 left-0 w-full h-full flex justify-center items-center bg-white z-50"
    >
      <div className="p-8">
        <HandDrawnTableContainer component={HandDrawnTablePaper} elevation={0}>
          <Table>
            <TableHead>
              <TableRow>
                {data[0]?.map((_, index, array) => (
                  <HandDrawnTableCell key={index} isLastColumn={index === array.length - 1}>
                    Column {index + 1}
                  </HandDrawnTableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((row, rowIndex, rowArray) => (
                <TableRow key={rowIndex}>
                  {row.map((cell, cellIndex, cellArray) => (
                    <HandDrawnTableCell
                      key={cellIndex}
                      isLastColumn={cellIndex === cellArray.length - 1}
                      isLastRow={rowIndex === rowArray.length - 1}
                    >
                      {cell}
                    </HandDrawnTableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </HandDrawnTableContainer>
        <button
          onClick={onClose}
          type="button"
          className="mt-4 inline-flex items-center px-4 py-2 font-semibold leading-6 shadow rounded-md text-white bg-orange-300 hover:bg-orange-200 transition ease-in-out duration-150"
        >
          Close
        </button>
      </div>
    </motion.div>
  );
};

export default HandDrawnMuiTable;