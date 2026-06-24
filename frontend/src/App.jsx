import { useState, useMemo } from 'react';
import UploadZone from './components/UploadZone';
import SummaryCards from './components/SummaryCards';
import ResultsTable from './components/ResultsTable';
import { predictChurn, downloadPredictions } from './api';

function computeStats(results) {
  const total = results.length;
  const high = results.filter((r) => r.risk_level === 'High').length;
  const medium = results.filter((r) => r.risk_level === 'Medium').length;
  const low = results.filter((r) => r.risk_level === 'Low').length;
  const avgProb =
    total > 0
      ? results.reduce((s, r) => s + r.churn_probability, 0) / total
      : 0;
  return { total, high, medium, low, avgProb };
}

export default function App() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

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
              <>
                <span className="spinner" />
                Analysing subscribers…
              </>
            ) : (
              <>
                ⚡ Run Churn Prediction
              </>
            )}
          </button>
        </form>

        {/* Dashboard */}
        {results && stats && (
          <>
            <div className="section-divider" />
            <SummaryCards stats={stats} />
            <ResultsTable data={results} onDownload={downloadPredictions} />
          </>
        )}

        {/* Empty illustration before first prediction */}
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
