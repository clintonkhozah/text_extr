import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Pencil, X } from 'lucide-react';
import { TaskSheet } from '../../views/SavedView';
import './extract.css';

const STAGES = ['Reading the brief', 'Identifying tasks', 'Checking what was not stated'];

function looksBinary(text) {
  const head = String(text || '').slice(0, 80);
  return head.includes('%PDF') || /[\x00-\x08\x0E-\x1F]/.test(head);
}

function cleanTitle(value) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text || looksBinary(text) || text.includes('%PDF')) return 'Review the attached paper';
  return text.slice(0, 180);
}

export function ExtractLoader({ active, isDocument = false }) {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const radius = 34;
  const ring = 2 * Math.PI * radius;
  const offset = ring * (1 - Math.min(progress, 100) / 100);

  useEffect(() => {
    if (active) {
      setVisible(true);
      setProgress(8);
      const timer = window.setInterval(() => {
        setProgress((value) => (value >= 94 ? value : value + 1.05));
      }, 42);
      return () => window.clearInterval(timer);
    }
    setProgress(100);
    const hide = window.setTimeout(() => setVisible(false), 420);
    return () => window.clearTimeout(hide);
  }, [active]);

  if (!visible) return null;
  const stageIndex = Math.min(STAGES.length - 1, Math.floor(progress / 34));

  return (
    <div className="extract-loader" role="status" aria-live="polite">
      <div className="extract-loader-card">
        <div className="loader-ring" aria-hidden>
          <svg viewBox="0 0 80 80">
            <circle className="loader-ring-track" cx="40" cy="40" r={radius} />
            <circle
              className="loader-ring-fill"
              cx="40"
              cy="40"
              r={radius}
              strokeDasharray={ring}
              strokeDashoffset={offset}
            />
          </svg>
          <strong>{Math.round(Math.min(progress, 100))}</strong>
        </div>
        <p className="loader-stage">{isDocument ? 'Extracting text…' : `${STAGES[stageIndex]}…`}</p>
        {!isDocument && (
          <ol className="loader-steps">
            {STAGES.map((label, index) => (
              <li key={label} className={index < stageIndex ? 'is-done' : index === stageIndex ? 'is-now' : ''}>
                {label}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

export function ExtractedText({ text, fileName, onTextChange, onContinue }) {
  const [editing, setEditing] = useState(false);
  const [editedText, setEditedText] = useState(text);

  useEffect(() => {
    setEditedText(text);
  }, [text]);

  return (
    <div className="brief-stage">
      <article className="brief-paper">
        <div className="brief-kicker">Extracted text{fileName ? ` · ${fileName}` : ''}</div>
        {editing ? (
          <label className="extracted-text-editor">
            <span>Edit extracted text</span>
            <textarea
              value={editedText}
              onChange={(event) => setEditedText(event.target.value)}
              rows={12}
            />
          </label>
        ) : (
          <p className="extracted-body">{text}</p>
        )}
        <div className="extracted-text-actions">
          {editing ? (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setEditedText(text);
                  setEditing(false);
                }}
              >
                Cancel edit
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  onTextChange(editedText);
                  setEditing(false);
                }}
              >
                <Check size={13} /> Save text
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-secondary" onClick={() => setEditing(true)}>
              <Pencil size={13} /> Edit extracted text
            </button>
          )}
          <button type="button" className="btn btn-ink" onClick={onContinue}>
            Continue to extracted tasks
          </button>
        </div>
      </article>
    </div>
  );
}

export function ExtractCard({
  task,
  people = [],
  projects = [],
  activeProjectId,
  onAccept,
  onReject,
  onPatch,
}) {
  const title = cleanTitle(task.editedDescription || task.description);
  const owner = task.editedOwner ?? task.owner ?? '';
  const deadline = task.editedDeadline ?? task.deadline ?? '';
  const priority = task.editedPriority ?? task.priority ?? '';
  const accepted = task.approved === true;
  const rejected = task.approved === false;
  const [editDraft, setEditDraft] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const initialProjectId = task.editedProjectId !== undefined
    ? task.editedProjectId
    : task.projectId || activeProjectId || null;

  useEffect(() => {
    if (!editDraft || editOpen) return undefined;
    const timer = window.setTimeout(() => setEditDraft(null), 320);
    return () => window.clearTimeout(timer);
  }, [editDraft, editOpen]);

  function openEditor() {
    const project = projects.find((item) => item.id === initialProjectId);
    setEditDraft({
      description: title,
      owner,
      deadline: deadline || null,
      priority: priority || null,
      status: task.editedStatus || task.status || 'incoming',
      projectId: initialProjectId,
      projectName: task.editedProjectName !== undefined
        ? task.editedProjectName
        : task.projectName || project?.name || null,
    });
    setEditOpen(true);
  }

  return (
    <article className={`board-card extract-card priority-${priority || 'none'} ${accepted ? 'is-accepted' : ''} ${rejected ? 'is-rejected' : ''}`}>
      <div className="board-card-priority" aria-hidden />
      <div className="board-card-body">
        <div className="extract-card-head">
          <p className="board-card-title">{title}</p>
          <button type="button" className="icon-btn" aria-label="Edit card" onClick={openEditor}>
            <Pencil size={13} />
          </button>
        </div>
        {task.evidence && <blockquote className="extract-quote">{task.evidence}</blockquote>}
        <div className="extract-facts">
          <div className="extract-fact">
            <span>Person or group</span>
            <strong>{owner || 'Not stated'}</strong>
          </div>
          <div className={`extract-fact ${deadline ? '' : 'is-blank'}`}>
            <span>Date</span>
            <strong>{deadline || 'Not stated'}</strong>
          </div>
          <div className={`extract-fact ${priority ? '' : 'is-blank'}`}>
            <span>Priority</span>
            <strong>{priority || 'Not stated'}</strong>
          </div>
        </div>
        <div className="extract-card-actions">
          <button type="button" className={`btn btn-ghost-reject ${rejected ? 'is-on' : ''}`} onClick={onReject}>
            <X size={13} /> Reject
          </button>
          <button type="button" className={`btn btn-ghost-accept ${accepted ? 'is-on' : ''}`} onClick={onAccept}>
            <Check size={13} /> {accepted ? 'Accepted' : 'Accept'}
          </button>
        </div>
      </div>
      {editDraft && createPortal(
        <TaskSheet
          task={editDraft}
          open={editOpen}
          people={people}
          projects={projects}
          allowUnassignedProject
          onClose={() => setEditOpen(false)}
          onChange={(patch) => setEditDraft((current) => ({ ...current, ...patch }))}
          onSave={() => {
            onPatch('editedDescription', editDraft.description);
            onPatch('editedOwner', editDraft.owner);
            onPatch('editedDeadline', editDraft.deadline);
            onPatch('editedPriority', editDraft.priority);
            onPatch('editedStatus', editDraft.status);
            onPatch('editedProjectId', editDraft.projectId);
            onPatch('editedProjectName', editDraft.projectName);
          }}
        />,
        document.body
      )}
    </article>
  );
}
