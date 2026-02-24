// Client/src/components/CategoryRadarChart.jsx
import React from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';

const CategoryRadarChart = ({ categoryScores = {}, username = "user" }) => {
  const categories = [
    "Mathematics",
    "Dynamic Programming",
    "Graphs",
    "Data Structures & Search",
    "Greedy & Sorting",
    "Strings",
    "Implementation",
    "Game Theory",
    "Other"
  ];

  const data = categories.map(cat => ({
    category: cat,
    score: categoryScores[cat] || 0,
  }));

  if (data.every(d => d.score === 0)) {
    return (
      <div className="text-center py-10 text-gray-500 text-sm">
        No solved problems data available yet for categories.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={460}>
      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
        <PolarGrid />
        <PolarAngleAxis dataKey="category" tick={{ fontSize: 12, fill: '#333' }} />
        <PolarRadiusAxis angle={30} domain={[0, 10]} tickCount={6} />
        <Radar
          name={username}
          dataKey="score"
          stroke="#8884d8"
          fill="#8884d8"
          fillOpacity={0.6}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
};

export default CategoryRadarChart;