// Dummy price trend data generator per tradelane (origin → destination)
// Deterministic pseudo-random so same lane yields stable trend across sessions (unless code changes)
// Can be reused by any component needing a small historical price series.

const _trendCache = {};

function hashLane(str){
  let h = 0; for(let i=0;i<str.length;i++){ h = (h * 31 + str.charCodeAt(i)) >>> 0; }
  return h >>> 0;
}

// Linear congruential generator (LCG) for deterministic sequence
function nextRand(state){
  return (state * 1664525 + 1013904223) >>> 0;
}

/**
 * getLaneTrend(lane, points, baseSell)
 * lane: 'ORIGIN → DEST'
 * points: number of data points (default 7)
 * baseSell: optional anchor (e.g., current sell) to scale trend roughly around
 */
export function getLaneTrend(lane, points=7, baseSell){
  if(!lane) return [];
  const key = `${lane}|${points}`;
  if(_trendCache[key]) return _trendCache[key];
  let seed = hashLane(lane) || 1;
  const anchor = baseSell && baseSell>0 ? baseSell : 800 + (seed % 600); // deterministic anchor
  const series = [];
  // Start a bit below anchor to create upward/sideways movement
  let value = anchor * 0.92;
  for(let i=0;i<points;i++){
    seed = nextRand(seed);
    // drift between -4% and +4%
    const drift = ((seed & 0xff)/255 - 0.5) * 0.08;
    value = value * (1 + drift);
    // Add slight mean reversion toward anchor
    value += (anchor - value) * 0.05;
    series.push(Number(value.toFixed(2)));
  }
  _trendCache[key] = series;
  return series;
}

/** Convenience wrapper returning objects suitable for recharts */
export function getLaneTrendPoints(lane, points=7, baseSell){
  return getLaneTrend(lane, points, baseSell).map((y,i)=>({ x:i, y }));
}

/** Clear cache (for tests) */
export function resetLaneTrends(){ Object.keys(_trendCache).forEach(k=> delete _trendCache[k]); }
