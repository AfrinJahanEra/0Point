// Client/src/components/SubmissionHeatmap.jsx
import React, { useState } from 'react';
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
import { subYears, format } from 'date-fns';

const SubmissionHeatmap = ({ calendarData = {}, activeYears = [], title = "LeetCode Submission Heatmap" }) => {
  const [selectedYear, setSelectedYear] = useState(activeYears[0] || new Date().getFullYear());

  // Prepare data for selected year
  const values = Object.entries(calendarData)
    .filter(([date]) => date.startsWith(selectedYear.toString()))
    .map(([date, count]) => ({
      date,
      count,
    }));

  if (values.length === 0 && activeYears.length > 0) {
    return (
      <div className="text-center py-10 text-gray-500 text-sm">
        No submissions tracked in {selectedYear}.
      </div>
    );
  }

  if (values.length === 0) {
    return (
      <div className="text-center py-10 text-gray-500 text-sm">
        No LeetCode submission calendar data available yet.
        <p className="mt-2 text-xs">
          This may happen if your recent activity hasn't been tracked by the third-party API.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        
        {activeYears.length > 0 && (
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {activeYears.map(year => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="min-w-[780px]"> {/* Ensures enough space for full year */}
          <CalendarHeatmap
            startDate={new Date(`${selectedYear}-01-01`)}
            endDate={new Date(`${selectedYear}-12-31`)}
            values={values}
            classForValue={(value) => {
              if (!value || value.count === 0) return 'color-empty';
              if (value.count <= 2) return 'color-scale-1';
              if (value.count <= 5) return 'color-scale-2';
              if (value.count <= 10) return 'color-scale-3';
              return 'color-scale-4';
            }}
            gutterSize={3}                // space between squares
            squareSize={12}               // smaller squares
            tooltipDataAttrs={(value) => {
              if (!value?.date) return null;
              return {
                'data-tooltip': `${value.count} submission${value.count !== 1 ? 's' : ''} on ${format(new Date(value.date), 'MMM d, yyyy')}`,
              };
            }}
          />
        </div>
      </div>

      {/* Color legend */}
      <div className="flex justify-end mt-3 text-xs text-gray-600 items-center gap-1.5">
        <span>Less</span>
        <div className="w-3 h-3 rounded-sm bg-[#ebedf0]"></div>
        <div className="w-3 h-3 rounded-sm bg-[#c6e48b]"></div>
        <div className="w-3 h-3 rounded-sm bg-[#7bc96f]"></div>
        <div className="w-3 h-3 rounded-sm bg-[#196127]"></div>
        <span>More</span>
      </div>
    </div>
  );
};

export default SubmissionHeatmap;