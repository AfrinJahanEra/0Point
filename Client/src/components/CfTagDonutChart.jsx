// Client/src/components/CfTagDonutChart.jsx
import React, { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Sector } from 'recharts';

const COLORS = [
  '#FF6347', '#FF4500', '#DC143C', '#FF1493', '#C71585',
  '#8A2BE2', '#4B0082', '#0000FF', '#1E90FF', '#00BFFF',
  '#20B2AA', '#008B8B', '#2E8B57', '#32CD32', '#9ACD32',
  '#FFD700', '#FFA500', '#FF8C00', '#D2691E', '#8B4513',
  '#A0522D', '#6B8E23', '#556B2F', '#808080', '#696969'
];

const renderActiveShape = (props) => {
  const RADIAN = Math.PI / 180;
  const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const mx = cx + (outerRadius + 12) * cos;
  const my = cy + (outerRadius + 12) * sin;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 12} // pop out effect
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={outerRadius + 14}
        outerRadius={outerRadius + 26}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.25}
      />
    </g>
  );
};

const CfTagDonutChart = ({ tagStats = {}, username = "user" }) => {
  const [activeIndex, setActiveIndex] = useState(-1);

  const data = Object.entries(tagStats)
    .map(([name, value]) => ({ name, value }))
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value);

  if (data.length === 0) {
    return (
      <div className="text-center py-10 text-gray-500 text-sm">
        No solved problems with tags found yet. Start solving problems on Codeforces or LeetCode!
      </div>
    );
  }

  // Split into exactly TWO columns (balanced)
  const mid = Math.ceil(data.length / 2);
  const column1 = data.slice(0, mid);
  const column2 = data.slice(mid);

  // Calculate total for percentage
  const total = data.reduce((sum, item) => sum + item.value, 0);

  const renderLegendItem = (item, index) => {
    const color = COLORS[index % COLORS.length];
    return (
      <div
        key={item.name}
        className="flex items-center gap-2 py-0.5 text-xs cursor-pointer hover:bg-gray-50 rounded px-1 transition-colors"
        onMouseEnter={() => setActiveIndex(index)}
        onMouseLeave={() => setActiveIndex(-1)}
      >
        <div
          className="w-3.5 h-3.5 rounded-full flex-shrink-0 border border-gray-300"
          style={{ backgroundColor: color }}
        />
        <span className="font-small text-gray-900 truncate max-w-[110px]">{item.name}:</span>
        <span className="text-gray-700 font-small">{item.value}</span>
      </div>
    );
  };

  return (
          <div className="flex flex-col lg:flex-row gap-10">
        {/* Left: Donut Chart */}
        <div className="flex-1 h-[460px] min-w-[460px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                activeIndex={activeIndex}
                activeShape={renderActiveShape}
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={200}
                paddingAngle={0.05}
                dataKey="value"
                nameKey="name"
                isAnimationActive={true}
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(-1)}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0.5} />
                ))}
              </Pie>

              {/* Custom tooltip with requested format */}
              <Tooltip
                content={({ payload }) => {
                  if (!payload?.length) return null;
                  const { name, value } = payload[0];
                  const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                  return (
                    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-2.5 text-xs">
                      <p className="font-bold text-gray-900">{name}:{value}</p>
                      <p className="text-gray-600">{percentage}%</p>
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Right: Two-column Legend – smaller font */}
        <div className="flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-0.5">
            <div>
              {column1.map((item, idx) => renderLegendItem(item, idx))}
            </div>
            <div>
              {column2.map((item, idx) => renderLegendItem(item, mid + idx))}
            </div>
          </div>
        </div>
      
    </div>
  );
};

export default CfTagDonutChart;