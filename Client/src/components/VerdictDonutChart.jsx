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

const COLORS = {
  "Accepted": "#4ade80",
  "Wrong Answer": "#a03535",
  "Time Limit Exceeded": "#fb923c",
  "Memory Limit Exceeded": "#edb892",
  "Runtime Error": "#c084fc",
  "Compilation Error": "#4489ea",
  "Partial": "#818cf8",
  "Challenged": "#52165c",
  "Skipped": "#bcc4d2",
  "Other": "#9ca3af",
};

const VerdictDonutChart = ({ verdictStats = {}, username = "You" }) => {
  const data = Object.entries(verdictStats)
    .map(([verdict, count]) => ({
      name: verdict,
      value: count,
    }))
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value);

  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return (
      <div className="h-[360px] flex flex-col items-center justify-center text-gray-500">
        <AlertCircle size={48} className="mb-4 opacity-60" />
        <p className="text-center text-sm">
          No submission verdicts recorded yet.<br />
          Connect platforms and wait for stats to sync.
        </p>
      </div>
    );
  }

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return percent > 0.04 ? (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize="11"
        fontWeight="600"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    ) : null;
  };

  return (
    <div className="h-[380px] w-full flex flex-col items-center justify-center relative">
      {/* Total Submissions on the right */}
      <div className="absolute top-2 right-8 text-right">
        <p className="text-sm font-medium text-gray-700">Total Submissions</p>
        <p className="text-xl font-bold text-gray-900">{total.toLocaleString()}</p>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={140}
            innerRadius={60}

            paddingAngle={0}
            dataKey="value"
            nameKey="name"
            label={renderCustomizedLabel}
            labelLine={false}
            isAnimationActive={true}
            animationDuration={1200}
            animationBegin={0}
            stroke="#f3f4f6"
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[entry.name] || '#9ca3af'}
              />
            ))}
          </Pie>

          <Tooltip
            formatter={(value, name) => [
              `${value.toLocaleString()} submissions (${((value / total) * 100).toFixed(1)}%)`,
              name,
            ]}
            contentStyle={{
              backgroundColor: 'rgba(255,255,255,0.98)',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '10px 14px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              fontSize: '0.8rem',
            }}
          />

          <Legend
            verticalAlign="middle"
            align="right"
            layout="vertical"
            iconType="circle"
            iconSize={9}
            wrapperStyle={{
              fontSize: '0.75rem',
              paddingLeft: '12px',      // small gap
              lineHeight: '1.5',
              color: '#374151',
            }}
            formatter={(value) => (
              <span className="font-medium">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default VerdictDonutChart;