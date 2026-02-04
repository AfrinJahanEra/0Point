import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

const RatingChart = ({ platformProfiles }) => {
  const svgRef = useRef();
  const [tooltip, setTooltip] = useState(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState({
    codeforces: true,
    codechef: true,
    atcoder: true,
    leetcode: true
  });

  // Platform colors
  const platformColors = {
    codeforces: '#3b82f6', // Blue
    codechef: '#8b5cf6',   // Purple
    atcoder: '#ef4444',    // Red
    leetcode: '#f59e0b',   // Orange/Yellow
  };

  // Platform names for display
  const platformNames = {
    codeforces: 'Codeforces',
    codechef: 'CodeChef',
    atcoder: 'AtCoder',
    leetcode: 'LeetCode'
  };

  // Toggle platform selection
  const togglePlatform = (platform) => {
    setSelectedPlatforms(prev => ({
      ...prev,
      [platform]: !prev[platform]
    }));
  };

  // Select all platforms
  const selectAllPlatforms = () => {
    setSelectedPlatforms({
      codeforces: true,
      codechef: true,
      atcoder: true,
      leetcode: true
    });
  };

  useEffect(() => {
    if (!platformProfiles || platformProfiles.length === 0 || !svgRef.current) return;

    // Filter profiles based on selected platforms
    const filteredProfiles = platformProfiles.filter(
      profile => selectedPlatforms[profile.platform]
    );

    if (filteredProfiles.length === 0) return;

    // Collect contest data from filtered platforms
    const allContests = [];
    filteredProfiles.forEach((profile) => {
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
      .style('background', '#ffffff')
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleTime()
      .domain(d3.extent(allContests, (d) => d.date))
      .range([0, width]);
    
    const yScale = d3.scaleLinear()
      .domain([0, d3.max(allContests, (d) => d.rating) * 1.1])
      .range([height, 0]);

    // Add grid lines
    svg.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(yScale)
        .tickSize(-width)
        .tickFormat('')
      )
      .selectAll('line')
      .attr('stroke', '#e5e7eb')
      .attr('stroke-dasharray', '2,2')
      .attr('opacity', 0.5);

    // Axes
    const xAxis = svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale).tickFormat(d3.timeFormat('%b %Y')).ticks(6));
    
    xAxis.selectAll('line').attr('stroke', '#d1d5db');
    xAxis.selectAll('text').attr('fill', '#6b7280').style('font-size', '12px');
    xAxis.select('.domain').attr('stroke', '#d1d5db');

    const yAxis = svg.append('g').call(d3.axisLeft(yScale).ticks(6));
    yAxis.selectAll('line').attr('stroke', '#d1d5db');
    yAxis.selectAll('text').attr('fill', '#6b7280').style('font-size', '12px');
    yAxis.select('.domain').attr('stroke', '#d1d5db');

    // Light gray line connecting all points
    const line = d3.line()
      .x((d) => xScale(d.date))
      .y((d) => yScale(d.rating))
      .curve(d3.curveMonotoneX);
    
    svg.append('path')
      .datum(allContests)
      .attr('d', line)
      .attr('fill', 'none')
      .attr('stroke', '#d1d5db') // Light gray color for the line
      .attr('stroke-width', 1.5)
      .attr('opacity', 0.7);

    // Points with platform-specific colors
    const points = svg
      .selectAll('circle.point')
      .data(allContests)
      .enter()
      .append('circle')
      .attr('class', 'point')
      .attr('cx', (d) => xScale(d.date))
      .attr('cy', (d) => yScale(d.rating))
      .attr('r', (d, i) => (i === allContests.length - 1 ? 5.5 : 3.5))
      .attr('fill', (d) => platformColors[d.platform] || '#3b82f6') // Platform-specific color
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1.6)
      .attr('opacity', (d, i) => (i === allContests.length - 1 ? 1 : 0.9))
      .style('cursor', 'pointer');

    // Hover behavior
    points
      .on('mouseenter', function (event, d) {
        const node = d3.select(this);
        node.raise();
        node.transition().duration(120).attr('r', 7).attr('stroke-width', 2.4).attr('opacity', 1);

        const [px, py] = d3.pointer(event, svg.node());
        const svgRect = svgRef.current.getBoundingClientRect();
        const offsetX = px + margin.left;
        let tipLeft;
        const tipWidth = 220;
        
        if (offsetX + tipWidth + 20 > svgRect.width) {
          tipLeft = offsetX - tipWidth - 12;
        } else {
          tipLeft = offsetX + 12;
        }
        
        const tipTop = py + margin.top - 36;

        setTooltip({
          x: tipLeft,
          y: tipTop,
          content: {
            platform: platformNames[d.platform] || d.platform,
            rating: d.rating,
            contest: d.contest_name,
            datetime: d.date.toLocaleDateString(),
            color: platformColors[d.platform] || '#3b82f6'
          },
        });
      })
      .on('mouseleave', function (event, d) {
        const node = d3.select(this);
        const idx = allContests.indexOf(d);
        node.transition().duration(120).attr('r', idx === allContests.length - 1 ? 5.5 : 3.5).attr('stroke-width', 1.6).attr('opacity', idx === allContests.length - 1 ? 1 : 0.9);
        setTooltip(null);
      });

  }, [platformProfiles, selectedPlatforms]);

  if (!platformProfiles || platformProfiles.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-white rounded-lg border border-gray-200">
        <p className="text-gray-500">No rating data available</p>
      </div>
    );
  }

  const allPlatforms = Object.keys(platformNames);

  return (
    <div className="relative w-full bg-white rounded-lg border border-gray-200 p-4">
      <div className="mb-3">
        {/* Platforms and All button in one compact row */}
        <div className="flex items-center gap-3">
          {/* Platform circles and names */}
          <div className="flex items-center gap-3">
            {allPlatforms.map((platform) => (
              <div 
                key={platform} 
                className="flex items-center gap-1 cursor-pointer"
                onClick={() => togglePlatform(platform)}
              >
                {/* Clickable circle */}
                <div className="relative">
                  <div 
                    className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-all duration-200 ${
                      selectedPlatforms[platform] 
                        ? '' 
                        : 'bg-white border'
                    }`}
                    style={{
                      backgroundColor: selectedPlatforms[platform] ? platformColors[platform] : 'white',
                      borderColor: selectedPlatforms[platform] ? platformColors[platform] : platformColors[platform],
                    }}
                  >
                    {/* Checkmark for selected platforms */}
                    {selectedPlatforms[platform] && (
                      <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                
                {/* Platform name in relevant color */}
                <span 
                  className="text-xs font-medium"
                  style={{ 
                    color: selectedPlatforms[platform] ? platformColors[platform] : '#9ca3af',
                  }}
                >
                  {platformNames[platform]}
                </span>
              </div>
            ))}
          </div>
          
          {/* Vertical separator */}
          <div className="h-4 w-px bg-gray-300" />
          
          {/* All button - smaller and more compact */}
          <button
            onClick={selectAllPlatforms}
            className="text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-0.5 rounded transition-colors"
            title="Select all platforms"
          >
            All
          </button>
        </div>
      </div>

      <svg ref={svgRef} className="w-full" />
      
      {tooltip && (
        <div
          className="absolute bg-white text-gray-800 rounded-md p-3 shadow-lg z-20 pointer-events-none border border-gray-300"
          style={{ 
            left: `${tooltip.x}px`, 
            top: `${tooltip.y}px`, 
            width: 240, 
            fontSize: '12px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: tooltip.content.color }}
              />
              <span className="text-sm font-bold text-gray-900">{tooltip.content.platform}</span>
            </div>
            <span className="text-sm font-bold text-blue-700">{tooltip.content.rating}</span>
          </div>
          <div className="text-xs font-medium text-gray-900 truncate mb-1">{tooltip.content.contest}</div>
          <div className="text-xs text-gray-500">{tooltip.content.datetime}</div>
        </div>
      )}
    </div>
  );
};

export default RatingChart;



// import React, { useEffect, useRef, useState } from 'react';
// import * as d3 from 'd3';

// const RatingChart = ({ platformProfiles }) => {
//   const svgRef = useRef();
//   const [tooltip, setTooltip] = useState(null);

//   // Platform colors - matching the dashboard blue theme
//   const platformColors = {
//     codeforces: '#3b82f6', // Blue
//     codechef: '#8b5cf6',   // Purple
//     atcoder: '#ef4444',    // Red
//     leetcode: '#f59e0b',   // Orange/Yellow
//   };

//   // Platform names for display
//   const platformNames = {
//     codeforces: 'Codeforces',
//     codechef: 'CodeChef',
//     atcoder: 'AtCoder',
//     leetcode: 'LeetCode'
//   };

//   useEffect(() => {
//     if (!platformProfiles || platformProfiles.length === 0 || !svgRef.current) return;

//     // Collect contest data by platform
//     const platformData = {};
//     platformProfiles.forEach((profile) => {
//       if (profile.rating_history && Array.isArray(profile.rating_history)) {
//         platformData[profile.platform] = profile.rating_history.map((contest) => ({
//           date: new Date(contest.date || contest.datetime),
//           rating: contest.rating || 0,
//           contest_name: contest.contest_name || contest.name || 'Unknown',
//           rank: contest.rank || '-',
//           solved: contest.solved || 0,
//           platform: profile.platform,
//         })).sort((a, b) => a.date - b.date);
//       }
//     });

//     // Get all contests for calculating domain
//     const allContests = Object.values(platformData).flat();
//     if (allContests.length === 0) return;

//     const margin = { top: 30, right: 40, bottom: 60, left: 60 };
//     const width = 1000 - margin.left - margin.right;
//     const height = 400 - margin.top - margin.bottom;

//     d3.select(svgRef.current).selectAll('*').remove();

//     const svg = d3
//       .select(svgRef.current)
//       .attr('width', width + margin.left + margin.right)
//       .attr('height', height + margin.top + margin.bottom)
//       .style('background', '#ffffff')
//       .append('g')
//       .attr('transform', `translate(${margin.left},${margin.top})`);

//     // Calculate domains
//     const allDates = allContests.map(d => d.date);
//     const allRatings = allContests.map(d => d.rating);
//     const xScale = d3.scaleTime()
//       .domain([d3.min(allDates), d3.max(allDates)])
//       .range([0, width]);
    
//     const yScale = d3.scaleLinear()
//       .domain([0, d3.max(allRatings) * 1.1])
//       .range([height, 0]);

//     // Add grid lines
//     svg.append('g')
//       .attr('class', 'grid')
//       .call(d3.axisLeft(yScale)
//         .tickSize(-width)
//         .tickFormat('')
//       )
//       .selectAll('line')
//       .attr('stroke', '#e5e7eb')
//       .attr('stroke-dasharray', '2,2')
//       .attr('opacity', 0.5);

//     // Axes
//     const xAxis = svg.append('g')
//       .attr('transform', `translate(0,${height})`)
//       .call(d3.axisBottom(xScale).tickFormat(d3.timeFormat('%b %Y')).ticks(6));
    
//     xAxis.selectAll('line').attr('stroke', '#d1d5db');
//     xAxis.selectAll('text').attr('fill', '#6b7280').style('font-size', '12px');
//     xAxis.select('.domain').attr('stroke', '#d1d5db');

//     const yAxis = svg.append('g').call(d3.axisLeft(yScale).ticks(6));
//     yAxis.selectAll('line').attr('stroke', '#d1d5db');
//     yAxis.selectAll('text').attr('fill', '#6b7280').style('font-size', '12px');
//     yAxis.select('.domain').attr('stroke', '#d1d5db');

//     // Draw lines for each platform
//     Object.entries(platformData).forEach(([platform, contests]) => {
//       if (contests.length === 0) return;

//       const line = d3.line()
//         .x(d => xScale(d.date))
//         .y(d => yScale(d.rating))
//         .curve(d3.curveMonotoneX);

//       svg.append('path')
//         .datum(contests)
//         .attr('d', line)
//         .attr('fill', 'none')
//         .attr('stroke', platformColors[platform])
//         .attr('stroke-width', 2.5)
//         .attr('opacity', 0.9);
//     });

//     // Draw points for each platform
//     Object.entries(platformData).forEach(([platform, contests]) => {
//       if (contests.length === 0) return;

//       const points = svg
//         .selectAll(`circle.${platform}`)
//         .data(contests)
//         .enter()
//         .append('circle')
//         .attr('class', platform)
//         .attr('cx', (d) => xScale(d.date))
//         .attr('cy', (d) => yScale(d.rating))
//         .attr('r', (d, i) => (i === contests.length - 1 ? 5 : 3.5))
//         .attr('fill', platformColors[platform])
//         .attr('stroke', '#ffffff')
//         .attr('stroke-width', 1.5)
//         .attr('opacity', (d, i) => (i === contests.length - 1 ? 1 : 0.8))
//         .style('cursor', 'pointer');

//       // Hover behavior
//       points
//         .on('mouseenter', function (event, d) {
//           const node = d3.select(this);
//           node.raise();
//           node.transition().duration(120).attr('r', 6).attr('stroke-width', 2).attr('opacity', 1);

//           const [px, py] = d3.pointer(event, svg.node());
//           const svgRect = svgRef.current.getBoundingClientRect();
//           const offsetX = px + margin.left;
//           let tipLeft;
//           const tipWidth = 220;
          
//           if (offsetX + tipWidth + 20 > svgRect.width) {
//             tipLeft = offsetX - tipWidth - 12;
//           } else {
//             tipLeft = offsetX + 12;
//           }
          
//           const tipTop = py + margin.top - 36;

//           setTooltip({
//             x: tipLeft,
//             y: tipTop,
//             content: {
//               platform: platformNames[d.platform] || d.platform,
//               rating: d.rating,
//               contest: d.contest_name,
//               datetime: d.date.toLocaleDateString(),
//             },
//           });
//         })
//         .on('mouseleave', function (event, d) {
//           const node = d3.select(this);
//           const idx = platformData[d.platform].indexOf(d);
//           node.transition().duration(120).attr('r', idx === platformData[d.platform].length - 1 ? 5 : 3.5).attr('stroke-width', 1.5).attr('opacity', idx === platformData[d.platform].length - 1 ? 1 : 0.8);
//           setTooltip(null);
//         });
//     });

//     // Add legend
//     const legend = svg.append('g')
//       .attr('transform', `translate(${width - 150}, 10)`);

//     Object.entries(platformData).forEach(([platform, contests], i) => {
//       if (contests.length === 0) return;

//       const legendItem = legend.append('g')
//         .attr('transform', `translate(0, ${i * 25})`);

//       legendItem.append('line')
//         .attr('x1', 0)
//         .attr('x2', 20)
//         .attr('y1', 10)
//         .attr('y2', 10)
//         .attr('stroke', platformColors[platform])
//         .attr('stroke-width', 2.5)
//         .attr('opacity', 0.9);

//       legendItem.append('circle')
//         .attr('cx', 10)
//         .attr('cy', 10)
//         .attr('r', 3)
//         .attr('fill', platformColors[platform])
//         .attr('stroke', '#ffffff')
//         .attr('stroke-width', 1);

//       legendItem.append('text')
//         .attr('x', 30)
//         .attr('y', 14)
//         .text(platformNames[platform])
//         .attr('fill', '#374151')
//         .style('font-size', '11px')
//         .style('font-weight', '500');
//     });

//   }, [platformProfiles]);

//   if (!platformProfiles || platformProfiles.length === 0) {
//     return (
//       <div className="flex items-center justify-center h-64 bg-white rounded-lg border border-blue-200">
//         <p className="text-gray-500">No rating data available</p>
//       </div>
//     );
//   }

//   return (
//     <div className="relative w-full bg-white rounded-lg border border-blue-200 p-4">
//       <svg ref={svgRef} className="w-full" />
//       {tooltip && (
//         <div
//           className="absolute bg-white text-gray-800 rounded-md p-3 shadow-lg z-20 pointer-events-none border border-blue-200"
//           style={{ 
//             left: `${tooltip.x}px`, 
//             top: `${tooltip.y}px`, 
//             width: 240, 
//             fontSize: '12px',
//             boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
//           }}
//         >
//           <div className="flex items-center justify-between mb-2">
//             <span className="text-sm font-bold" style={{ color: platformColors[tooltip.content.platform?.toLowerCase()] || '#3b82f6' }}>
//               {tooltip.content.platform}
//             </span>
//             <span className="text-sm font-bold text-blue-700">{tooltip.content.rating}</span>
//           </div>
//           <div className="text-xs font-medium text-gray-900 truncate mb-1">{tooltip.content.contest}</div>
//           <div className="text-xs text-gray-500">{tooltip.content.datetime}</div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default RatingChart;