import { Play } from 'lucide-react';

export default function ExtractView({
  text,
  loading,
  error,
  notes,
  source,
  onTextChange,
  onExtract,
}) {
  return (
    <>
      <div className="page-header">
        <div>
          <h1>Extract tasks</h1>
          <p>
            Review extracted tasks before saving them under a project. Unknown owners, dates, and
            priorities stay blank — nothing is invented.
          </p>
        </div>
      </div>

      <div className="layout-split">
        <section className="panel">
          <h2>Source message</h2>
          <p className="subtle">Unstructured text in → structured candidates out. Nothing is saved yet.</p>

          <label className="field-label" htmlFor="message">Message</label>
          <textarea
            id="message"
            className="textarea"
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder="Paste text from a brief or document…"
          />

          <div className="row spread" style={{ marginTop: 14 }}>
            <span className="subtle" style={{ margin: 0 }}>
              Mode: <strong>{source || 'not run'}</strong>
            </span>
            <button
              type="button"
              className="btn btn-primary"
              onClick={onExtract}
              disabled={loading || text.trim().length < 10}
            >
              <Play size={14} />
              {loading ? 'Extracting…' : 'Extract tasks'}
            </button>
          </div>

          {error && <div className="alert error" style={{ marginTop: 12 }}>{error}</div>}
        </section>

        <aside className="panel">
          <div className="row spread" style={{ marginBottom: 8 }}>
            <h2 style={{ margin: 0 }}>Extraction notes</h2>
            <span className="badge preview">PREVIEW</span>
          </div>
          <p className="subtle">
            Accuracy checks surface here — schema validation, missing fields, and fallback notices.
          </p>
          {notes?.length ? (
            <div className="notes">
              {notes.map((note) => (
                <div className="note" key={note}>{note}</div>
              ))}
            </div>
          ) : (
            <div className="empty">Run extraction to see validation notes.</div>
          )}
          <div className="code-box" style={{ marginTop: 14 }}>
{`POST /api/extract
→ reviewRequired: true
→ tasks[].owner | deadline | priority
   may be null when not stated`}
          </div>
        </aside>
      </div>
    </>
  );
}
