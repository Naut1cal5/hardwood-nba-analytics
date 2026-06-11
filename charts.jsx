// ── Chart components. All pure SVG, dark-friendly, with draw-in animations. ──

const ACCENT = '#0A84FF';
const GRID = 'rgba(255,255,255,0.06)';
const LABEL = '#6d6d78';

// Small reusable "reveal on mount" hook
function useReveal(dep = 0) {
  const [on, setOn] = React.useState(false);
  React.useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setOn(true)));
    return () => cancelAnimationFrame(id);
  }, [dep]);
  return on;
}

// ── Sparkline ────────────────────────────────────────────────────────────
function Spark({ data, w = 120, h = 28, color = ACCENT, area = true }) {
  const min = Math.min(...data), max = Math.max(...data);
  const pad = 2;
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = pad + (1 - (v - min) / (max - min || 1)) * (h - pad * 2);
    return [x, y];
  });
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const fill = d + ` L ${w - pad} ${h - pad} L ${pad} ${h - pad} Z`;
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      {area && <path d={fill} fill={color} opacity="0.12" />}
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

// ── Line/Area: points over last 15 games ─────────────────────────────────
function LineArea({ data, height = 220, accessor = (d) => d.pts, label = 'PTS', unit = '' }) {
  const [hover, setHover] = React.useState(null);
  const on = useReveal();
  const pad = { t: 20, r: 16, b: 28, l: 36 };
  const w = 720, h = height;
  const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
  const vals = data.map(accessor);
  const lo = Math.min(...vals) - 4, hi = Math.max(...vals) + 4;
  const x = (i) => pad.l + (i / (data.length - 1)) * iw;
  const y = (v) => pad.t + (1 - (v - lo) / (hi - lo)) * ih;
  const pts = data.map((d, i) => [x(i), y(accessor(d))]);
  const path = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const fill = path + ` L ${pad.l + iw} ${pad.t + ih} L ${pad.l} ${pad.t + ih} Z`;

  const ticks = 4;
  const tickVals = Array.from({ length: ticks + 1 }, (_, i) => lo + ((hi - lo) * i) / ticks);
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="la-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"   stopColor={ACCENT} stopOpacity="0.35" />
          <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
        </linearGradient>
        <clipPath id="la-clip">
          <rect x={pad.l} y="0" width={on ? iw : 0} height={h} style={{ transition: 'width 1.1s cubic-bezier(.2,.7,.2,1)' }} />
        </clipPath>
      </defs>

      {/* grid */}
      {tickVals.map((v, i) => {
        const yy = y(v);
        return (
          <g key={i}>
            <line x1={pad.l} x2={pad.l + iw} y1={yy} y2={yy} stroke={GRID} strokeDasharray="2 4" />
            <text x={pad.l - 8} y={yy + 3} textAnchor="end" fontSize="10" fontFamily="JetBrains Mono" fill={LABEL}>{v.toFixed(0)}</text>
          </g>
        );
      })}

      {/* avg */}
      <line x1={pad.l} x2={pad.l + iw} y1={y(avg)} y2={y(avg)} stroke="rgba(255,255,255,0.22)" strokeDasharray="1 3" />
      <text x={pad.l + iw - 4} y={y(avg) - 4} fontSize="9" fontFamily="JetBrains Mono" fill="#9aa0a6" textAnchor="end">
        AVG {avg.toFixed(1)}
      </text>

      {/* x labels: every 3rd */}
      {data.map((d, i) => i % 3 === 0 && (
        <text key={i} x={x(i)} y={h - 8} textAnchor="middle" fontSize="9" fontFamily="JetBrains Mono" fill={LABEL}>{d.d}</text>
      ))}

      <g clipPath="url(#la-clip)">
        <path d={fill} fill="url(#la-fill)" />
        <path d={path} fill="none" stroke={ACCENT} strokeWidth="2" />
      </g>

      {/* points */}
      {pts.map((p, i) => (
        <g key={i}
           onMouseEnter={() => setHover(i)}
           onMouseLeave={() => setHover(null)}
           style={{ cursor: 'pointer' }}>
          <circle cx={p[0]} cy={p[1]} r="8" fill="transparent" />
          <circle cx={p[0]} cy={p[1]} r={hover === i ? 4 : 2.5}
            fill={ACCENT}
            style={{ transition: 'r 0.15s, opacity 0.6s', opacity: on ? 1 : 0, transitionDelay: `${i * 40 + 400}ms` }} />
        </g>
      ))}

      {/* hover tooltip */}
      {hover !== null && (
        <g>
          <line x1={pts[hover][0]} x2={pts[hover][0]} y1={pad.t} y2={pad.t + ih} stroke="rgba(255,255,255,0.15)" />
          <g transform={`translate(${Math.min(pts[hover][0] + 10, w - 130)} ${Math.max(pts[hover][1] - 40, pad.t)})`}>
            <rect width="120" height="38" rx="8" fill="#1a1a20" stroke="rgba(255,255,255,0.1)" />
            <text x="10" y="15" fontSize="10" fontFamily="JetBrains Mono" fill="#9aa0a6">{data[hover].d} · vs {data[hover].opp}</text>
            <text x="10" y="30" fontSize="12" fontFamily="JetBrains Mono" fill="#fff" fontWeight="600">
              {label}: {accessor(data[hover])}{unit}
            </text>
          </g>
        </g>
      )}
    </svg>
  );
}

