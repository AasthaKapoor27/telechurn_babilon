import { useState, useMemo, useEffect } from 'react';
import { useTheme } from './context/ThemeContext';
import UploadZone from './components/UploadZone';
import SummaryCards from './components/SummaryCards';
import ResultsTable from './components/ResultsTable';
import { predictChurn, downloadPredictions, pingServer } from './api';

function computeStats(results) {
  const total = results.length;
  const high   = results.filter(r => r.risk_level === 'High').length;
  const medium = results.filter(r => r.risk_level === 'Medium').length;
  const low    = results.filter(r => r.risk_level === 'Low').length;
  const avgProb = total > 0
    ? results.reduce((s, r) => s + r.churn_probability, 0) / total
    : 0;
  return { total, high, medium, low, avgProb };
}

/* ── Loading skeleton ─────────────────────────────────────────────── */
function DashboardSkeleton() {
  return (
    <div className="animate-in">
      <div className="section-divider" />
      <div className="skeleton-cards">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="skeleton-card shimmer" />
        ))}
      </div>
      <div className="skeleton-table-wrap">
        <div className="skeleton-thead shimmer" />
        {[...Array(8)].map((_, i) => (
          <div key={i} className="skeleton-row shimmer" />
        ))}
      </div>
    </div>
  );
}

/* ── Sun / Moon icon ──────────────────────────────────────────────── */
function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );
}

/* ── App ──────────────────────────────────────────────────────────── */
export default function App() {
  const { theme, toggle } = useTheme();
  const [file, setFile]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError]     = useState(null);

  useEffect(() => {
    // Proactively wake up the free-tier Render server on page load
    pingServer();
  }, []);

  const stats = useMemo(
    () => (results ? computeStats(results) : null),
    [results]
  );

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const data = await predictChurn(file);
      setResults(data.results);
    } catch (err) {
      let msg = err.message;
      if (err.missingColumns?.length) {
        msg += `\n\nMissing columns: ${err.missingColumns.join(', ')}`;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* ── Topbar ── */}
      <header className="topbar" role="banner">
        <div className="topbar-inner">
          <div className="logo-pill">
            <span className="logo-dot" />
            <span className="logo-text">Babylon Mobile</span>
          </div>
          <span className="logo-sub">Telechurn Analytics Dashboard</span>
          <div className="topbar-spacer" />
          <button
            id="theme-toggle-btn"
            className="theme-toggle"
            onClick={toggle}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="app-container" role="main">
        {/* Page header */}
        <div className="page-header">
          <h1 className="page-title">Churn Prediction Engine</h1>
          <p className="page-subtitle">
            Upload a subscriber data file to run the XGBoost churn model and get instant risk scores.
          </p>
        </div>

        {/* Upload + predict form */}
        <form id="predict-form" onSubmit={handleSubmit} noValidate>
          <UploadZone onFile={setFile} loading={loading} />

          {error && (
            <div className="error-box animate-in" role="alert" aria-live="polite">
              <span className="error-icon">⚠</span>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 13 }}>
                {error}
              </pre>
            </div>
          )}

          <button
            id="predict-btn"
            type="submit"
            className="btn-predict"
            disabled={!file || loading}
            aria-busy={loading}
          >
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.2 }}>
                <div><span className="spinner" /> Analysing subscribers…</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '4px', fontWeight: 'normal' }}>Waking up server, this may take up to a minute on first request</div>
              </div>
            ) : (
              <>⚡ Run Churn Prediction</>
            )}
          </button>
        </form>

        {/* Loading skeleton — shows while API call is in flight */}
        {loading && <DashboardSkeleton />}

        {/* Dashboard — shows after successful prediction */}
        {results && stats && !loading && (
          <>
            <div className="section-divider" />
            <SummaryCards stats={stats} />
            <ResultsTable data={results} onDownload={downloadPredictions} />
          </>
        )}

        {/* Empty state — before first prediction */}
        {!results && !loading && (
          <div className="empty-state">
            <div className="empty-state-icon">📡</div>
            <p className="empty-state-text">
              Upload a subscriber file above to see predictions here.
            </p>
          </div>
        )}
      </main>
    </>
  );
}
