import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Paperclip,
  Send,
  ArrowLeft,
  Hourglass,
  UserRound,
  FileText,
  X,
  FilePen,
  FolderKanban,
  Trash2,
  FileWarning,
  BookmarkCheck,
  Eraser,
  ScanText,
  MessagesSquare,
} from 'lucide-react';
import { SAMPLE_MESSAGE } from '../constants';
import { ExtractCard, ExtractLoader, ExtractedText } from '../components/extract/ExtractPanel';

const DEMO_CV_EXTRACTION = `DEMO PREVIEW — this is sample display text, not the contents of the uploaded CV.

Professional profile
This section would present a concise overview of the candidate's background and the type of roles they are seeking. The summary should reflect only details found in the document and should avoid adding unsupported claims.

Security operations
Extracted information in this section could include security monitoring responsibilities, alert triage, incident escalation, and the way findings are recorded. Each item would be linked to the source wording so it can be checked before being used.

Technical support
This section could summarize support activities such as investigating reported issues, documenting resolutions, communicating progress, and escalating problems that need specialist attention. Specific systems, tools, and service levels would only be included if the CV states them.

Skills and tools
Relevant technical skills, platforms, and tools would be listed here as separate, editable details. Related information can be grouped for readability while keeping the original meaning intact.

Education and certifications
Qualifications, training, and certifications would be shown with their names and dates when those details are present. Missing dates or other unstated information would remain blank rather than being inferred.

Review notes
This long placeholder demonstrates how an extracted document preview can be edited. Replace it with verified extracted text before relying on any details.`;

function looksBinary(text) {
  const head = String(text || '').slice(0, 80);
  return head.includes('%PDF') || /[\x00-\x08\x0E-\x1F]/.test(head);
}

