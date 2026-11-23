import { useState } from 'react';
import { ArrowUpRight, CalendarDays, ChevronDown, Database, FolderKanban, Plus, UserRound } from 'lucide-react';

function ProjectCard({ project, count, active, onOpen }) {
  return (
    <button
      type="button"
      className={`data-project-card ${active ? 'is-active' : ''}`}
      onClick={onOpen}
    >
      <span className="data-project-icon"><FolderKanban size={17} /></span>
      <span className="data-project-copy">
        <strong>{project.name}</strong>
        <small>{count} extracted {count === 1 ? 'item' : 'items'}</small>
      </span>
      <ArrowUpRight size={15} />
    </button>
  );
}

function DataRecord({ record, onOpenProject }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article className="data-record">
      <div className="data-record-heading">
        <h3>{record.description}</h3>
        <div className="data-record-actions">
          <button
            type="button"
            className="data-detail-toggle"
            aria-expanded={expanded}
            onClick={() => setExpanded((open) => !open)}
          >
            {expanded ? 'Hide details' : 'View extracted data'}
            <ChevronDown size={13} className={expanded ? 'is-open' : ''} />
          </button>
          <button
            type="button"
            className="data-project-link"
            onClick={() => onOpenProject(record.projectId || null)}
          >
            <FolderKanban size={12} />
            Open in Chat
            <ArrowUpRight size={12} />
          </button>
        </div>
      </div>
      {expanded && (
        <div className="data-record-details">
          {record.evidence && <blockquote>{record.evidence}</blockquote>}
          <div className="data-record-facts">
            <span><UserRound size={13} /> {record.owner || 'Person or group not stated'}</span>
            <span><CalendarDays size={13} /> {record.deadline || 'Date not stated'}</span>
            <span className={`data-priority priority-${record.priority || 'none'}`}>
              {record.priority || 'Priority not stated'}
            </span>
            <span><FolderKanban size={13} /> {record.projectName || 'Unassigned'}</span>
          </div>
        </div>
      )}
    </article>
  );
}

function DataFolder({ folder, onOpenProject }) {
  const [open, setOpen] = useState(true);

  return (
    <section className="data-folder">
      <button
        type="button"
        className="data-folder-head"
        aria-expanded={open}
        onClick={() => setOpen((expanded) => !expanded)}
      >
        <FolderKanban size={17} />
        <span className="data-folder-copy">
          <strong>{folder.name}</strong>
          <small>{folder.records.length} structured {folder.records.length === 1 ? 'item' : 'items'}</small>
        </span>
        <ChevronDown size={15} className={open ? 'is-open' : ''} />
      </button>
      {open && (
        <div className="data-folder-records">
          {folder.records.map((record) => (
            <DataRecord key={record.id} record={record} onOpenProject={onOpenProject} />
          ))}
        </div>
      )}
    </section>
  );
}

export default function DataView({
  records = [],
  projects = [],
  activeProjectId,
  success,
  error,
  onOpenProject,
  onCreateProject,
}) {
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const folders = [...records.reduce((grouped, record) => {
    const id = record.projectId;
    if (!id) return grouped;
    const folder = grouped.get(id) || {
      id,
      name: record.projectName || projects.find((project) => project.id === id)?.name || 'Project',
      records: [],
    };
    folder.records.push(record);
    grouped.set(id, folder);
    return grouped;
  }, new Map()).values()];

  async function createProject(event) {
    event.preventDefault();
    const name = projectName.trim();
    if (!name) return;
    const project = await onCreateProject({ name, description: projectDescription.trim() });
    if (!project) return;
    setProjectName('');
    setProjectDescription('');
    setCreateOpen(false);
  }

  return (
    <main className="data-page">
      <header className="page-header data-page-header">
        <div>
          <h1>Data</h1>
          <p>Structured information extracted from documents. Source files are not stored.</p>
        </div>
        <div className="data-project-create">
          <button type="button" className="btn btn-ink" onClick={() => setCreateOpen(true)}>
            <Plus size={14} /> Add project
          </button>
        </div>
      </header>

      {success && <div className="alert success data-success">{success}</div>}
      {error && <div className="alert error">{error}</div>}

      <section className="data-project-section">
        <div className="data-section-heading">
          <div>
            <h2>Projects</h2>
            <p>Choose a project to continue the conversation in Chat.</p>
          </div>
          <span>{projects.length} projects</span>
        </div>
        <div className="data-project-grid">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              count={records.filter((record) => record.projectId === project.id).length}
              active={activeProjectId === project.id}
              onOpen={() => onOpenProject(project.id)}
            />
          ))}
        </div>
      </section>

      <section className="data-record-section">
        <div className="data-section-heading">
          <div>
            <h2>Extracted records</h2>
            <p>{records.length} structured {records.length === 1 ? 'item' : 'items'} from your briefs</p>
          </div>
        </div>
        {records.length ? (
          <div className="data-folder-list">
            {folders.map((folder) => (
              <DataFolder key={folder.id} folder={folder} onOpenProject={onOpenProject} />
            ))}
          </div>
        ) : (
          <div className="data-empty">
            <Database size={22} />
            <strong>No extracted data yet</strong>
            <p>Extract a brief in Chat and send the structured results here. Only extracted data is kept; the source file is not.</p>
            <button type="button" className="btn btn-ink" onClick={() => onOpenProject(activeProjectId || null)}>
              Open Chat <ArrowUpRight size={14} />
            </button>
          </div>
        )}
      </section>
      {createOpen && (
        <div className="confirm-overlay is-open" onClick={() => setCreateOpen(false)}>
          <form
            className="confirm-card project-create-modal"
            onClick={(event) => event.stopPropagation()}
            onSubmit={createProject}
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-project-title"
          >
            <div className="confirm-mark" aria-hidden>
              <FolderKanban size={18} />
            </div>
            <h3 id="new-project-title">New project</h3>
            <p>Name the brief. Cards can be placed on it from the board.</p>
            <label className="field-label">
              Project name
              <input
                className="input"
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                autoFocus
              />
            </label>
            <label className="field-label">
              Description <span className="count-quiet">· optional</span>
              <textarea
                className="textarea"
                value={projectDescription}
                onChange={(event) => setProjectDescription(event.target.value)}
                rows={3}
              />
            </label>
            <div className="confirm-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setCreateOpen(false);
                  setProjectName('');
                  setProjectDescription('');
                }}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-ink" disabled={!projectName.trim()}>
                Add project
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
