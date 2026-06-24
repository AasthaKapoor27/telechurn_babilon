/* ── SVG ring chart (pure CSS/SVG, no library) ──────────────────── */
function RingChart({ value, color, size = 48 }) {
  const r    = size * 0.375;            // 18 for size=48
  const circ = 2 * Math.PI * r;
  const pct  = Math.min(1, Math.max(0, value || 0));
  const dash = pct * circ;

  return (
    <svg
      className="ring-chart"
      width={size} height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
    >
      {/* Track */}
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="var(--border)" strokeWidth="3.5"
      />
      {/* Progress */}
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth="3.5"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
    </svg>
  );
}

/* ── Card configs ───────────────────────────────────────────────── */
const CARDS = [
  {
    key:     'total',
    label:   'Total Subscribers',
    accent:  'var(--accent)',
    cssVar:  '#6366f1',
    ring:    null,           // full ring (100%)
    fmt:     (v) => v.toLocaleString(),
    trend:   null,
  },
  {
    key:     'high',
    label:   'High Risk',
    accent:  'var(--red)',
    cssVar:  '#f87171',
    ring:    (s) => s.total > 0 ? s.high / s.total : 0,
    fmt:     (v) => v.toLocaleString(),
    trend:   (s) => s.total > 0 ? `${((s.high / s.total) * 100).toFixed(1)}% of total` : null,
  },
  {
    key:     'medium',
    label:   'Medium Risk',
    accent:  'var(--amber)',
    cssVar:  '#fbbf24',
    ring:    (s) => s.total > 0 ? s.medium / s.total : 0,
    fmt:     (v) => v.toLocaleString(),
    trend:   (s) => s.total > 0 ? `${((s.medium / s.total) * 100).toFixed(1)}% of total` : null,
  },
  {
    key:     'low',
    label:   'Low Risk',
    accent:  'var(--green)',
    cssVar:  '#34d399',
    ring:    (s) => s.total > 0 ? s.low / s.total : 0,
    fmt:     (v) => v.toLocaleString(),
    trend:   (s) => s.total > 0 ? `${((s.low / s.total) * 100).toFixed(1)}% of total` : null,
  },
  {
    key:     'avgProb',
    label:   'Avg Churn Prob',
    accent:  'var(--accent-light)',
    cssVar:  '#818cf8',
    ring:    (s) => s.avgProb,
    fmt:     (v) => `${(v * 100).toFixed(1)}%`,
    trend:   null,
  },
];

export default function SummaryCards({ stats }) {
  return (
    <div className="cards-grid">
      {CARDS.map(({ key, label, accent, cssVar, ring, fmt, trend }) => {
        const ringVal = ring ? ring(stats) : 1;

        return (
          <div
            key={key}
            className="stat-card animate-in"
            style={{ '--card-accent': accent }}
          >
            {/* Ring chart */}
            <RingChart value={ringVal} color={cssVar} />

            {/* Body */}
            <div className="stat-card-body">
              <div className="stat-label">{label}</div>
              <div className="stat-value" style={{ color: accent }}>
                {fmt(stats[key])}
              </div>
              {trend && trend(stats) && (
                <div className="stat-trend">{trend(stats)}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
