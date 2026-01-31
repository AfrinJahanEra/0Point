import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const RatingChart = ({ platformProfiles }) => {
  const svgRef = useRef();

  useEffect(() => {
    if (!platformProfiles || platformProfiles.length === 0 || !svgRef.current) {
      return;
    }

    // Prepare data for chart
    const platforms = platformProfiles.map((p) => ({
      name: p.platform.charAt(0).toUpperCase() + p.platform.slice(1),
      current: p.current_rating || 0,
      max: p.max_rating || 0,
      min: p.min_rating || 0,
      contests: p.contests_count || 0,
    }));

    const margin = { top: 20, right: 30, bottom: 20, left: 50 };
    const width = 600 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    // Clear previous SVG
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3
      .select(svgRef.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3
      .scaleBand()
      .domain(platforms.map((d) => d.name))
      .range([0, width])
      .padding(0.4);

    const maxValue = Math.max(...platforms.flatMap((p) => [p.current, p.max, p.min]));
    const yScale = d3
      .scaleLinear()
      .domain([0, maxValue * 1.1])
      .range([height, 0]);

    // X Axis
    svg
      .append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale))
      .style('font-size', '12px');

    // Y Axis
    svg
      .append('g')
      .call(d3.axisLeft(yScale))
      .style('font-size', '12px');

    // Y Axis Label
    svg
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left)
      .attr('x', 0 - height / 2)
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .style('font-size', '12px')
      .text('Rating');

    // Bar groups
    const barWidth = xScale.bandwidth() / 3;
    const groups = svg
      .selectAll('g.bar-group')
      .data(platforms)
      .enter()
      .append('g')
      .attr('class', 'bar-group')
      .attr('transform', (d) => `translate(${xScale(d.name)},0)`);

    // Current Rating Bars (Blue)
    groups
      .append('rect')
      .attr('x', 0)
      .attr('y', (d) => yScale(d.current))
      .attr('width', barWidth)
      .attr('height', (d) => height - yScale(d.current))
      .attr('fill', '#3b82f6')
      .attr('opacity', 0.8)
      .append('title')
      .text((d) => `Current: ${d.current}`);

    // Max Rating Bars (Green)
    groups
      .append('rect')
      .attr('x', barWidth)
      .attr('y', (d) => yScale(d.max))
      .attr('width', barWidth)
      .attr('height', (d) => height - yScale(d.max))
      .attr('fill', '#10b981')
      .attr('opacity', 0.8)
      .append('title')
      .text((d) => `Max: ${d.max}`);

    // Min Rating Bars (Red)
    groups
      .append('rect')
      .attr('x', barWidth * 2)
      .attr('y', (d) => yScale(d.min))
      .attr('width', barWidth)
      .attr('height', (d) => height - yScale(d.min))
      .attr('fill', '#ef4444')
      .attr('opacity', 0.8)
      .append('title')
      .text((d) => `Min: ${d.min}`);

    // Legend
    const legendData = [
      { label: 'Current', color: '#3b82f6' },
      { label: 'Max', color: '#10b981' },
      { label: 'Min', color: '#ef4444' },
    ];

    const legend = svg
      .selectAll('.legend')
      .data(legendData)
      .enter()
      .append('g')
      .attr('class', 'legend')
      .attr('transform', (d, i) => `translate(${width - 150},${-15 + i * 20})`);

    legend
      .append('rect')
      .attr('width', 12)
      .attr('height', 12)
      .attr('fill', (d) => d.color)
      .attr('opacity', 0.8);

    legend
      .append('text')
      .attr('x', 20)
      .attr('y', 10)
      .style('font-size', '12px')
      .text((d) => d.label);
  }, [platformProfiles]);

  if (!platformProfiles || platformProfiles.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <p className="text-gray-500">No rating data available</p>
      </div>
    );
  }

  return (
    <div className="flex justify-center overflow-x-auto">
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default RatingChart;
