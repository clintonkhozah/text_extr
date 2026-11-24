import { useMemo, useState } from 'react';
import { Search, Stamp } from 'lucide-react';
import TaskCard from '../components/TaskCard';

function sourceLabel(source, health) {
  const value = source || health?.llm || 'not_configured';
  if (value === 'llm') return 'ChatGPT';
  if (value === 'not_configured') return 'Not configured';
  return value;
}

function Metric({ label, value, hint, tone }) {
  return (
    <div className="sheet-metric">
      <div className="sheet-metric-label">{label}</div>
      <div className={`sheet-metric-value ${tone || ''}`}>{value}</div>
      {hint && <div className="sheet-metric-hint">{hint}</div>}
    </div>
  );
}

export default function ReviewView({
  tasks,
  savedCount = 0,
  documentCount = 0,
  health,
  source,
  saving,
  error,
  success,
  onToggle,
  onChange,
  onApproveAll,
  onSave,
}) {
  const [query, setQuery] = useState('');
  const [priority, setPriority] = useState('all');

  const confirmed = tasks.filter((task) => task.approved === true);
  const open = tasks.filter((task) => task.approved !== true);
  const desk = tasks.length;
  const readyPct = desk ? Math.round((confirmed.length / desk) * 1000) / 10 : 0;
  const confirmedPct = desk ? Math.round((confirmed.length / desk) * 10) / 10 : 0;
  const live = health?.status === 'ok';

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks.filter((task) => {
      const text = `${task.editedDescription || task.description} ${task.editedOwner || task.owner || ''}`;
      const matchQuery = !q || text.toLowerCase().includes(q);
      const prio = task.editedPriority ?? task.priority ?? '';
      const matchPrio = priority === 'all' || prio === priority;
      return matchQuery && matchPrio;
    });
  }, [tasks, query, priority]);

  return (
    <div className="clearance-page">
      <div className="page-header">
        <div>
          <h1>Clearance</h1>
          <p>
            Read each candidate against the brief, then write only what you have confirmed
            to the register.
          </p>
        </div>
      </div>

      <section className="sheet">
        <div className="sheet-row">
          <div className="sheet-kicker">This sitting</div>
          <div className="sheet-metrics">
            <Metric label="On the desk" value={desk} hint="Candidates in this brief" />
            <Metric label="Confirmed" value={confirmed.length} hint="Ready to write" />
            <Metric
              label="Still open"
              value={open.length}
              hint="Unconfirmed or declined"
              tone={open.length ? 'warn' : 'good'}
            />
            <Metric
              label="Clearance"
              value={`${readyPct}%`}
              hint="Confirmed of the sitting"
            />
          </div>
        </div>

        <div className="sheet-row">
          <div className="sheet-kicker">Register</div>
          <div className="sheet-metrics">
            <Metric label="On the board" value={savedCount} hint="Items already written" />
            <Metric label="Documents" value={documentCount} hint="Papers on file" />
            <Metric
              label="Source"
              value={sourceLabel(source, health)}
              hint="How this sitting was read"
            />
            <Metric
              label="Service"
              value={live ? 'Open' : 'Quiet'}
              hint={live ? 'Desk accepting work' : 'Waiting on the desk'}
              tone={live ? 'good' : ''}
            />
          </div>
        </div>

        <div className="sheet-split">
          <div className="sheet-pane">
            <div className="sheet-pane-head">
              <strong>Confirmed</strong>
              <span className={confirmed.length ? 'good' : 'warn'}>{confirmedPct}%</span>
            </div>
            <p>
              {confirmed.length
                ? `${confirmed.length} item${confirmed.length === 1 ? '' : 's'} marked to write.`
                : 'Nothing confirmed this sitting.'}
            </p>
          </div>
          <div className="sheet-pane">
            <div className="sheet-pane-head">
              <strong>Still open</strong>
              <span className={open.length ? 'warn' : 'good'}>
                {desk ? `${Math.round((open.length / desk) * 1000) / 10}%` : '0%'}
              </span>
            </div>
            <p>
              {open.length
                ? `${open.length} still need a decision before they may be written.`
                : 'No production captured this sitting.'}
            </p>
          </div>
        </div>
      </section>

      {error && <div className="alert error">{error}</div>}
      {success && <div className="alert success">{success}</div>}

      <section className="register-panel">
        <div className="register-top">
          <div>
            <h2>Clearance register</h2>
            <p>Amend owner, date and priority only where the brief is explicit. Declined items never leave this desk.</p>
          </div>
          <div className="register-actions">
            <select
              className="select compact-select"
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
              aria-label="Filter by priority"
            >
              <option value="all">All priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onApproveAll}
              disabled={!tasks.length}
            >
              <Stamp size={11} /> Confirm all
            </button>
            <button
              type="button"
              className="btn btn-ink"
              onClick={onSave}
              disabled={saving || confirmed.length === 0}
            >
              {saving ? 'Writing…' : `+ Write to register`}
            </button>
          </div>
        </div>

        <div className="register-tools">
          <label className="register-search">
            <Search size={12} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search this register…"
            />
          </label>
        </div>

        {!tasks.length ? (
          <div className="register-empty">No candidates on the desk this sitting.</div>
        ) : !filtered.length ? (
          <div className="register-empty">No items match this search.</div>
        ) : (
          <div className="task-list">
            {filtered.map((task) => {
              const index = tasks.indexOf(task);
              return (
                <TaskCard
                  key={`${task.description}-${index}`}
                  task={task}
                  index={index}
                  editable
                  onToggle={onToggle}
                  onChange={onChange}
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