function combineSource(files, notes) {
  const parts = [];
  files.forEach((file) => {
    const binary = looksBinary(file.content) || /\.pdf$/i.test(file.name);
    const isClintonCv = /clinton khoza cv \(soc and support\)\.pdf/i.test(file.name);
    parts.push(
      binary
        ? isClintonCv
          ? DEMO_CV_EXTRACTION
          : `DEMO PREVIEW — extracted text for ${file.name} is shown here when available.`
        : file.content
    );
  });
  if (notes.trim()) {
    parts.push(notes.trim());
  }
  return parts.join('\n\n');
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function ConfirmRemove({ open, title, excerpt, body, confirmLabel = 'Remove', onCancel, onConfirm }) {
  if (!open) return null;
  return (
    <div className="confirm-overlay is-open" onClick={onCancel}>
      <div className="confirm-card" onClick={(event) => event.stopPropagation()} role="alertdialog" aria-modal="true">
        <div className="confirm-mark" aria-hidden>
          <FileWarning size={18} strokeWidth={1.7} />
        </div>
        <h3>{title}</h3>
        {excerpt && <blockquote className="confirm-excerpt">{excerpt}</blockquote>}
        <p>{body}</p>
        <div className="confirm-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            <BookmarkCheck size={14} strokeWidth={1.8} />
            Keep it
          </button>
          <button type="button" className="btn btn-danger-solid" onClick={onConfirm}>
            <Eraser size={14} strokeWidth={1.8} />
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProjectRows({ items, activeId, onSelect, onDelete }) {
  return (
    <div className="rail-list">
      <div className={`rail-row is-action ${activeId ? '' : 'is-active'}`}>
        <button type="button" className="rail-main" onClick={() => onSelect?.(null)}>
          <FolderKanban size={14} />
          <span>Unassigned</span>
        </button>
      </div>
      {items.map((project) => (
        <div
          key={project.id}
          className={`rail-row is-action ${activeId === project.id ? 'is-active' : ''}`}
        >
          <button
            type="button"
            className="rail-main"
            onClick={() => onSelect?.(project)}
          >
            <FolderKanban size={14} />
            <span>{project.name}</span>
          </button>
          <button
            type="button"
            className="rail-delete"
            aria-label={`Delete ${project.name}`}
            onClick={() => onDelete(project)}
          >
            <Trash2 size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}

export default function ChatView({
  loading,
  error,
  source,
  tasks,
  saving,
  success,
  projects = [],
  activeProjectId,
  people = [],
  onTextChange,
  onExtract,
  onAskAgent,
  onToggle,
  onChange,
  onRewrite,
  onSendToData,
  onClear,
  onSelectProject,
  onDeleteProject,
}) {
  const fileRef = useRef(null);
  const threadRef = useRef(null);
  const [mode, setMode] = useState('extract');
  const [draft, setDraft] = useState('');
  const [files, setFiles] = useState([]);
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [lastSent, setLastSent] = useState(null);
  const [showCards, setShowCards] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [agentDraft, setAgentDraft] = useState('');
  const [agentMessages, setAgentMessages] = useState([]);
  const [agentBusy, setAgentBusy] = useState(false);
  const [loader, setLoader] = useState(false);
  const loaderStarted = useRef(0);
  const extractedCount = tasks?.length || 0;
  const combined = useMemo(() => combineSource(files, draft), [files, draft]);
  const canSend = combined.trim().length >= 10 && !loading;
  const activeProject = projects.find((project) => project.id === activeProjectId);

  useEffect(() => {
    onTextChange(combined);
  }, [combined, onTextChange]);

  useEffect(() => {
    setMode('extract');
  }, [activeProjectId]);

  useEffect(() => {
    const el = threadRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [loading, extractedCount, error, files.length, draft, success, mode, agentMessages, agentBusy]);

  useEffect(() => {
    if (loading) {
      loaderStarted.current = Date.now();
      setLoader(true);
      return undefined;
    }
    const wait = Math.max(420, 2600 - (Date.now() - loaderStarted.current));
    const hide = window.setTimeout(() => setLoader(false), wait);
    return () => window.clearTimeout(hide);
  }, [loading]);

  async function addFiles(fileList) {
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;
    const next = await Promise.all(
      incoming.map(async (file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
        name: file.name,
        size: file.size,
        content: /\.pdf$/i.test(file.name) ? '' : await readFileAsText(file),
      }))
    );
    setFiles((prev) => [...prev, ...next]);
    setAssignmentOpen(true);
  }

  function assignUploadedFiles(project = null) {
    onSelectProject?.(project);
    setAssignmentOpen(false);
  }

  function handleSend() {
    if (!canSend) return;
    setLastSent({
      files: files.map((file) => ({ id: file.id, name: file.name })),
      notes: draft.trim(),
      text: combined,
    });
    setShowCards(false);
    onExtract(combined, files);
    setFiles([]);
  }

  function handleContinueToTasks() {
    const extractedText = lastSent?.text || '';
    setShowCards(true);
    onExtract(extractedText);
  }

  function handleExtractedTextChange(extractedText) {
    setLastSent((previous) => previous ? { ...previous, text: extractedText } : previous);
  }

  function handleBack() {
    if (mode === 'agent') {
      setMode('extract');
    } else if (showCards) {
      setShowCards(false);
    } else if (lastSent) {
      setDraft(lastSent.text || '');
      setLastSent(null);
      setFiles([]);
      setShowCards(false);
      onClear?.();
    }
  }

  function handleClear() {
    setDraft('');
    setFiles([]);
    setLastSent(null);
    setShowCards(false);
    setAgentDraft('');
    setAgentMessages([]);
    setMode('extract');
    setAssignmentOpen(false);
    onClear?.();
  }

  function handleExtractBrief() {
    setDraft(SAMPLE_MESSAGE);
    setLastSent({ files: [], notes: SAMPLE_MESSAGE, text: SAMPLE_MESSAGE });
    setShowCards(false);
    onExtract(SAMPLE_MESSAGE, []);
  }

  async function handleAsk() {
    const text = agentDraft.trim();
    if (!text || agentBusy) return;
    const next = [...agentMessages, { role: 'user', content: text }];
    setAgentMessages(next);
    setAgentDraft('');
    setAgentBusy(true);
    try {
      const data = await onAskAgent?.(next);
      setAgentMessages([
        ...next,
        { role: 'assistant', content: data?.reply || 'No reply from the register.' },
      ]);
    } catch (err) {
      setAgentMessages([...next, { role: 'assistant', content: err.message }]);
    } finally {
      setAgentBusy(false);
    }
  }

  function onDrop(event) {
    event.preventDefault();
    setDragging(false);
    if (mode === 'extract') addFiles(event.dataTransfer.files);
  }

  const emptyExtract = !loading && !lastSent && extractedCount === 0 && !error;
  const emptyAgent = !agentMessages.length && !agentBusy;

  return (
    <>
      <div className="chat-layout">
        <section className="chat-panel">
          <div className="chat-panel-head">
            <button
              type="button"
              className="icon-btn chat-back"
              aria-label="Back"
              title="Back"
              onClick={handleBack}
              disabled={mode !== 'agent' && !showCards && !lastSent}
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1>{mode === 'agent' ? 'Agent' : 'Extract'}</h1>
              <p>
                {mode === 'agent'
                  ? `Ask about ${activeProject?.name || 'unassigned data'} in this visual preview.`
                  : `Working in ${activeProject?.name || 'Unassigned'}. A brief in, structured data out.`}
              </p>
            </div>
            <div className="chat-head-actions">
              <button
                type="button"
                className="icon-btn chat-clear"
                aria-label="Clear chat"
                title="Clear chat"
                onClick={() =>
                  setConfirm({
                    title: 'Clear this chat?',
                    body: 'The current brief and extracted tasks will be cleared. Data already added will remain.',
                    confirmLabel: 'Clear chat',
                    onConfirm: () => {
                      setConfirm(null);
                      handleClear();
                    },
                  })
                }
              >
                <Eraser size={15} />
              </button>
              <div className="mode-switch" role="tablist" aria-label="Desk mode">
                <button
                  type="button"
                  role="tab"
                  className={mode === 'extract' ? 'is-active' : ''}
                  aria-selected={mode === 'extract'}
                  aria-label="Extract"
                  title="Extract"
                  onClick={() => setMode('extract')}
                >
                  <ScanText size={16} />
                </button>
                <button
                  type="button"
                  role="tab"
                  className={mode === 'agent' ? 'is-active' : ''}
                  aria-selected={mode === 'agent'}
                  aria-label="Agent"
                  title="Agent"
                  onClick={() => setMode('agent')}
                >
                  <MessagesSquare size={16} />
                </button>
              </div>
            </div>
          </div>

          <ExtractLoader active={loader} isDocument={Boolean(lastSent?.files.length)} />
          <div
            ref={threadRef}
            className={`chat-thread ${dragging ? 'is-dragging' : ''}`}
            aria-live="polite"
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            {mode === 'extract' && emptyExtract && (
              <div className="brief-stage">
                <article className="brief-paper">
                  <div className="brief-kicker">Client message</div>
                  <p>{SAMPLE_MESSAGE}</p>
                  <button type="button" className="btn btn-ink" onClick={handleExtractBrief}>
                    <ScanText size={14} />
                    Extract tasks
                  </button>
                </article>
                <p className="brief-hint">
                  Owner, date and priority stay blank unless the brief states them. Accept the
                  extracted tasks to add them to Data.
                </p>
              </div>
            )}

            {mode === 'extract' && lastSent && extractedCount === 0 && !loading && (
              <article className="bubble user">
                <div className="avatar user-avatar" aria-hidden>
                  <UserRound size={15} />
                </div>
                <div className="bubble-body">
                  {lastSent.files.length > 0 && (
                    <div className="file-chip-row" style={{ marginBottom: 8 }}>
                      {lastSent.files.map((file) => (
                        <span className="file-chip" key={file.id}>
                          <FileText size={12} /> {file.name}
                        </span>
                      ))}
                    </div>
                  )}
                  {lastSent.notes ? (
                    <p className="bubble-text">{lastSent.notes}</p>
                  ) : (
                    <p className="bubble-text muted">Brief sent with no extra notes.</p>
                  )}
                </div>
              </article>
            )}

            {mode === 'extract' && !loader && extractedCount > 0 && !showCards && (
              <ExtractedText
                text={lastSent?.text || ''}
                fileName={lastSent?.files.length === 1 ? lastSent.files[0].name : undefined}
                onTextChange={handleExtractedTextChange}
                onContinue={handleContinueToTasks}
              />
            )}

            {mode === 'extract' && !loader && extractedCount > 0 && showCards && (
              <div className="extract-stack">
                <header className="extract-lane-head">
                  <div>
                    <h2>From the brief</h2>
                    <p>Check each card. What was not stated is left blank — nothing is invented.</p>
                  </div>
                  <span>{extractedCount}</span>
                </header>
                <div className="extract-grid">
                  {tasks.map((task, index) => (
                    <ExtractCard
                      key={`card-${index}`}
                      task={task}
                      people={people}
                      projects={projects}
                      activeProjectId={activeProjectId}
                      onAccept={() => onToggle(index, task.approved === true ? null : true)}
                      onReject={() => onToggle(index, task.approved === false ? null : false)}
                      onPatch={(field, value) => onChange(index, field, value)}
                      onRewrite={onRewrite ? (prompt) => onRewrite(index, prompt) : undefined}
                    />
                  ))}
                </div>
                <div className="extract-foot">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={saving || !tasks.length || tasks.every((task) => task.sentToData)}
                    onClick={() => onSendToData({ acceptAll: true })}
                  >
                    Accept all &amp; add to Data
                  </button>
                </div>
              </div>
            )}

            {mode === 'extract' && success && (
              <div className="alert success" style={{ marginTop: 8 }}>
                {success}
              </div>
            )}

            {mode === 'extract' && error && (
              <article className="bubble bot error-bubble">
                <div className="bubble-body">
                  <p>{error}</p>
                </div>
              </article>
            )}

            {mode === 'agent' && emptyAgent && (
              <div className="desk-void">
                <div className="void-mark" aria-hidden>
                  <MessagesSquare size={22} />
                </div>
                <h2>Ask the register</h2>
                <p>Who holds a card, what sits on a project, which paper was filed — ask in plain language.</p>
              </div>
            )}

            {mode === 'agent' &&
              agentMessages.map((message, index) => (
                <article className={`bubble ${message.role === 'user' ? 'user' : 'bot'}`} key={`${message.role}-${index}`}>
                  <div className={`avatar ${message.role === 'user' ? 'user-avatar' : 'bot-avatar'}`} aria-hidden>
                    {message.role === 'user' ? <UserRound size={15} /> : <MessagesSquare size={14} />}
                  </div>
                  <div className="bubble-body">
                    <p className="bubble-text">{message.content}</p>
                  </div>
                </article>
              ))}

            {mode === 'agent' && agentBusy && (
              <article className="bubble bot">
                <div className="avatar bot-avatar" aria-hidden>
                  <Hourglass size={15} />
                </div>
                <div className="bubble-body">
                  <p className="typing">Looking through the register…</p>
                </div>
              </article>
            )}

            {dragging && mode === 'extract' && (
              <div className="drop-hint">Drop a brief onto the desk</div>
            )}
          </div>

          {mode === 'extract' ? (
            <div className="composer">
              {files.length > 0 && (
                <div className="composer-files">
                  {files.map((file) => (
                    <span className="file-chip" key={file.id}>
                      <FileText size={12} />
                      {file.name}
                      <button
                        type="button"
                        className="chip-remove"
                        aria-label={`Remove ${file.name}`}
                        onClick={() => setFiles((prev) => prev.filter((item) => item.id !== file.id))}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="composer-box">
                <button
                  type="button"
                  className="composer-attach"
                  onClick={() => fileRef.current?.click()}
                  title="Upload a file (PDF, text, or CSV)"
                  aria-label="Upload a file"
                >
                  <Paperclip size={18} />
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.txt,.md,.csv,application/pdf,text/plain,text/csv"
                  aria-label="Choose a document file"
                  hidden
                  multiple
                  onChange={(e) => {
                    addFiles(e.target.files);
                    e.target.value = '';
                  }}
                />
                <textarea
                  className="composer-input"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={
                    files.length ? 'Add a line of instruction…' : 'Paste a brief, or attach a paper…'
                  }
                  rows={3}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn btn-primary composer-send"
                  onClick={handleSend}
                  disabled={!canSend}
                >
                  <Send size={14} />
                  {loading ? 'Reading…' : 'Extract'}
                </button>
              </div>
            </div>
          ) : (
            <div className="composer">
              <div className="composer-box is-ask">
                <textarea
                  className="composer-input"
                  value={agentDraft}
                  onChange={(e) => setAgentDraft(e.target.value)}
                  placeholder="Ask about the board, a person, a paper, a project…"
                  rows={3}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      handleAsk();
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn btn-ink composer-send"
                  onClick={handleAsk}
                  disabled={!agentDraft.trim() || agentBusy}
                >
                  <Send size={14} />
                  {agentBusy ? 'Reading…' : 'Ask'}
                </button>
              </div>
            </div>
          )}
        </section>

        <aside className="chat-side">
          {(files.length > 0 || draft.trim() || extractedCount > 0) && (
            <div className="rail-section">
              <div className="rail-label">Sitting</div>
              <div className="rail-stats">
                {source || 'idle'}
                <em> · {extractedCount} ready</em>
              </div>
              <div className="rail-list">
                {files.map((file) => (
                  <div className="rail-row" key={file.id}>
                    <FileText size={14} />
                    <span>{file.name}</span>
                  </div>
                ))}
                {draft.trim() && (
                  <div className="rail-row">
                    <FilePen size={14} />
                    <span>Extra notes</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="rail-section rail-grow">
            <div className="rail-label">Chat context</div>
            <ProjectRows
              items={projects}
              activeId={activeProjectId}
              onSelect={onSelectProject}
              onDelete={(project) =>
                setConfirm({
                  title: 'Remove this project?',
                  excerpt: project.name,
                  body: 'The project and its cards will leave the register. This cannot be undone.',
                  confirmLabel: 'Remove project',
                  onConfirm: () => {
                    setConfirm(null);
                    onDeleteProject?.(project.id);
                  },
                })
              }
            />
          </div>

        </aside>
      </div>
      {assignmentOpen && (
        <div className="confirm-overlay is-open" onClick={() => assignUploadedFiles(null)}>
          <div
            className="confirm-card upload-assignment"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="upload-assignment-title"
          >
            <div className="confirm-mark" aria-hidden>
              <FolderKanban size={18} strokeWidth={1.7} />
            </div>
            <h3 id="upload-assignment-title">Assign this document to a project?</h3>
            <p>The uploaded file is used for extraction only and will not be stored.</p>
            <div className="upload-project-options">
              {projects.map((project) => (
                <button
                  type="button"
                  className={`btn ${activeProjectId === project.id ? 'btn-ink' : 'btn-secondary'}`}
                  key={project.id}
                  onClick={() => assignUploadedFiles(project)}
                >
                  <FolderKanban size={14} />
                  {project.name}
                </button>
              ))}
            </div>
            <div className="confirm-actions">
              <button type="button" className="btn btn-secondary" onClick={() => assignUploadedFiles(null)}>
                Skip — keep unassigned
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmRemove
        open={Boolean(confirm)}
        title={confirm?.title}
        excerpt={confirm?.excerpt}
        body={confirm?.body}
        confirmLabel={confirm?.confirmLabel}
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm?.onConfirm?.()}
      />
    </>
  );
}
