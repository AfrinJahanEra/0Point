// Client/src/components/CfTagDonutChart.jsx
import React, { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Sector } from 'recharts';

const COLORS = [
  '#FF6347',  // tomato-like for greedy
  '#FF4500',  // orange red
  '#DC143C',  // crimson
  '#FF1493',  // deep pink
  '#C71585',  // medium violet red
  '#8A2BE2',  // blue violet
  '#4B0082',  // indigo
  '#0000FF',  // blue
  '#1E90FF',  // dodger blue
  '#00BFFF',  // deep sky blue
  '#20B2AA',  // light sea green
  '#008B8B',  // dark cyan
  '#2E8B57',  // sea green
  '#32CD32',  // lime green
  '#9ACD32',  // yellow green
  '#FFD700',  // gold
  '#FFA500',  // orange
  '#FF8C00',  // dark orange
  '#D2691E',  // chocolate
  '#8B4513',  // saddle brown
  '#A0522D',  // sienna
  '#6B8E23',  // olive drab
  '#556B2F',  // dark olive green
  '#808080',  // gray
  '#696969'   // dim gray
];

const renderActiveShape = (props) => {
  const RADIAN = Math.PI / 180;
  const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const mx = cx + (outerRadius + 10) * cos;
  const my = cy + (outerRadius + 10) * sin;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 10} // pop out by 10px
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={outerRadius + 12}
        outerRadius={outerRadius + 25}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.3}
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
        No solved problems with tags found on Codeforces yet.
      </div>
    );
  }

  // Split into exactly TWO columns (balanced)
  const mid = Math.ceil(data.length / 2);
  const column1 = data.slice(0, mid);
  const column2 = data.slice(mid);

  const renderLegendItem = (item, index) => {
    const color = COLORS[index % COLORS.length];
    return (
      <div
        key={item.name}
        className="flex items-center gap-2 py-0.5 text-sm cursor-pointer hover:bg-gray-50 rounded px-1 transition-colors"
        onMouseEnter={() => setActiveIndex(index)}
        onMouseLeave={() => setActiveIndex(-1)}
      >
        <div
          className="w-4 h-4 rounded-full flex-shrink-0 border border-gray-300"
          style={{ backgroundColor: color }}
        />
        <span className="font-medium text-gray-900 truncate max-w-[140px]">{item.name}:</span>
        <span className="text-gray-700 font-medium">{item.value}</span>
      </div>
    );
  };

  return (
    <div className="w-full bg-white rounded-xl shadow-sm p-6">
      <div className="flex flex-col lg:flex-row gap-10">
        {/* Left: Large Donut Chart */}
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

              <Tooltip
                formatter={(value, name) => [`${value}`, name]}
                content={({ payload }) => {
                  if (!payload?.length) return null;
                  const { name, value } = payload[0];
                  return (
                    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-2 text-sm">
                      <p className="font-bold text-gray-900">{name}</p>
                      <p className="text-gray-700">{value} problems</p>
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Right: Two-column Compact Legend */}
        <div className="flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-0.5">
            {/* Column 1 */}
            <div>
              {column1.map((item, idx) => renderLegendItem(item, idx))}
            </div>

            {/* Column 2 */}
            <div>
              {column2.map((item, idx) => renderLegendItem(item, mid + idx))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CfTagDonutChart;