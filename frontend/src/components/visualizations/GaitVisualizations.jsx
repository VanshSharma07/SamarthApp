import React, { useCallback } from 'react';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import {
  Line,
  Scatter,
  Bar,
  Radar
} from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  RadialLinearScale,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import zoomPlugin from 'chartjs-plugin-zoom';
import { Download as DownloadIcon, Refresh as RefreshIcon } from '@mui/icons-material';

// Register the plugins
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  RadialLinearScale,
  BarElement,
  Title,
  ChartTooltip,
  Legend,
  Filler,
  annotationPlugin,
  zoomPlugin
);

// Animation configurations
const ANIMATION_OPTIONS = {
  duration: 1000,
  easing: 'easeInOutQuart',
  mode: 'progressive'
};

// Helper function for chart export
const exportChart = (chartRef, filename) => {
  if (chartRef.current) {
    const url = chartRef.current.toBase64Image();
    const link = document.createElement('a');
    link.download = `${filename}-${new Date().toISOString()}.png`;
    link.href = url;
    link.click();
  }
};

// Wrapper component for chart controls
const ChartControls = ({ onExport, onResetZoom }) => (
  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mb: 1 }}>
    <Tooltip title="Export as PNG">
      <IconButton onClick={onExport} size="small">
        <DownloadIcon />
      </IconButton>
    </Tooltip>
    <Tooltip title="Reset Zoom">
      <IconButton onClick={onResetZoom} size="small">
        <RefreshIcon />
      </IconButton>
    </Tooltip>
  </Box>
);

export const GaitPhaseChart = ({ data, baselineData }) => {
  const chartRef = React.useRef(null);

  const handleExport = useCallback(() => {
    exportChart(chartRef, 'gait-phase');
  }, []);

  const handleResetZoom = useCallback(() => {
    if (chartRef.current) {
      chartRef.current.resetZoom();
    }
  }, []);

  // Ensure data is an array
  const dataArray = Array.isArray(data) ? data : [data].filter(Boolean);

  // Format data for scatter plot
  const formattedData = dataArray.map(point => ({
    x: point.x || 0,
    y: point.y || 0
  }));

  const formattedBaselineData = baselineData ? 
    (Array.isArray(baselineData) ? baselineData : [baselineData])
      .map(point => ({
        x: point.x || 0,
        y: point.y || 0
      })) : [];

  const options = {
    responsive: true,
    animation: {
      duration: 0 // Disable animation for real-time updates
    },
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Gait Phase Analysis'
      },
      zoom: {
        zoom: {
          wheel: { enabled: true },
          pinch: { enabled: true },
          mode: 'xy'
        },
        pan: { enabled: true, mode: 'xy' }
      }
    },
    scales: {
      x: {
        type: 'linear',
        position: 'bottom',
        title: {
          display: true,
          text: 'Horizontal Movement'
        },
        min: -1,
        max: 1
      },
      y: {
        type: 'linear',
        position: 'left',
        title: {
          display: true,
          text: 'Vertical Movement'
        },
        min: -1,
        max: 1
      }
    }
  };

  const chartData = {
    datasets: [
      {
        label: 'Current Movement',
        data: formattedData,
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        borderColor: 'rgba(53, 162, 235, 1)',
        showLine: true,
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: false,
        tension: 0.4
      },
      {
        label: 'Baseline',
        data: formattedBaselineData,
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgba(75, 192, 192, 1)',
        showLine: true,
        pointRadius: 3,
        pointHoverRadius: 5,
        fill: false,
        tension: 0.4
      }
    ]
  };

  return (
    <Box sx={{ height: '300px', position: 'relative' }}>
      <ChartControls onExport={handleExport} onResetZoom={handleResetZoom} />
      <Scatter ref={chartRef} data={chartData} options={options} />
    </Box>
  );
};

export const StabilityHeatmap = ({ data }) => {
  const chartRef = React.useRef(null);
  
  const handleExport = useCallback(() => {
    exportChart(chartRef, 'stability-heatmap');
  }, []);

  // Validate data structure
  if (!data?.stabilityTrends?.timeSeriesData) {
    return (
      <Box sx={{ p: 2, textAlign: 'center', border: '1px solid #eee', borderRadius: 1 }}>
        <Typography>No stability data available</Typography>
      </Box>
    );
  }

  const timeSeriesData = data.stabilityTrends.timeSeriesData;

  const options = {
    responsive: true,
    animation: ANIMATION_OPTIONS,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Stability Analysis Over Time'
      },
      tooltip: {
        mode: 'index',
        intersect: false
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        title: {
          display: true,
          text: 'Score'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Time'
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45
        }
      }
    }
  };

  const chartData = {
    labels: timeSeriesData.map(d => new Date(d.timestamp).toLocaleTimeString()),
    datasets: [
      {
        label: 'Stability Score',
        data: timeSeriesData.map(d => d.stability),
        fill: true,
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1
      },
      {
        label: 'Lateral Sway',
        data: timeSeriesData.map(d => d.lateralSway),
        fill: false,
        borderColor: 'rgb(255, 99, 132)',
        tension: 0.1,
        hidden: true
      },
      {
        label: 'Vertical Sway',
        data: timeSeriesData.map(d => d.verticalSway),
        fill: false,
        borderColor: 'rgb(54, 162, 235)',
        tension: 0.1,
        hidden: true
      }
    ]
  };

  return (
    <Box sx={{ p: 2, height: '400px', border: '1px solid #eee', borderRadius: 1 }}>
      <ChartControls onExport={handleExport} />
      <Line ref={chartRef} data={chartData} options={options} />
    </Box>
  );
};

