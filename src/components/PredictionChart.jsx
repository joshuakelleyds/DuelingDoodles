import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

const PredictionChart = ({ output1 }) => {
  const chartRef = useRef(null);
  console.log(output1);

  useEffect(() => {
    let chart = null;

    const updateChart = (labels, probabilities) => {
      const ctx = chartRef.current.getContext('2d');

      if (chart) {
        chart.data.labels = labels;
        chart.data.datasets[0].data = probabilities;
        chart.update();
      } else {
        chart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: labels,
            datasets: [{
              label: 'Probabilities',
              data: probabilities,
              borderColor: 'rgba(75, 192, 192, 1)',
              backgroundColor: 'rgba(75, 192, 192, 0.2)',
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            scales: {
              y: {
                beginAtZero: true,
                max: 1
              }
            }
          }
        });
      }
    };

    if (output1) {
      const labels = output1.map((item) => item.label);
      const probabilities = output1.map((item) => item.score);
      updateChart(labels, probabilities);
    }

    return () => {
      if (chart) {
        chart.destroy();
      }
    };
  }, [output1]);

  return <canvas ref={chartRef} width="500" height="500"></canvas>;
};

export default PredictionChart;