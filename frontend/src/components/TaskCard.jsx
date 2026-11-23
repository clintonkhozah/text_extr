import { Check, X, PencilLine } from 'lucide-react';

function PriorityPill({ priority }) {
  if (!priority) {
    return <span className="pill unknown">Priority unknown</span>;
  }
  return <span className={`pill ${priority}`}>{priority}</span>;
}

export default function TaskCard({
  task,
  index,
  onToggle,
  onChange,
  editable = false,
}) {
  const approved = task.approved === true;
  const rejected = task.approved === false;

  return (
    <article
      className={`task-card ${approved ? 'approved' : ''} ${rejected ? 'rejected' : ''}`}
    >
      <div className="task-top">
        <div>
          <p className="task-title">
            {index + 1}. {task.editedDescription || task.description}
          </p>
          <div className="pill-row">
            <span className={`pill ${task.owner || task.editedOwner ? '' : 'unknown'}`}>
              Owner: {task.editedOwner ?? task.owner ?? 'unknown'}
            </span>
            <span className={`pill ${task.deadline || task.editedDeadline ? '' : 'unknown'}`}>
              Deadline: {task.editedDeadline ?? task.deadline ?? 'unknown'}
            </span>
            <PriorityPill priority={task.editedPriority ?? task.priority} />
            {typeof task.confidence === 'number' && (
              <span className="pill">Confidence {(task.confidence * 100).toFixed(0)}%</span>
            )}
          </div>
        </div>
        {editable && (
          <div className="row">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => onToggle(index, true)}
            >
              <Check size={13} /> Confirm
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => onToggle(index, false)}
            >
              <X size={13} /> Decline
            </button>
          </div>
        )}
      </div>

      {task.evidence && <p className="evidence">Evidence: {task.evidence}</p>}
      {task.unknowns?.length > 0 && (
        <p className="evidence">Unknowns left null: {task.unknowns.join(', ')}</p>
      )}

      {editable && (
        <div className="edit-grid">
          <div className="full">
            <label className="field-label">
              <PencilLine size={12} style={{ marginRight: 4 }} />
              Edit description
            </label>
            <input
              className="input"
              value={task.editedDescription ?? task.description}
              onChange={(e) => onChange(index, 'editedDescription', e.target.value)}
            />
          </div>
          <div>
            <label className="field-label">Owner</label>
            <input
              className="input"
              placeholder="Leave blank if unknown"
              value={task.editedOwner ?? task.owner ?? ''}
              onChange={(e) => onChange(index, 'editedOwner', e.target.value || null)}
            />
          </div>
          <div>
            <label className="field-label">Deadline</label>
            <input
              className="input"
              placeholder="Leave blank if unknown"
              value={task.editedDeadline ?? task.deadline ?? ''}
              onChange={(e) => onChange(index, 'editedDeadline', e.target.value || null)}
            />
          </div>
          <div>
            <label className="field-label">Priority</label>
            <select
              className="select"
              value={task.editedPriority ?? task.priority ?? ''}
              onChange={(e) => onChange(index, 'editedPriority', e.target.value || null)}
            >
              <option value="">unknown</option>
              <option value="urgent">urgent</option>
              <option value="high">high</option>
              <option value="medium">medium</option>
              <option value="low">low</option>
            </select>
          </div>
        </div>
      )}
    </article>
  );
}
