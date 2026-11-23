import { useMemo, useState } from 'react';
import { AlertTriangle, Eye, Pencil, Trash2, X } from 'lucide-react';

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '—';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function codeFor(person, index) {
  if (person.code) return person.code;
  const prefix = person.type === 'group' ? 'G' : 'P';
  return `${prefix}${String(index + 1).padStart(3, '0')}`;
}

export default function UsersView({
  people = [],
  currentUser,
  error,
  onAdd,
  onUpdate,
  onDelete,
}) {
  const [query, setQuery] = useState('');
  const [entry, setEntry] = useState({ type: 'person', name: '', email: '' });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return people.filter((person) => {
      const hay = `${person.type || 'person'} ${person.name} ${person.email || ''}`.toLowerCase();
      return !q || hay.includes(q);
    });
  }, [people, query]);

  async function handleAdd(event) {
    event.preventDefault();
    const name = entry.name.trim();
    if (!name) return;
    await onAdd?.({
      type: entry.type,
      name,
      email: entry.type === 'person' ? entry.email.trim() : '',
    });
    setEntry({ type: 'person', name: '', email: '' });
    setOpen(false);
  }

  async function handleSaveEdit(event) {
    event.preventDefault();
    if (!editing) return;
    await onUpdate?.(editing.id, {
      name: editing.name,
      email: editing.email,
      status: editing.status,
      type: editing.type || 'person',
    });
    setEditing(null);
  }

  return (
    <div className="people-page">
      <div className="page-header">
        <div>
          <h1>
            People &amp; groups <span className="count-quiet">· {filtered.length} of {people.length}</span>
          </h1>
          <p>Add people and teams that can be assigned to work taken from a brief.</p>
        </div>
        <button type="button" className="btn btn-ink" onClick={() => setOpen(true)}>
          Add
        </button>
      </div>

      {error && error !== 'Not Found' && <div className="alert error">{error}</div>}

      <label className="register-search people-search">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search people and groups…"
        />
      </label>

      <section className="role-table">
        <header className="role-head">
          <span>ID</span>
          <span>Name</span>
          <span>Contact / group</span>
          <span>Status</span>
          <span>Actions</span>
        </header>
        {filtered.map((person, index) => (
          <article className="role-row" key={person.id}>
            <span className="role-id">{codeFor(person, people.indexOf(person) === -1 ? index : people.indexOf(person))}</span>
            <div className="role-name">
              <span className="role-badge tone-ss">
                {initials(person.name)}
              </span>
              <strong>
                {person.name}
                {currentUser?.email && person.email === currentUser.email ? ' · you' : ''}
              </strong>
              <small className="person-type">{person.type === 'group' ? 'Group' : 'Person'}</small>
            </div>
            <span className="role-desc">{person.type === 'group' ? 'Team or work group' : person.email || '—'}</span>
            <span className={`role-status ${(person.status || 'Active').toLowerCase()}`}>
              {person.status || 'Active'}
            </span>
            <div className="role-actions">
              <button type="button" className="icon-btn" aria-label="View" onClick={() => setViewing(person)}>
                <Eye size={14} />
              </button>
              <button type="button" className="icon-btn" aria-label="Edit" onClick={() => setEditing({ ...person })}>
                <Pencil size={14} />
              </button>
              <button
                type="button"
                className="icon-btn danger"
                aria-label="Remove"
                onClick={() => setDeleting(person)}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </article>
        ))}
        {!filtered.length && <div className="role-empty">No people or groups match this search.</div>}
      </section>
      <div className="role-foot">
        Showing {filtered.length} of {people.length} {people.length === 1 ? 'entry' : 'entries'}
      </div>

      {open && (
        <div className="sheet-overlay is-open" onClick={() => setOpen(false)}>
          <aside className="task-sheet slim-sheet" onClick={(event) => event.stopPropagation()}>
            <header className="task-sheet-head">
              <div>
                <div className="sheet-kicker">Register</div>
                <h2>Add person or group</h2>
              </div>
              <button type="button" className="icon-btn" onClick={() => setOpen(false)} aria-label="Close">
                <X size={15} />
              </button>
            </header>
            <form className="invite-form" onSubmit={handleAdd}>
              <label className="field-label">
                Type
                <select
                  className="select"
                  value={entry.type}
                  onChange={(event) => setEntry((prev) => ({ ...prev, type: event.target.value }))}
                >
                  <option value="person">Person</option>
                  <option value="group">Group / team</option>
                </select>
              </label>
              <label className="field-label">
                {entry.type === 'group' ? 'Group name' : 'Name'}
                <input
                  className="input"
                  required
                  value={entry.name}
                  onChange={(event) => setEntry((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder={entry.type === 'group' ? 'e.g. Website team' : 'Name as shown on a task'}
                />
              </label>
              {entry.type === 'person' && (
                <label className="field-label">
                  Email <span className="count-quiet">· optional</span>
                  <input
                    className="input"
                    type="email"
                    value={entry.email}
                    onChange={(event) => setEntry((prev) => ({ ...prev, email: event.target.value }))}
                    placeholder="name@office.com"
                  />
                </label>
              )}
              <button type="submit" className="btn btn-ink">Add</button>
            </form>
          </aside>
        </div>
      )}

      {editing && (
        <div className="sheet-overlay is-open" onClick={() => setEditing(null)}>
          <aside
            className="task-sheet person-edit-sheet"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="person-edit-title"
          >
            <header className="task-sheet-head person-edit-head">
              <div>
                <div className="sheet-kicker">People &amp; groups</div>
                <h2 id="person-edit-title">Edit {editing.type === 'group' ? 'group' : 'person'}</h2>
              </div>
              <button type="button" className="icon-btn" onClick={() => setEditing(null)} aria-label="Close">
                <X size={15} />
              </button>
            </header>
            <form className="invite-form person-edit-form" onSubmit={handleSaveEdit}>
              <label className="field-label">
                {editing.type === 'group' ? 'Group name' : 'Name'}
                <input
                  className="input"
                  value={editing.name}
                  onChange={(event) => setEditing((prev) => ({ ...prev, name: event.target.value }))}
                />
              </label>
              {editing.type !== 'group' && (
                <label className="field-label">
                  Email
                  <input
                    className="input"
                    type="email"
                    value={editing.email || ''}
                    onChange={(event) => setEditing((prev) => ({ ...prev, email: event.target.value }))}
                  />
                </label>
              )}
              <div className="edit-grid">
                <label className="field-label">
                  Status
                  <select
                    className="select"
                    value={editing.status || 'Active'}
                    onChange={(event) => setEditing((prev) => ({ ...prev, status: event.target.value }))}
                  >
                    <option>Active</option>
                    <option>Invited</option>
                    <option>Quiet</option>
                  </select>
                </label>
              </div>
              <button type="submit" className="btn btn-ink">
                Save changes
              </button>
            </form>
          </aside>
        </div>
      )}

      {viewing && (
        <div className="sheet-overlay is-open" onClick={() => setViewing(null)}>
          <aside
            className="task-sheet person-record-sheet"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="person-record-title"
          >
            <header className="task-sheet-head person-record-head">
              <div>
                <div className="sheet-kicker">People &amp; groups</div>
                <h2 id="person-record-title">{viewing.type === 'group' ? 'Group profile' : 'Person profile'}</h2>
              </div>
              <button type="button" className="icon-btn" onClick={() => setViewing(null)} aria-label="Close">
                <X size={15} />
              </button>
            </header>
            <section className="person-record-identity">
              <span className={`person-record-avatar ${viewing.type === 'group' ? 'is-group' : ''}`}>
                {initials(viewing.name)}
              </span>
              <div>
                <h3>{viewing.name}</h3>
              </div>
            </section>
            <section className="person-record-information">
              <h3>Directory details</h3>
              <dl className="person-record-details">
                <div>
                  <dt>Entry type</dt>
                  <dd>{viewing.type === 'group' ? 'Group / team' : 'Person'}</dd>
                </div>
                <div>
                  <dt>{viewing.type === 'group' ? 'Assignment label' : 'Email address'}</dt>
                  <dd>{viewing.type === 'group' ? viewing.name : viewing.email || 'Not provided'}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>
                    <span className={`person-record-status status-${(viewing.status || 'Active').toLowerCase()}`}>
                      {viewing.status || 'Active'}
                    </span>
                  </dd>
                </div>
              </dl>
            </section>
          </aside>
        </div>
      )}

      {deleting && (
        <div className="confirm-overlay is-open" onClick={() => setDeleting(null)}>
          <div
            className="confirm-card"
            onClick={(event) => event.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="remove-person-title"
          >
            <div className="confirm-mark" aria-hidden>
              <AlertTriangle size={18} strokeWidth={1.7} />
            </div>
            <h3 id="remove-person-title">Remove {deleting.type === 'group' ? 'this group' : 'this person'}?</h3>
            <blockquote className="confirm-excerpt">{deleting.name}</blockquote>
            <p>They will no longer be available for new task assignments.</p>
            <div className="confirm-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setDeleting(null)}>
                Keep it
              </button>
              <button
                type="button"
                className="btn btn-danger-solid"
                onClick={() => {
                  onDelete?.(deleting.id);
                  setDeleting(null);
                }}
              >
                <Trash2 size={14} /> Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
