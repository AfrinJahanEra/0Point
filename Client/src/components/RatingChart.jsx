import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

const RatingChart = ({ platformProfiles }) => {
  const svgRef = useRef();
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    if (!platformProfiles || platformProfiles.length === 0 || !svgRef.current) return;

    // Collect contest data
    const allContests = [];
    platformProfiles.forEach((profile) => {
      if (profile.rating_history && Array.isArray(profile.rating_history)) {
        profile.rating_history.forEach((contest) => {
          allContests.push({
            date: new Date(contest.date || contest.datetime),
            rating: contest.rating || 0,
            contest_name: contest.contest_name || contest.name || 'Unknown',
            rank: contest.rank || '-',
            solved: contest.solved || 0,
            platform: profile.platform,
          });
        });
      }
    });

    allContests.sort((a, b) => a.date - b.date);
    if (allContests.length === 0) return;

    const margin = { top: 30, right: 40, bottom: 60, left: 60 };
    const width = 1000 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3
      .select(svgRef.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .style('background', '#0f0f0f')
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleTime().domain(d3.extent(allContests, (d) => d.date)).range([0, width]);
    const yScale = d3.scaleLinear().domain([0, d3.max(allContests, (d) => d.rating) * 1.1]).range([height, 0]);

    // Axes
    const xAxis = svg.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(xScale).tickFormat(d3.timeFormat('%Y')).ticks(6));
    xAxis.selectAll('line').attr('stroke', '#333');
    xAxis.selectAll('text').attr('fill', '#888').style('font-size', '12px');
    xAxis.select('.domain').attr('stroke', '#333');

    const yAxis = svg.append('g').call(d3.axisLeft(yScale).ticks(5));
    yAxis.selectAll('line').attr('stroke', '#333');
    yAxis.selectAll('text').attr('fill', '#888').style('font-size', '12px');
    yAxis.select('.domain').attr('stroke', '#333');

    // Line connecting points
    const line = d3.line().x((d) => xScale(d.date)).y((d) => yScale(d.rating)).curve(d3.curveMonotoneX);
    svg.append('path').datum(allContests).attr('d', line).attr('fill', 'none').attr('stroke', '#f59e0b').attr('stroke-width', 2.2).attr('opacity', 0.95);

    // Points: yellow fill, white halo
    const points = svg
      .selectAll('circle.point')
      .data(allContests)
      .enter()
      .append('circle')
      .attr('class', 'point')
      .attr('cx', (d) => xScale(d.date))
      .attr('cy', (d) => yScale(d.rating))
      .attr('r', (d, i) => (i === allContests.length - 1 ? 5.5 : 3.5))
      .attr('fill', '#ffd54f')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1.6)
      .attr('opacity', (d, i) => (i === allContests.length - 1 ? 1 : 0.9))
      .style('cursor', 'pointer');

    // Hover behavior: raise point, enlarge, show tooltip positioned to not cover point
    points
      .on('mouseenter', function (event, d) {
        const node = d3.select(this);
        node.raise();
        node.transition().duration(120).attr('r', 7).attr('stroke-width', 2.4).attr('opacity', 1);

        // compute tooltip position so it doesn't cover the point
        const [px, py] = d3.pointer(event, svg.node());
        const svgRect = svgRef.current.getBoundingClientRect();
        const offsetX = px + margin.left;
        let tipLeft;
        const tipWidth = 220;
        if (offsetX + tipWidth + 20 > svgRect.width) {
          // position left of point
          tipLeft = offsetX - tipWidth - 12;
        } else {
          // position right of point
          tipLeft = offsetX + 12;
        }
        const tipTop = py + margin.top - 36;

        setTooltip({
          x: tipLeft,
          y: tipTop,
          content: {
            rating: d.rating,
            contest: d.contest_name,
            datetime: d.date.toLocaleString(),
          },
        });
      })
      .on('mouseleave', function (event, d) {
        const node = d3.select(this);
        const idx = allContests.indexOf(d);
        node.transition().duration(120).attr('r', idx === allContests.length - 1 ? 5.5 : 3.5).attr('stroke-width', 1.6).attr('opacity', idx === allContests.length - 1 ? 1 : 0.9);
        setTooltip(null);
      });

  }, [platformProfiles]);

  if (!platformProfiles || platformProfiles.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-900 rounded-lg">
        <p className="text-gray-500">No rating data available</p>
      </div>
    );
  }

  return (
    <div className="relative w-full bg-gray-900 rounded-lg p-4">
      <svg ref={svgRef} className="w-full" />
      {tooltip && (
        <div
          className="absolute bg-gray-800 text-white rounded-md p-2 shadow-lg z-20 pointer-events-none border border-gray-700"
          style={{ left: `${tooltip.x}px`, top: `${tooltip.y}px`, width: 220, fontSize: '12px' }}
        >
          <div className="text-sm font-semibold text-yellow-400">{tooltip.content.rating}</div>
          <div className="text-xs text-gray-300 truncate">{tooltip.content.contest}</div>
          <div className="text-xs text-gray-400 mt-1">{tooltip.content.datetime}</div>
        </div>
      )}
    </div>
  );
};

export default RatingChart;
