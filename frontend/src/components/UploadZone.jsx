import { useRef, useState } from 'react';

const ACCEPTED_EXT  = ['.csv', '.xlsx', '.xls'];
const ACCEPTED_MIME = [
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];

function formatBytes(bytes) {
  if (bytes < 1024)    return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function UploadZone({ onFile, loading }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);

  function accept(f) {
    const ext = '.' + f.name.split('.').pop().toLowerCase();
    if (!ACCEPTED_EXT.includes(ext) && !ACCEPTED_MIME.includes(f.type)) {
      alert('Please upload a .csv or .xlsx file.');
      return;
    }
    setFile(f);
    onFile(f);
  }

  function remove(e) {
    e.stopPropagation();
    setFile(null);
    onFile(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) accept(f);
  }

  function onInputChange(e) {
    const f = e.target.files[0];
    if (f) accept(f);
  }

  return (
    <div>
      <div
        id="upload-zone"
        className={`upload-zone${dragging ? ' dragging' : ''}`}
        onClick={() => !loading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        role="button"
        tabIndex={0}
        aria-label="Upload subscriber data file"
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          id="file-input"
          accept=".csv,.xlsx,.xls"
          style={{ display: 'none' }}
          onChange={onInputChange}
          aria-hidden="true"
        />

        <div className="upload-icon">📊</div>
        <p className="upload-title">
          {dragging ? 'Drop it here!' : 'Drop your subscriber file'}
        </p>
        <p className="upload-hint">
          Drag & drop or click to browse
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 16 }}>
          <span className="upload-badge"><span>📄</span> .csv</span>
          <span className="upload-badge"><span>📗</span> .xlsx</span>
        </div>
      </div>

      {file && (
        <div className="file-preview animate-in">
          <div className="file-preview-icon">
            {file.name.endsWith('.csv') ? '📄' : '📗'}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="file-preview-name">{file.name}</div>
            <div className="file-preview-meta">{formatBytes(file.size)}</div>
          </div>
          <button
            className="file-preview-remove"
            onClick={remove}
            aria-label="Remove file"
            id="remove-file-btn"
            disabled={loading}
            style={{ marginLeft: 'auto' }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