// ── Radar ─────────────────────────────────────────────────────────────────
function Radar({ data, size = 280 }) {
  const on = useReveal();
  const cx = size / 2, cy = size / 2, r = size / 2 - 34;
  const n = data.length;
  const ang = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const point = (v, i, rad = r) => [cx + Math.cos(ang(i)) * rad * (v / 100), cy + Math.sin(ang(i)) * rad * (v / 100)];
  const poly = (vals) => vals.map((v, i) => point(v, i).join(',')).join(' ');

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ display: 'block' }}>
      {[25, 50, 75, 100].map((t) => (
        <polygon key={t}
          points={Array.from({ length: n }, (_, i) => point(t, i).join(',')).join(' ')}
          fill="none" stroke={GRID} />
      ))}
      {data.map((_, i) => {
        const [x, y] = point(100, i);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke={GRID} />;
      })}
      {/* avg */}
      <polygon
        points={poly(data.map((d) => d.avg))}
        fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.25)" strokeDasharray="2 3"
        style={{ transition: 'opacity 0.8s', opacity: on ? 1 : 0 }} />
      {/* player */}
      <polygon
        points={poly(data.map((d) => d.p))}
        fill="rgba(10,132,255,0.22)" stroke={ACCENT} strokeWidth="1.5"
        style={{ transform: on ? 'scale(1)' : 'scale(0)', transformOrigin: `${cx}px ${cy}px`, transition: 'transform 0.9s cubic-bezier(.2,.8,.2,1)' }}
      />
      {data.map((d, i) => {
        const [x, y] = point(118, i);
        return (
          <g key={i}>
            <text x={x} y={y} textAnchor="middle" dominantBaseline="middle"
              fontSize="10" fontFamily="Inter" fill="#a9a9b2" fontWeight="500">{d.k}</text>
            <text x={x} y={y + 12} textAnchor="middle" fontSize="9" fontFamily="JetBrains Mono" fill="#0A84FF">{d.p}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Shot chart ────────────────────────────────────────────────────────────
function ShotChart({ shots, filter = 'all', height = 360 }) {
  const on = useReveal(filter);
  const w = 500, h = 470;
  const visible = shots.filter((s) => filter === 'all' || (filter === 'made' ? s.made : !s.made));
  const made = shots.filter(s => s.made).length;
  const total = shots.length;
  const pct = (made / total) * 100;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={height} style={{ display: 'block' }}>
      {/* Court */}
      <g fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1.2">
        <rect x="0.6" y="0.6" width={w - 1.2} height={h - 1.2} rx="8" stroke="rgba(255,255,255,0.08)" />
        {/* baseline already implicit */}
        {/* paint */}
        <rect x="170" y="280" width="160" height="140" />
        {/* restricted area */}
        <path d={`M 210 420 A 40 40 0 0 1 290 420`} />
        {/* free-throw circle */}
        <circle cx="250" cy="280" r="50" />
        {/* three-point arc */}
        <path d={`M 40 420 L 40 360 A 210 210 0 0 1 460 360 L 460 420`} />
        {/* rim */}
        <circle cx="250" cy="420" r="8" stroke="#FF9F0A" />
        {/* backboard */}
        <line x1="220" y1="412" x2="280" y2="412" stroke="rgba(255,255,255,0.3)" />
        {/* midcourt hint */}
        <line x1="0" y1="10" x2={w} y2="10" stroke="rgba(255,255,255,0.05)" />
      </g>

      {/* Shots */}
      {visible.map((s, i) => (
        <g key={i} style={{ opacity: on ? 1 : 0, transition: `opacity 0.45s ease`, transitionDelay: `${(i % 60) * 6}ms` }}>
          {s.made
            ? <circle cx={s.x} cy={s.y} r="4.5" fill="rgba(10,132,255,0.85)" stroke="#9cc8ff" strokeWidth="0.5" />
            : <g>
                <line x1={s.x - 3} y1={s.y - 3} x2={s.x + 3} y2={s.y + 3} stroke="rgba(255,255,255,0.42)" strokeWidth="1.4" />
                <line x1={s.x - 3} y1={s.y + 3} x2={s.x + 3} y2={s.y - 3} stroke="rgba(255,255,255,0.42)" strokeWidth="1.4" />
              </g>}
        </g>
      ))}

      {/* Stat overlay */}
      <g transform="translate(14, 16)">
        <rect width="120" height="52" rx="10" fill="rgba(10,10,12,0.6)" stroke="rgba(255,255,255,0.08)" />
        <text x="12" y="18" fontSize="9" fontFamily="Inter" fill="#6d6d78" style={{ letterSpacing: '0.1em' }}>FG%</text>
        <text x="12" y="40" fontSize="20" fontFamily="JetBrains Mono" fill="#fff" fontWeight="600">{pct.toFixed(1)}%</text>
        <text x="108" y="40" fontSize="10" fontFamily="JetBrains Mono" fill="#6d6d78" textAnchor="end">{made}/{total}</text>
      </g>
    </svg>
  );
}

// ── Bar (four factors) ───────────────────────────────────────────────────
function HBar({ label, value, max, color = ACCENT, unit = '', rankPct = null }) {
  const on = useReveal();
  const pct = (value / max) * 100;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 64px', gap: 10, alignItems: 'center', padding: '8px 0' }}>
      <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{label}</div>
      <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 999, overflow: 'hidden', position: 'relative' }}>
        <div style={{
          height: '100%', width: on ? `${pct}%` : '0%',
          background: `linear-gradient(90deg, ${color}aa, ${color})`,
          borderRadius: 999,
          transition: 'width 1.1s cubic-bezier(.2,.7,.2,1)',
        }} />
        {rankPct !== null && (
          <div style={{
            position: 'absolute', top: -3, bottom: -3,
            left: `${rankPct}%`, width: 1.5, background: 'rgba(255,255,255,0.4)',
          }} title="League average" />
        )}
      </div>
      <div className="num" style={{ fontSize: 12, color: '#fff', textAlign: 'right' }}>{value}{unit}</div>
    </div>
  );
}

