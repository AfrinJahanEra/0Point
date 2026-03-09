//Client/src/components/CodeChefHeatmap.jsx
import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import './heatmap.css';
const CodechefHeatmap = () => {
  const [data, setData] = useState(null);
  const [year, setYear] = useState('current');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchCalendar();
  }, [year]);
  const fetchCalendar = async () => {
    const CACHE_KEY    = `cc_heatmap_${year}`;
    const CACHE_TS_KEY = `${CACHE_KEY}_ts`;
    const MAX_AGE      = 5 * 60 * 1000; // 5 minutes

    // 1. Show stale data instantly
    try {
      const cached   = localStorage.getItem(CACHE_KEY);
      const cachedAt = parseInt(localStorage.getItem(CACHE_TS_KEY) || '0', 10);
      const isFresh  = (Date.now() - cachedAt) < MAX_AGE;
      if (cached) {
        setData(JSON.parse(cached));
        setLoading(false);
        if (isFresh) return;
      }
    } catch (_) {}

    // 2. Background refresh
    try {
      const url =
        year === 'current'
          ? '/account/codechef-calendar/'
          : `/account/codechef-calendar/?year=${year}`;
      const res = await api.get(url);
      setData(res.data);
      setLoading(false);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(res.data));
        localStorage.setItem(CACHE_TS_KEY, String(Date.now()));
      } catch (_) {}
    } catch (err) {
      console.error('Calendar fetch error', err);
      setLoading(false);
    }
  };
  const calendar = data?.submissionCalendar || {};
  /* ---------- Normalize data ---------- */
  const dayMap = {};
  Object.entries(calendar).forEach(([ts, count]) => {
    const d = new Date(parseInt(ts) * 1000);
    const key = d.toISOString().split('T')[0];
    dayMap[key] = count;
  });
  const start = new Date(
    year === 'current'
      ? new Date().setFullYear(new Date().getFullYear() - 1)
      : `${year}-01-01`
  );
  const end =
    year === 'current'
      ? new Date()
      : new Date(`${year}-12-31`);
  /* ---------- Group by month ---------- */
  const months = {}; // monthIndex -> days[]
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
  const key = d.toISOString().split('T')[0];
  const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  if (!months[ym]) {
    months[ym] = {
      year: d.getFullYear(),
      month: d.getMonth(),
      days: []
    };
  }
  months[ym].days.push({
    date: new Date(d),
    count: dayMap[key] || 0
  });
}
  const getLevel = (c) => {
    if (c === 0) return 0;
    if (c <= 2) return 1;
    if (c <= 5) return 2;
    if (c <= 10) return 3;
    return 4;
  };
  const allDays = Object.values(months).flatMap(m => m.days);
  const total = allDays.reduce((a, b) => a + b.count, 0);
  const activeDays = allDays.filter(d => d.count > 0).length;
  return (
    <div className="lc-heatmap-wrapper">
      {/* HEADER */}
      <div className="lc-header">
        <div className="lc-title">
          <span className="lc-total">{total}</span>
          submissions in the past one year
        </div>
        <div className="lc-meta">
          <span>Total active days: {activeDays}</span>
          <span>Max streak: {data?.streak || 0}</span>
          <select value={year} onChange={e => setYear(e.target.value)}>
            <option value="current">Current</option>
            {data?.activeYears?.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>
      {loading ? (
        <div className="lc-loading animate-pulse">
          <div style={{display:'flex', gap:'4px', flexWrap:'wrap'}}>
            {Array.from({length: 52}).map((_, i) => (
              <div key={i} style={{display:'flex', flexDirection:'column', gap:'3px'}}>
                {Array.from({length: 7}).map((_, j) => (
                  <div key={j} style={{width:'12px', height:'12px', background:'#e5e7eb', borderRadius:'2px'}} />
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* MONTH BLOCKS */
        <div className="lc-months-container">
          {Object.values(months).map(({ year, month, days }) => {
            /* pad start to week alignment */
            const firstDay = days[0].date.getDay();// 0=Sun
            const padded = [];
            for (let i = 0; i < firstDay; i++) {
              padded.push(null); // empty cell
            }
            days.forEach(d => padded.push(d));
            return (
             <div key={`${year}-${month}`} className="lc-month-block">
                {/* Month label */}
                <div className="lc-month-title">
  {new Date(year, month).toLocaleString('default', { month: 'short' })}
</div>
                {/* Month grid */}
                <div className="lc-month-grid">
                  {padded.map((d, i) => {
                    if (!d) {
                      return <div key={i} className="lc-cell empty" />;
                    }
                    const lvl = getLevel(d.count);
                    return (
                      <div
  key={i}
  className={`lc-cell lvl-${lvl}`}
  title={`${d.date.toDateString()} : ${d.count} submissions`}
  style={{ cursor: 'pointer' }}
/>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* LEGEND */}
      <div className="lc-legend">
        <span>Less</span>
        <div className="lc-cell lvl-0" />
        <div className="lc-cell lvl-1" />
        <div className="lc-cell lvl-2" />
        <div className="lc-cell lvl-3" />
        <div className="lc-cell lvl-4" />
        <span>More</span>
      </div>
    </div>
  );
};
export default CodechefHeatmap;