export const SymmetryRadar = ({ currentData, baselineData }) => {
  const chartRef = React.useRef(null);

  const handleExport = useCallback(() => {
    exportChart(chartRef, 'gait-symmetry');
  }, []);

  const options = {
    responsive: true,
    animation: {
      ...ANIMATION_OPTIONS,
      onProgress: (animation) => {
        const chart = animation.chart;
        const ctx = chart.ctx;
        ctx.save();
        ctx.globalAlpha = animation.currentStep / animation.numSteps;
        chart.draw();
        ctx.restore();
      }
    },
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Gait Symmetry Analysis'
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || '';
            const value = context.raw.toFixed(1);
            return `${label}: ${value}%`;
          }
        }
      }
    },
    scales: {
      r: {
        min: 0,
        max: 100,
        beginAtZero: true,
        angleLines: {
          display: true,
          color: 'rgba(0, 0, 0, 0.1)'
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          stepSize: 20,
          callback: (value) => `${value}%`
        },
        pointLabels: {
          font: {
            size: 12
          }
        }
      }
    }
  };

  const chartData = {
    labels: [
      'Step Length',
      'Step Time',
      'Hip Angle',
      'Knee Angle',
      'Ankle Angle',
      'Ground Force'
    ],
    datasets: [
      {
        label: 'Current',
        data: currentData,
        backgroundColor: 'rgba(53, 162, 235, 0.2)',
        borderColor: 'rgba(53, 162, 235, 1)',
        borderWidth: 1
      },
      {
        label: 'Baseline',
        data: baselineData,
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1
      }
    ]
  };

  return (
    <Box>
      <ChartControls onExport={handleExport} />
      <Radar ref={chartRef} data={chartData} options={options} />
    </Box>
  );
};

export const JointAnglesTimeline = ({ data }) => {
  const chartRef = React.useRef(null);

  const handleExport = useCallback(() => {
    exportChart(chartRef, 'joint-angles');
  }, []);

  const handleResetZoom = useCallback(() => {
    if (chartRef.current) {
      chartRef.current.resetZoom();
    }
  }, []);

  // Validate data structure
  if (!data || !data.timestamps || !data.hipAngles || !data.kneeAngles || !data.ankleAngles) {
    return (
      <Box sx={{ p: 2, textAlign: 'center', border: '1px solid #eee', borderRadius: 1 }}>
        <Typography>No joint angle data available</Typography>
      </Box>
    );
  }

  // Ensure all arrays have data
  if (data.timestamps.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center', border: '1px solid #eee', borderRadius: 1 }}>
        <Typography>No measurements recorded yet</Typography>
      </Box>
    );
  }

  const options = {
    responsive: true,
    animation: {
      ...ANIMATION_OPTIONS,
      delay(ctx) {
        return ctx.dataIndex * 10;
      }
    },
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Joint Angles Over Gait Cycle'
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: (context) => {
            return `${context.dataset.label}: ${context.raw.toFixed(1)}°`;
          }
        }
      },
      zoom: {
        zoom: {
          wheel: { enabled: true },
          pinch: { enabled: true },
          mode: 'x'
        },
        pan: { enabled: true, mode: 'x' }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Gait Cycle (%)'
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      },
      y: {
        title: {
          display: true,
          text: 'Angle (degrees)'
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      }
    },
    interaction: {
      mode: 'index',
      intersect: false
    }
  };

  const chartData = {
    labels: data.timestamps.map(t => (t * 100).toFixed(0) + '%'),
    datasets: [
      {
        label: 'Hip',
        data: data.hipAngles,
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'Knee',
        data: data.kneeAngles,
        borderColor: 'rgba(54, 162, 235, 1)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'Ankle',
        data: data.ankleAngles,
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  return (
    <Box sx={{ p: 2, height: '400px', border: '1px solid #eee', borderRadius: 1 }}>
      <ChartControls onExport={handleExport} onResetZoom={handleResetZoom} />
      <Line ref={chartRef} data={chartData} options={options} />
    </Box>
  );
};

export const LiveSensorValues = ({ sensorData }) => {
  // Assuming sensorData is an object with keys as sensor names and values as their current readings
  return (
    <Box sx={{ p: 2, border: '1px solid #eee', borderRadius: 1, mb: 2 }}>
      <Typography variant="h6" gutterBottom>Live Sensor Values</Typography>
      {Object.entries(sensorData).length === 0 ? (
        <Typography>No sensor data available</Typography>
      ) : (
        Object.entries(sensorData).map(([sensor, value]) => (
          <Box key={sensor} sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
            <Typography variant="body1">{sensor}</Typography>
            <Typography variant="body1" sx={{ fontWeight: 'medium' }}>{value}</Typography>
          </Box>
        ))
      )}
    </Box>
  );
};