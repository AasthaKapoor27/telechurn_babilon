const CARD_CONFIGS = [
  {
    key: 'total',
    label: 'Total Subscribers',
    icon: '👥',
    accent: '#6366f1',
    fmt: (v) => v.toLocaleString(),
  },
  {
    key: 'high',
    label: 'High Risk',
    icon: '🔴',
    accent: '#f87171',
    fmt: (v) => v.toLocaleString(),
  },
  {
    key: 'medium',
    label: 'Medium Risk',
    icon: '🟡',
    accent: '#fbbf24',
    fmt: (v) => v.toLocaleString(),
  },
  {
    key: 'low',
    label: 'Low Risk',
    icon: '🟢',
    accent: '#34d399',
    fmt: (v) => v.toLocaleString(),
  },
  {
    key: 'avgProb',
    label: 'Avg Churn Prob',
    icon: '📈',
    accent: '#818cf8',
    fmt: (v) => `${(v * 100).toFixed(1)}%`,
  },
];

export default function SummaryCards({ stats }) {
  return (
    <div className="cards-grid">
      {CARD_CONFIGS.map(({ key, label, icon, accent, fmt }) => (
        <div
          key={key}
          className="stat-card animate-in"
          style={{ '--card-accent': accent }}
        >
          <span className="stat-icon">{icon}</span>
          <div className="stat-label">{label}</div>
          <div className="stat-value" style={{ color: accent }}>
            {fmt(stats[key])}
          </div>
        </div>
      ))}
    </div>
  );
}
