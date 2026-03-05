import React, { useMemo, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import zoomPlugin from 'chartjs-plugin-zoom';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  zoomPlugin
);

const platformColors = {
  codeforces: '#3b82f6',
  codechef:   '#8b5cf6',
  atcoder:    '#ef4444',
  leetcode:   '#5a9570',
};

const platformNames = {
  codeforces: 'Codeforces',
  codechef:   'CodeChef',
  atcoder:    'AtCoder',
  leetcode:   'LeetCode',
};

const RatingChart = ({ platformProfiles }) => {
  const chartRef = useRef(null);

  // Only show platforms that exist in data
  const availablePlatforms = useMemo(() => {
    const plats = new Set();
    platformProfiles.forEach(p => {
      if (p.platform in platformColors) plats.add(p.platform);
    });
    return Array.from(plats);
  }, [platformProfiles]);

  const [selectedPlatforms, setSelectedPlatforms] = React.useState(() => {
    const init = {};
    availablePlatforms.forEach(p => { init[p] = true; });
    return init;
  });

  const togglePlatform = (platform) => {
    setSelectedPlatforms(prev => ({
      ...prev,
      [platform]: !prev[platform],
    }));
  };

  const anySelected = Object.values(selectedPlatforms).some(Boolean);

  // Prepare chart data
  const chartData = useMemo(() => {
    const datasets = [];

    platformProfiles.forEach(profile => {
      const plat = profile.platform;
      if (!selectedPlatforms[plat] || !(plat in platformColors)) return;

      const history = (profile.rating_history || [])
        .map(item => ({
          x: new Date(item.date || item.datetime || item.EndTime || item.end_date),
          y: Number(item.rating || item.NewRating || 0),
          contest: item.contest_name || item.ContestName || item.name || 'Unknown',
        }))
        .filter(d => !isNaN(d.x.getTime()) && d.y > 0);

      if (history.length > 0) {
        datasets.push({
          label: platformNames[plat],
          data: history,
          borderColor: platformColors[plat],
          backgroundColor: platformColors[plat] + '33', // light fill
          tension: 0.3,
          pointRadius: 3,
          pointHoverRadius: 7,
          borderWidth: 2,
        });
      }
    });

    return { datasets };
  }, [platformProfiles, selectedPlatforms]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'nearest',
 intersect: true,
    },
    plugins: {
      legend: { display: false }, // we use custom toggles
      tooltip: {
        callbacks: {
          label: (context) => {
            const d = context.raw;
            return [
              `${context.dataset.label}: ${d.y}`,
              d.contest,
              d.x.toLocaleDateString(),
            ];
          },
        },
      },
      zoom: {
        zoom: {
          wheel: {
            enabled: true,
            speed: 0.1,           // very responsive
          },
          pinch: {
            enabled: true,
          },
          mode: 'xy',
        },
        pan: {
          enabled: true,
          mode: 'xy',
        },
        limits: {
          x: { min: 'original', max: 'original' },
          y: { min: 0, max: 'original' },
        },
      },
    },
    scales: {
      x: {
  type: 'time',
  time: {
    unit: 'month',
    displayFormats: {
      month: 'MMM yyyy',
    },
  },
  ticks: {
    autoSkip: true,
    maxTicksLimit: 6,   // 👈 shows only ~6 months
  },
  title: { display: true, text: 'Date' },
},

      y: {
        title: { display: true, text: 'Rating' },
        min: 0,
      },
    },
  }), []);

  if (!platformProfiles?.length) {
    return (
      <div className="flex items-center justify-center h-64 bg-white rounded-lg border border-gray-200">
        <p className="text-gray-500">No rating data available</p>
      </div>
    );
  }

  return (
   <div className="relative w-full p-4 pt-10 h-[420px]">
      {/* Custom platform toggles */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex flex-wrap justify-center gap-4">

        {Object.keys(platformColors).map(platform => {
          const hasData = platformProfiles.some(p => p.platform === platform);
          if (!hasData) return null;

          return (
            <div
              key={platform}
              className="flex items-center gap-1 cursor-pointer select-none"
              onClick={() => togglePlatform(platform)}
            >
              <div
                className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-all ${
                  selectedPlatforms[platform] ? 'border-transparent' : 'border-gray-300'
                }`}
                style={{
                  backgroundColor: selectedPlatforms[platform] ? platformColors[platform] : 'white',
                }}
              >
                {selectedPlatforms[platform] && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span
                className="text-xs font-medium"
                style={{ color: selectedPlatforms[platform] ? platformColors[platform] : '#9ca3af' }}
              >
                {platformNames[platform]}
              </span>
            </div>
          );
        })}
      </div>

      
      {anySelected && chartData.datasets.length > 0 ? (
        <Line
          ref={chartRef}
          data={chartData}
          options={options}
          height={360}
        />
      ) : (
        <div className="h-full flex items-center justify-center text-gray-500">
          {anySelected ? 'No rating history available' : 'Select at least one platform'}
        </div>
      )}
    </div>
  );
};

export default RatingChart;