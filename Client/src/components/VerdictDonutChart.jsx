// src/components/VerdictDonutChart.jsx
import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { AlertCircle } from 'lucide-react';

// Define a color palette for common verdicts
// You can expand or adjust colors as needed
const COLORS = {
  Accepted: '#22c55e',           // green
  'Wrong Answer': '#ef4444',     // red
  'Time Limit Exceeded': '#f59e0b', // amber
  'Runtime Error': '#8b5cf6',    // violet
  'Compilation Error': '#64748b', // slate
  'Memory Limit Exceeded': '#ea580c', // orange
  Skipped: '#6b7280',
  'Other': '#9ca3af',
  // Add more if your backend returns additional verdict types
};

const VerdictDonutChart = ({ verdictStats = {}, username = "You" }) => {
  // Convert object to array for Recharts
  const data = Object.entries(verdictStats)
    .map(([verdict, count]) => ({
      name: verdict,
      value: count,
    }))
    .filter(item => item.value > 0) // hide zero counts
    .sort((a, b) => b.value - a.value); // sort descending by count

  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return (
      <div className="h-[300px] flex flex-col items-center justify-center text-gray-500">
        <AlertCircle size={48} className="mb-4 opacity-50" />
        <p className="text-center">
          No submission data available yet.<br />
          Connect more platforms or wait for stats to update.
        </p>
      </div>
    );
  }

  return (
    <div className="h-[340px] w-full">
      <div className="text-center mb-4">
        <h3 className="text-sm font-medium text-gray-600">
          {username}'s Submission Verdicts
        </h3>
        <p className="text-xs text-gray-500">
          Total submissions: <strong>{total}</strong>
        </p>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={110}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
            label={({ name, percent }) => 
              percent > 0.08 ? `${name} ${(percent * 100).toFixed(0)}%` : null
            }
            labelLine={false}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={COLORS[entry.name] || '#9ca3af'} // fallback gray
              />
            ))}
          </Pie>

          <Tooltip 
            formatter={(value, name) => [`${value} submissions`, name]}
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '10px 14px',
            }}
          />

          <Legend 
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            wrapperStyle={{
              fontSize: '0.875rem',
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Optional: small legend summary below chart if needed */}
      {data.length > 6 && (
        <div className="mt-2 text-xs text-center text-gray-500">
          Showing top verdicts — hover for full details
        </div>
      )}
    </div>
  );
};

export default VerdictDonutChart;