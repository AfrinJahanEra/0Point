// src/components/SubmissionHeatmap.jsx
import React, { useState, useEffect } from 'react';
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
import api from '../utils/api';
import toast from 'react-hot-toast';

const SubmissionHeatmap = ({ leetcodeHandle }) => {
  const [calendarData, setCalendarData] = useState([]);
  const [activeYears, setActiveYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!leetcodeHandle) {
      setLoading(false);
      return;
    }

    fetchCalendar();
  }, [leetcodeHandle, selectedYear]);

  const fetchCalendar = async () => {
    setLoading(true);
    setError(null);

    try {
      let url = '/account/leetcode-calendar/';
      if (selectedYear) {
        url += `?year=${selectedYear}`;
      }

      const response = await api.get(url);
      const data = response.data;

      if (data.has_leetcode === false) {
        setError("No LeetCode profile found");
        return;
      }

      if (data.error) {
        setError(data.error);
        return;
      }

      setCalendarData(data.submissionCalendar || []);
      setActiveYears(data.activeYears || []);

      // Auto-select latest year if not set
      if (!selectedYear && data.activeYears?.length > 0) {
        setSelectedYear(data.activeYears[data.activeYears.length - 1]);
      }

      toast.success("LeetCode heatmap loaded");
    } catch (err) {
      console.error(err);
      setError("Failed to load LeetCode heatmap");
      toast.error("Failed to load LeetCode heatmap");
    } finally {
      setLoading(false);
    }
  };

  const handleYearChange = (year) => {
    setSelectedYear(year);
  };

  // Convert data to format expected by react-calendar-heatmap
  const heatmapValues = calendarData.map(item => ({
    date: new Date(item.date),
    count: item.count,
  }));

  const startDate = selectedYear 
    ? new Date(`${selectedYear}-01-01`)
    : new Date(new Date().getFullYear() - 1, 0, 1);

  const endDate = selectedYear 
    ? new Date(`${selectedYear}-12-31`)
    : new Date();

  return (
    <div className="bg-white rounded-lg shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <span className="text-orange-500">LeetCode</span> Submission Heatmap
        </h2>

        {activeYears.length > 0 && (
          <div className="flex gap-2">
            {activeYears.map(year => (
              <button
                key={year}
                onClick={() => handleYearChange(year)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  selectedYear === year
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {year}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        </div>
      ) : error ? (
        <div className="h-64 flex items-center justify-center text-red-600 text-sm">
          {error}
        </div>
      ) : calendarData.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-gray-500 text-sm">
          No submission data available
        </div>
      ) : (
        <div className="overflow-x-auto">
          <CalendarHeatmap
            startDate={startDate}
            endDate={endDate}
            values={heatmapValues}
            classForValue={(value) => {
              if (!value || value.count === 0) return 'color-empty';
              if (value.count <= 3) return 'color-scale-1';
              if (value.count <= 7) return 'color-scale-2';
              if (value.count <= 15) return 'color-scale-3';
              return 'color-scale-4';
            }}
            tooltipDataAttrs={(value) => {
              if (!value || !value.date) return null;
              return {
                'data-tooltip': `${value.count} submissions on ${value.date.toLocaleDateString()}`,
              };
            }}
            showWeekdayLabels={true}
            gutterSize={4}
          />
        </div>
      )}

      {/* Color legend */}
      <div className="mt-4 flex items-center justify-end gap-2 text-xs text-gray-600">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="w-4 h-4 rounded bg-gray-100"></div>
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ebedf0' }}></div>
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#c6e48b' }}></div>
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#7bc96f' }}></div>
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#196127' }}></div>
        </div>
        <span>More</span>
      </div>
    </div>
  );
};

export default SubmissionHeatmap;