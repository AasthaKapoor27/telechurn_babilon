import { useState, useMemo } from 'react';

const PAGE_SIZE = 25;

/* ── Sub-components ─────────────────────────────────────────────── */
function RiskBadge({ level }) {
  const cls = level === 'High'   ? 'badge badge-high'
            : level === 'Medium' ? 'badge badge-medium'
            : 'badge badge-low';
  return (
    <span className={cls}>
      <span className="badge-dot" />
      {level}
    </span>
  );
}

function PredChip({ value }) {
  return value === 1
    ? <span className="pred-chip pred-churn">✗ Churn</span>
    : <span className="pred-chip pred-no-churn">✓ Retain</span>;
}

function ProbBar({ value }) {
  const pct   = (value * 100).toFixed(1);
  const color = value > 0.7  ? 'var(--red)'
              : value >= 0.4 ? 'var(--amber)'
              : 'var(--green)';
  return (
    <div className="prob-bar-wrap">
      <div className="prob-bar-bg">
        <div className="prob-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="prob-text" style={{ color }}>{pct}%</span>
    </div>
  );
}

/* Desktop table columns to display */
const DISPLAY_COLS = [
  'OUT_CALLS', 'CALLS_CHARGE', 'SMS_MMS', 'GPRS_MB',
  'IDD_CALLS', 'ROAMING_CHARGE', 'AGE', 'Gender',
];

/* Mobile: show only the most meaningful fields */
const MOBILE_FIELDS = ['OUT_CALLS', 'GPRS_MB', 'AGE'];

function fmt(val) {
  if (val === undefined || val === null) return '—';
  if (typeof val === 'number') return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return String(val);
}

/* ── Pagination helpers ─────────────────────────────────────────── */
function pageNumbers(page, totalPages) {
  const delta = 2;
  const left  = Math.max(1, page - delta);
  const right = Math.min(totalPages, page + delta);
  const nums = [];
  for (let i = left; i <= right; i++) nums.push(i);
  return nums;
}

/* ── Main component ─────────────────────────────────────────────── */
export default function ResultsTable({ data, onDownload }) {
  const [page, setPage]       = useState(1);
  const [sortDir, setSortDir] = useState('desc');
  const [pageKey, setPageKey] = useState(0); // for page-change animation

  const sorted = useMemo(() => {
    return [...data].sort((a, b) =>
      sortDir === 'desc'
        ? b.churn_probability - a.churn_probability
        : a.churn_probability - b.churn_probability
    );
  }, [data, sortDir]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const pageData   = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleSort() {
    setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    setPage(1);
  }

  function goPage(n) {
    setPage(n);
    setPageKey(k => k + 1); // triggers page-transition re-render
  }

  const nums = pageNumbers(page, totalPages);

  return (
    <div className="animate-in">
      {/* Toolbar */}
      <div className="dashboard-toolbar">
        <h2 className="section-title">
          Prediction Results
          <span style={{ marginLeft: 10, fontSize: 12, fontWeight: 400, color: 'var(--text-muted)' }}>
            {data.length.toLocaleString()} subscribers
          </span>
        </h2>
        <button
          id="sort-btn"
          className={`btn-icon${sortDir ? ' active' : ''}`}
          onClick={toggleSort}
          title="Sort by churn probability"
        >
          {sortDir === 'desc' ? '↓' : '↑'} Risk
        </button>
        <button
          id="download-btn"
          className="btn-icon"
          onClick={onDownload}
          title="Download predictions as CSV"
        >
          ⬇ Export CSV
        </button>
      </div>

      {/* Table wrap */}
      <div className="table-wrap">

        {/* ── Desktop table ── */}
        <div className="table-scroll">
          <table className="results-table table-desktop" aria-label="Churn prediction results">
            <thead>
              <tr>
                <th>#</th>
                {DISPLAY_COLS.map(col => <th key={col}>{col}</th>)}
                <th>Prediction</th>
                <th
                  className={`sortable${sortDir ? ' sort-active' : ''}`}
                  onClick={toggleSort}
                  aria-sort={sortDir === 'desc' ? 'descending' : 'ascending'}
                  title="Click to toggle sort"
                >
                  Churn Prob <span className="sort-icon">{sortDir === 'desc' ? '▼' : '▲'}</span>
                </th>
                <th>Risk Level</th>
              </tr>
            </thead>
            <tbody key={pageKey} className="page-transition">
              {pageData.map((row, idx) => {
                const globalIdx = (page - 1) * PAGE_SIZE + idx + 1;
                return (
                  <tr key={globalIdx}>
                    <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>{globalIdx}</td>
                    {DISPLAY_COLS.map(col => (
                      <td key={col}>{fmt(row[col])}</td>
                    ))}
                    <td><PredChip value={row.churn_prediction} /></td>
                    <td className="prob-bar-cell"><ProbBar value={row.churn_probability} /></td>
                    <td><RiskBadge level={row.risk_level} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Mobile card list ── */}
        <div className="table-mobile">
          <div className="mobile-card-list" key={pageKey}>
            {pageData.map((row, idx) => {
              const globalIdx = (page - 1) * PAGE_SIZE + idx + 1;
              return (
                <div key={globalIdx} className="mobile-card page-transition">
                  {/* Header: index + risk badge */}
                  <div className="mobile-card-header">
                    <span className="mobile-card-idx">#{globalIdx}</span>
                    <RiskBadge level={row.risk_level} />
                    <span className="mobile-card-pred">
                      <PredChip value={row.churn_prediction} />
                    </span>
                  </div>

                  {/* Probability bar */}
                  <div className="mobile-card-prob-row">
                    <span className="mobile-card-prob-label">Churn Prob</span>
                    <div style={{ flex: 1 }}>
                      <ProbBar value={row.churn_probability} />
                    </div>
                  </div>

                  {/* Key fields grid */}
                  <div className="mobile-card-fields">
                    {MOBILE_FIELDS.map(col => (
                      <div key={col} className="mobile-field">
                        <span className="mobile-field-label">{col}</span>
                        <span className="mobile-field-value">{fmt(row[col])}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pagination */}
        <div className="pagination">
          <span className="pagination-info">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, data.length)} of {data.length.toLocaleString()}
          </span>
          <div className="pagination-controls">
            <button
              id="page-prev"
              className="page-btn"
              onClick={() => goPage(Math.max(1, page - 1))}
              disabled={page === 1}
              aria-label="Previous page"
            >‹</button>

            {page > 3 && (
              <>
                <button className="page-btn" onClick={() => goPage(1)}>1</button>
                {page > 4 && (
                  <span style={{ color: 'var(--text-muted)', fontSize: 13, padding: '0 2px' }}>…</span>
                )}
              </>
            )}

            {nums.map(n => (
              <button
                key={n}
                id={`page-${n}`}
                className={`page-btn${n === page ? ' page-active' : ''}`}
                onClick={() => goPage(n)}
                aria-current={n === page ? 'page' : undefined}
              >
                {n}
              </button>
            ))}

            {page < totalPages - 2 && (
              <>
                {page < totalPages - 3 && (
                  <span style={{ color: 'var(--text-muted)', fontSize: 13, padding: '0 2px' }}>…</span>
                )}
                <button className="page-btn" onClick={() => goPage(totalPages)}>
                  {totalPages}
                </button>
              </>
            )}

            <button
              id="page-next"
              className="page-btn"
              onClick={() => goPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              aria-label="Next page"
            >›</button>
          </div>
        </div>
      </div>
    </div>
  );
}