// ── Win probability wave (live) ──────────────────────────────────────────
function WinProb({ homeProb = 0.5, history = [], homeAbbr = 'HOME', awayAbbr = 'AWAY', homeColor = '#0A84FF', awayColor = '#8E8E93', height = 80 }) {
  const on = useReveal();
  const w = 640, h = height;
  const series = history.length ? history : [homeProb, homeProb];
  const pts = series.map((v, i) => {
    const x = (i / Math.max(1, series.length - 1)) * w;
    // history values are home win probability in [0,1]
    const prob = Math.max(0, Math.min(1, v));
    const y = (1 - prob) * h;
    return [x, y];
  });
  const path = pts.map((p, i) => (i ? 'L' : 'M') + p.join(' ')).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="wp-home" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={homeColor} stopOpacity="0.45" />
          <stop offset="100%" stopColor={homeColor} stopOpacity="0" />
        </linearGradient>
        <clipPath id="wp-clip"><rect x="0" y="0" width={on ? w : 0} height={h} style={{ transition: 'width 1.2s ease' }} /></clipPath>
      </defs>
      <line x1="0" x2={w} y1={h/2} y2={h/2} stroke="rgba(255,255,255,0.08)" strokeDasharray="2 4" />
      <g clipPath="url(#wp-clip)">
        <path d={path + ` L ${w} ${h} L 0 ${h} Z`} fill="url(#wp-home)" />
        <path d={path} fill="none" stroke={homeColor} strokeWidth="2" />
      </g>
      <text x="8" y="14" fontSize="10" fontFamily="JetBrains Mono" fill="#9cc8ff">{homeAbbr} {Math.round(homeProb*100)}%</text>
      <text x={w - 8} y={h - 6} fontSize="10" fontFamily="JetBrains Mono" fill="#a9a9b2" textAnchor="end">{awayAbbr} {Math.round((1-homeProb)*100)}%</text>
    </svg>
  );
}

// ── Donut ────────────────────────────────────────────────────────────────
function Donut({ pct, label, sub, size = 120, color = ACCENT }) {
  const on = useReveal();
  const r = (size - 18) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth="8" strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={on ? c - (c * pct / 100) : c}
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.2,.7,.2,1)' }} />
      <text x={size/2} y={size/2 - 2} textAnchor="middle" fontFamily="JetBrains Mono" fontSize="22" fill="#fff" fontWeight="600">{pct}</text>
      <text x={size/2} y={size/2 + 14} textAnchor="middle" fontFamily="Inter" fontSize="9" fill="#6d6d78" style={{ letterSpacing: '0.1em' }}>{label}</text>
    </svg>
  );
}

Object.assign(window, { Spark, LineArea, Radar, ShotChart, HBar, WinProb, Donut });
