// Client/src/components/CategoryRadarChart.jsx
import React, { useMemo } from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;

  const { category, score, problem_count, tags } = payload[0].payload;

  return (
    <div
      className="bg-white border border-gray-300 shadow-md rounded px-3 py-2 text-xs leading-tight min-w-[180px]"
      style={{ fontSize: '10px' }} // tiny font
    >
      <p className="font-semibold text-gray-800 mb-1">{category}</p>
      <p className="text-gray-700">
        Score: <span className="font-bold">{score.toFixed(2)}</span>/10
      </p>
      <p className="text-gray-600">
        Problems solved: <span className="font-medium">{problem_count}</span>
      </p>
      <p className="text-gray-500 mt-1">
        Tags: {tags?.length ? tags.join(', ') : '—'}
      </p>
    </div>
  );
};

const CategoryRadarChart = ({ categoryScores = {}, username = "You" }) => {
  const categories = useMemo(
    () => [
      "Mathematics",
      "Dynamic Programming",
      "Graphs",
      "Data Structures & Search",
      "Greedy & Sorting",
      "Strings",
      "Implementation",
      "Game Theory",
      "Other",
    ],
    []
  );

  const data = useMemo(() => {
    return categories.map((cat) => {
      const info = categoryScores[cat] || {};
      return {
        category: cat,
        score: info.score || 0,
        problem_count: info.problem_count || 0,
        tags: info.tags || [],
      };
    });
  }, [categoryScores]);

  const hasAnyData = data.some((d) => d.score > 0);

  if (!hasAnyData) {
    return (
      <div className="text-center py-10 text-gray-500 text-sm">
        No category data available yet.
        <br />
        <span className="text-xs">
          Solve problems on Codeforces and/or LeetCode to see your strengths
        </span>
      </div>
    );
  }

  return (
    <div className="w-full h-[480px] min-h-[420px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="#e5e7eb" gridType="polygon" />

          <PolarAngleAxis
            dataKey="category"
            tick={{ fontSize: 11, fill: '#374151' }}
          />

          <PolarRadiusAxis
            angle={90}
            domain={[0, 10]}
            tickCount={6}
            tick={{ fontSize: 10, fill: '#6b7280' }}
          />

          <Radar
            name={username}
            dataKey="score"
            stroke="#6366f1"
            strokeWidth={2.5}
            fill="none"
            dot={{ stroke: "#6366f1", strokeWidth: 2, r: 4 }}
            activeDot={{ r: 7, stroke: "#4338ca", strokeWidth: 2.5 }}
            isAnimationActive={true}
            animationDuration={800}
          />

          <Tooltip
            content={<CustomTooltip />}
            cursor={false}           // no background line when hovering
            // wrapperStyle makes it appear near cursor, but we rely on activeDot
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CategoryRadarChart;