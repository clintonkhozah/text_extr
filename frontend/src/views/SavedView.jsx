import { useEffect, useMemo, useRef, useState } from 'react';
import {
  GripVertical,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Plus,
  Trash2,
  X,
  Search,
  FolderKanban,
  FolderOpen,
  BookmarkCheck,
  Eraser,
  FileWarning,
  Briefcase,
  Building2,
  Landmark,
  Library,
  Layers,
  Scale,
  Flame,
  ArrowUp,
  Equal,
  ArrowDown,
  Minus,
  Inbox,
  Timer,
  Clock,
  CircleCheck,
  Check,
} from 'lucide-react';

const PRIORITY_OPTIONS = [
  { id: '', label: 'Unset', Icon: Minus, tone: 'none' },
  { id: 'urgent', label: 'Urgent', Icon: Flame, tone: 'urgent' },
  { id: 'high', label: 'High', Icon: ArrowUp, tone: 'high' },
  { id: 'medium', label: 'Medium', Icon: Equal, tone: 'medium' },
  { id: 'low', label: 'Low', Icon: ArrowDown, tone: 'low' },
];

const STATUS_OPTIONS = [
  { id: 'incoming', label: 'Incoming', Icon: Inbox, tone: 'slate' },
  { id: 'in_progress', label: 'In progress', Icon: Timer, tone: 'amber' },
  { id: 'waiting', label: 'Waiting on', Icon: Clock, tone: 'blue' },
  { id: 'done', label: 'Done', Icon: CircleCheck, tone: 'green' },
];

const PROJECT_ICONS = [FolderKanban, Briefcase, Building2, Landmark, Library, Layers, Scale];

const LANES = [
  { id: 'incoming', label: 'Incoming', tone: 'slate' },
  { id: 'in_progress', label: 'In progress', tone: 'amber' },
  { id: 'waiting', label: 'Waiting on', tone: 'blue' },
  { id: 'done', label: 'Done', tone: 'green' },
];

function laneFor(status) {
  if (status === 'in_progress') return 'in_progress';
  if (status === 'waiting' || status === 'blocked') return 'waiting';
  if (status === 'done' || status === 'complete') return 'done';
  return 'incoming';
}

function firstLetter(name) {
  return String(name || '').trim().charAt(0).toUpperCase() || '?';
}

function initials(name) {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function parseDeadline(value) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = new Date(`${value}T12:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDeadline(value) {
  const date = parseDeadline(value);
  if (!date) return value || '';
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function monthMatrix(year, month) {
  const first = new Date(year, month, 1);
  const start = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < start; i += 1) cells.push(null);
  for (let day = 1; day <= days; day += 1) cells.push(new Date(year, month, day));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function hueFromName(name) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) % 360;
  return hash;
}

function Avatar({ name, letter }) {
  const hue = name ? hueFromName(name) : 0;
  return (
    <i
      className={`avatar-disc ${name ? '' : 'is-empty'}`}
      title={name || 'Unassigned'}
      aria-hidden
      style={
        name
          ? { background: `hsl(${hue} 48% 88%)`, color: `hsl(${hue} 42% 28%)` }
          : undefined
      }
    >
      {name ? (letter ? firstLetter(name) : initials(name)) : ''}
    </i>
  );
}

function BoardCard({ task, showProject, onDragStart, onOpen }) {
  return (
    <article
      className={`board-card priority-${task.priority || 'none'}`}
      draggable
      onDragStart={(event) => onDragStart(event, task.id)}
      onClick={() => onOpen(task)}
    >
      <div className="board-card-priority" aria-hidden />
      <div className="board-card-body">
        <div className="board-card-top">
          <GripVertical size={13} className="drag-handle" />
          <p className="board-card-title">{task.description}</p>
          <button
            type="button"
            className="icon-btn"
            aria-label="Open item settings"
            onClick={(event) => {
              event.stopPropagation();
              onOpen(task);
            }}
          >
            <MoreHorizontal size={14} />
          </button>
        </div>
        {showProject && task.projectName && (
          <div className="board-card-project">{task.projectName}</div>
        )}
        <div className="board-card-meta">
          <div className="assignee">
            <Avatar name={task.owner} />
            <span>{task.owner || 'Unassigned'}</span>
          </div>
          <span className={`priority-chip ${task.priority || 'unknown'}`}>
            {task.priority || 'unset'}
          </span>
        </div>
        {task.deadline && (
          <div className="board-card-date">
            <Calendar size={11} />
            {formatDeadline(task.deadline)}
          </div>
        )}
      </div>
    </article>
  );
}

function useMenu() {
  const [open, setOpen] = useState(false);
  const root = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function onDoc(event) {
      if (!root.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return { open, setOpen, root };
}

function ProjectMark({ name }) {
  if (!name) {
    return (
      <span className="project-mark is-empty" aria-hidden>
        <FolderOpen size={11} />
      </span>
    );
  }
  const hue = hueFromName(name);
  const Icon = PROJECT_ICONS[hue % PROJECT_ICONS.length];
  return (
    <span
      className="project-mark"
      aria-hidden
      style={{
        background: `hsl(${hue} 42% 92%)`,
        color: `hsl(${hue} 38% 28%)`,
      }}
    >
      <Icon size={11} />
    </span>
  );
}

function ProjectPicker({ value, projects, onChange, allowUnassigned = false }) {
  const menu = useMenu();
  const selected = projects.find((project) => project.id === value);

  function choose(project) {
    onChange(project);
    menu.setOpen(false);
  }

  return (
    <div className="picker" ref={menu.root}>
      <button type="button" className="picker-trigger" onClick={() => menu.setOpen((prev) => !prev)}>
        <ProjectMark name={selected?.name || ''} />
        <span className="picker-label">
          {selected?.name || (allowUnassigned ? 'Unassigned' : 'Choose project')}
        </span>
        <ChevronDown size={13} />
      </button>
      {menu.open && (
        <div className="picker-menu">
          {allowUnassigned && (
            <button
              type="button"
              className={`picker-option ${!value ? 'is-active' : ''}`}
              onClick={() => choose(null)}
            >
              <ProjectMark name="" />
              Unassigned
            </button>
          )}
          {projects.map((project) => (
            <button
              type="button"
              key={project.id}
              className={`picker-option ${value === project.id ? 'is-active' : ''}`}
              onClick={() => choose(project)}
            >
              <ProjectMark name={project.name} />
              {project.name}
            </button>
          ))}
          {!projects.length && <span className="picker-empty">Create a project first</span>}
        </div>
      )}
    </div>
  );
}

function ChoicePicker({ value, options, onChange }) {
  const menu = useMenu();
  const selected = options.find((option) => option.id === value) || options[0];
  const SelectedIcon = selected?.Icon || Minus;

  function choose(id) {
    onChange(id);
    menu.setOpen(false);
  }

  return (
    <div className="picker" ref={menu.root}>
      <button type="button" className="picker-trigger" onClick={() => menu.setOpen((prev) => !prev)}>
        <span className={`choice-mark tone-${selected?.tone || 'none'}`}>
          <SelectedIcon size={11} />
        </span>
        <span className="picker-label">{selected?.label}</span>
        <ChevronDown size={13} />
      </button>
      {menu.open && (
        <div className="picker-menu">
          {options.map((option) => {
            const Icon = option.Icon;
            const active = option.id === value || (!value && option.id === '');
            return (
              <button
                type="button"
                key={option.id || 'empty'}
                className={`picker-option ${active ? 'is-active' : ''}`}
                onClick={() => choose(option.id)}
              >
                <span className={`choice-mark tone-${option.tone}`}>
                  <Icon size={11} />
                </span>
                {option.label}
                {active && <Check size={13} className="picker-check" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AssigneePicker({ value, people, onChange }) {
  const menu = useMenu();
  const selected = people.find((person) => person.name === value);

  function choose(name) {
    onChange(name);
    menu.setOpen(false);
  }

  return (
    <div className="picker" ref={menu.root}>
      <button type="button" className="picker-trigger" onClick={() => menu.setOpen((prev) => !prev)}>
        <Avatar name={selected?.name || ''} letter />
        <span className="picker-label">{selected?.name || 'Unassigned'}</span>
        <ChevronDown size={13} />
      </button>
      {menu.open && (
        <div className="picker-menu">
          <button
            type="button"
            className={`picker-option ${!value ? 'is-active' : ''}`}
            onClick={() => choose(null)}
          >
            <Avatar name="" letter />
            Unassigned
          </button>
          {people.map((person) => (
            <button
              type="button"
              key={person.id || person.name}
              className={`picker-option ${value === person.name ? 'is-active' : ''}`}
              onClick={() => choose(person.name)}
            >
              <Avatar name={person.name} letter />
              {person.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DatePicker({ value, onChange }) {
  const selected = parseDeadline(value);
  const menu = useMenu();
  const [cursor, setCursor] = useState(() => selected || new Date());

  useEffect(() => {
    if (selected) setCursor(selected);
  }, [value]);

  const cells = monthMatrix(cursor.getFullYear(), cursor.getMonth());
  const title = cursor.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });

  return (
    <div className="picker date-picker" ref={menu.root}>
      <button type="button" className="picker-trigger" onClick={() => menu.setOpen((prev) => !prev)}>
        <Calendar size={13} />
        <span className="picker-label">{selected ? formatDeadline(value) : 'Select a date'}</span>
        <ChevronDown size={13} />
      </button>
      {menu.open && (
        <div className="cal-menu">
          <div className="cal-nav">
            <button
              type="button"
              className="icon-btn"
              aria-label="Previous month"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            >
              <ChevronLeft size={14} />
            </button>
            <strong>{title}</strong>
            <button
              type="button"
              className="icon-btn"
              aria-label="Next month"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            >
              <ChevronRight size={14} />
            </button>
          </div>
          <div className="cal-grid">
            {WEEKDAYS.map((day) => (
              <span key={day} className="cal-dow">
                {day}
              </span>
            ))}
            {cells.map((day, index) => {
              if (!day) return <span key={`empty-${index}`} className="cal-slot" />;
              const iso = toIsoDate(day);
              const isSel = selected && toIsoDate(selected) === iso;
              const isToday = toIsoDate(new Date()) === iso;
              return (
                <button
                  type="button"
                  key={iso}
                  className={`cal-day ${isSel ? 'is-selected' : ''} ${isToday ? 'is-today' : ''}`}
                  onClick={() => {
                    onChange(iso);
                    menu.setOpen(false);
                  }}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectDialog({ open, name, onChange, onCancel, onSubmit }) {
  const inputRef = useRef(null);
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const frame = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(frame);
    }
    setShown(false);
    const timer = window.setTimeout(() => setMounted(false), 220);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (open && shown) inputRef.current?.focus();
  }, [open, shown]);

  if (!mounted) return null;

  return (
    <div className={`modal-overlay ${shown ? 'is-open' : ''}`} onClick={onCancel}>
      <aside
        className="card-modal project-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-project-title"
      >
        <header className="card-modal-head">
          <div>
            <div className="sheet-kicker">Register</div>
            <h2 id="new-project-title">New project</h2>
            <p>Name the brief. Cards can be placed on it from the board.</p>
          </div>
          <button type="button" className="icon-btn" onClick={onCancel} aria-label="Close">
            <X size={16} />
          </button>
        </header>
        <form onSubmit={onSubmit}>
          <div className="card-modal-body">
            <label className="field-label full">
              Project name
              <input
                ref={inputRef}
                className="input"
                value={name}
                onChange={(event) => onChange(event.target.value)}
                placeholder="Course pages"
              />
            </label>
          </div>
          <footer className="card-modal-foot">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn btn-ink" disabled={!name.trim()}>
              <Plus size={13} />
              Add project
            </button>
          </footer>
        </form>
      </aside>
    </div>
  );
}

function ConfirmDialog({ open, title, excerpt, body, confirmLabel = 'Remove', onCancel, onConfirm }) {
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const frame = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(frame);
    }
    setShown(false);
    const timer = window.setTimeout(() => setMounted(false), 220);
    return () => window.clearTimeout(timer);
  }, [open]);

  if (!mounted) return null;

  return (
    <div
      className={`confirm-overlay ${shown ? 'is-open' : ''}`}
      onClick={onCancel}
    >
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

export function TaskSheet({
  task,
  open,
  people,
  projects,
  onClose,
  onChange,
  onDelete,
  onSave,
  allowUnassignedProject = false,
}) {
  if (!task) return null;

  return (
    <div className={`modal-overlay ${open ? 'is-open' : ''}`} onClick={onClose}>
      <aside
        className={`card-modal priority-${task.priority || 'none'}`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="amend-card-title"
      >
        <header className="card-modal-head">
          <div>
            <div className="sheet-kicker">Sitting</div>
            <h2 id="amend-card-title">Amend the card</h2>
            <p>Assign a person, set a date, and place the work on a project — or leave it unassigned.</p>
          </div>
          <div className="sheet-head-actions">
            {onDelete && (
              <button type="button" className="icon-btn danger" onClick={onDelete} aria-label="Delete task">
                <Trash2 size={16} />
              </button>
            )}
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
              <X size={16} />
            </button>
          </div>
        </header>

        <div className="card-modal-body">
          <label className="field-label full">
            Description
            <textarea
              className="textarea"
              value={task.description}
              onChange={(event) => onChange({ description: event.target.value })}
            />
          </label>

          <div className="field-label">
            Assigned to
            <AssigneePicker
              value={task.owner || ''}
              people={people}
              onChange={(owner) => onChange({ owner })}
            />
          </div>

          <div className="field-label">
            Project
            <ProjectPicker
              value={task.projectId || ''}
              projects={projects}
              allowUnassigned={allowUnassignedProject}
              onChange={(project) =>
                onChange({
                  projectId: project?.id || null,
                  projectName: project?.name || null,
                })
              }
            />
          </div>

          <div className="field-label">
            Priority
            <ChoicePicker
              value={task.priority || ''}
              options={PRIORITY_OPTIONS}
              onChange={(priority) => onChange({ priority: priority || null })}
            />
          </div>

          <div className="field-label">
            Status
            <ChoicePicker
              value={laneFor(task.status)}
              options={STATUS_OPTIONS}
              onChange={(status) => onChange({ status })}
            />
          </div>

          <div className="field-label">
            Date / deadline
            <DatePicker
              value={task.deadline}
              onChange={(deadline) => onChange({ deadline })}
            />
          </div>
        </div>

        <footer className="card-modal-foot">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-ink"
            onClick={() => {
              onSave?.();
              onClose();
            }}
          >
            Save
          </button>
        </footer>
      </aside>
    </div>
  );
}

export default function SavedView({
  tasks,
  projects = [],
  people = [],
  loading,
  error,
  onRefresh,
  onMove,
  onUpdate,
  onCreate,
  onDelete,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
}) {
  const [activeProject, setActiveProject] = useState('all');
  const [openTaskId, setOpenTaskId] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const heldTask = useRef(null);
  const [draftLane, setDraftLane] = useState(null);
  const [draftText, setDraftText] = useState('');
  const [newProject, setNewProject] = useState('');
  const [projectOpen, setProjectOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [confirm, setConfirm] = useState(null);
  const searchRef = useRef(null);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  const items = Array.isArray(tasks) ? tasks : [];
  const projectList = projects;
  const peopleList = people;

  const visible = useMemo(() => {
    let next = items;
    if (activeProject !== 'all') next = items.filter((task) => task.projectId === activeProject);
    const needle = query.trim().toLowerCase();
    if (!needle) return next;
    return next.filter((task) =>
      [task.description, task.owner, task.projectName, task.deadline]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle))
    );
  }, [items, activeProject, query]);

  const grouped = useMemo(() => {
    const next = Object.fromEntries(LANES.map((lane) => [lane.id, []]));
    visible.forEach((task) => {
      next[laneFor(task.status)].push(task);
    });
    return next;
  }, [visible]);

  const liveTask = items.find((task) => task.id === openTaskId) || null;
  if (liveTask) heldTask.current = liveTask;
  const openTask = liveTask || heldTask.current;
  const currentProject = projectList.find((item) => item.id === activeProject);

  function openSheet(task) {
    heldTask.current = task;
    setOpenTaskId(task.id);
    requestAnimationFrame(() => setSheetOpen(true));
  }

  function closeSheet() {
    setSheetOpen(false);
    window.setTimeout(() => {
      setOpenTaskId(null);
      heldTask.current = null;
    }, 320);
  }

  function patchLocal(taskId, patch) {
    onUpdate?.(taskId, patch);
  }

  function handleDragStart(event, taskId) {
    event.dataTransfer.setData('text/task-id', taskId);
    event.dataTransfer.effectAllowed = 'move';
  }

  function handleDrop(event, laneId) {
    event.preventDefault();
    const taskId = event.dataTransfer.getData('text/task-id');
    if (!taskId) return;
    onMove?.(taskId, laneId);
  }

  function removeTask(taskId) {
    closeSheet();
    setConfirm(null);
    onDelete?.(taskId);
  }

  function handleDelete(taskId) {
    const task = items.find((item) => item.id === taskId);
    setConfirm({
      title: 'Remove this card?',
      excerpt: task?.description || '',
      body: 'It will leave the board. This cannot be undone.',
      confirmLabel: 'Remove card',
      onConfirm: () => removeTask(taskId),
    });
  }

  async function handleAdd(laneId) {
    const description = draftText.trim();
    if (!description) return;
    const project = activeProject === 'all' ? projectList[0] : currentProject;
    await onCreate?.({
      description,
      status: laneId,
      projectId: project?.id || undefined,
      projectName: project?.name || undefined,
    });
    setDraftLane(null);
    setDraftText('');
  }

  async function handleCreateProject(event) {
    event.preventDefault();
    const name = newProject.trim();
    if (!name) return;
    const project = await onCreateProject?.(name);
    if (project?.id) setActiveProject(project.id);
    setNewProject('');
    setProjectOpen(false);
  }

  function handleDeleteProject() {
    if (!currentProject) return;
    const project = currentProject;
    setConfirm({
      title: 'Remove this project?',
      excerpt: project.name,
      body: 'The project and the cards on it will leave the board. This cannot be undone.',
      confirmLabel: 'Remove project',
      onConfirm: () => {
        setConfirm(null);
        onDeleteProject?.(project.id);
        setActiveProject('all');
      },
    });
  }

  return (
    <div className="board-page">
      <div className="page-header">
        <div>
          <h1>Work board</h1>
          <p>
            Confirmed work, arranged by sitting. Open a card to assign it, set its date,
            or move it between lanes.
          </p>
        </div>
        <div className="board-tools">
          <div className={`board-search ${searchOpen || query ? 'is-open' : ''}`}>
            {searchOpen || query ? (
              <label className="board-search-field">
                <Search size={13} />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search the board"
                  onBlur={() => {
                    if (!query.trim()) setSearchOpen(false);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                      setQuery('');
                      setSearchOpen(false);
                    }
                  }}
                />
                {query && (
                  <button
                    type="button"
                    className="board-search-clear"
                    aria-label="Clear search"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setQuery('');
                      searchRef.current?.focus();
                    }}
                  >
                    <X size={12} />
                  </button>
                )}
              </label>
            ) : (
              <button
                type="button"
                className="icon-btn board-search-btn"
                aria-label="Search the board"
                title="Search"
                onClick={() => setSearchOpen(true)}
              >
                <Search size={16} />
              </button>
            )}
          </div>
          <button
            type="button"
            className="btn btn-ink"
            onClick={() => {
              setNewProject('');
              setProjectOpen(true);
            }}
          >
            <Plus size={13} /> Add
          </button>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}

      <div className="project-bar">
        <button
          type="button"
          className={`project-pill ${activeProject === 'all' ? 'active' : ''}`}
          onClick={() => setActiveProject('all')}
        >
          All projects
        </button>
        {projectList.map((project) => (
          <span
            key={project.id}
            className={`project-pill ${activeProject === project.id ? 'active' : ''}`}
          >
            <button type="button" onClick={() => setActiveProject(project.id)}>
              <FolderKanban size={12} />
              {project.name}
            </button>
            {activeProject === project.id && (
              <button
                type="button"
                className="pill-delete"
                aria-label={`Delete ${project.name}`}
                onClick={handleDeleteProject}
              >
                <Trash2 size={11} />
              </button>
            )}
          </span>
        ))}
      </div>

      <div className="board-lanes">
        {LANES.map((lane) => (
          <section
            key={lane.id}
            className={`board-lane tone-${lane.tone}`}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => handleDrop(event, lane.id)}
          >
            <header className="board-lane-head">
              <h2>{lane.label}</h2>
              <span>{grouped[lane.id].length}</span>
            </header>
            <div className="board-lane-list">
              {grouped[lane.id].map((task) => (
                <BoardCard
                  key={task.id}
                  task={task}
                  showProject={activeProject === 'all'}
                  onDragStart={handleDragStart}
                  onOpen={openSheet}
                />
              ))}
              {draftLane === lane.id ? (
                <form
                  className="lane-add-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    handleAdd(lane.id);
                  }}
                >
                  <input
                    autoFocus
                    className="input"
                    placeholder="Task title"
                    value={draftText}
                    onChange={(event) => setDraftText(event.target.value)}
                    onBlur={() => {
                      if (!draftText.trim()) {
                        setDraftLane(null);
                      }
                    }}
                  />
                </form>
              ) : (
                <button
                  type="button"
                  className="lane-add"
                  onClick={() => {
                    setDraftLane(lane.id);
                    setDraftText('');
                  }}
                >
                  <Plus size={12} /> Add item
                </button>
              )}
              {!grouped[lane.id].length && draftLane !== lane.id && (
                <div className="lane-empty">Drop a card here</div>
              )}
            </div>
          </section>
        ))}
      </div>

      <TaskSheet
        task={openTask}
        open={sheetOpen}
        people={peopleList}
        projects={projectList}
        onClose={closeSheet}
        onChange={(patch) => openTask && patchLocal(openTask.id, patch)}
        onDelete={() => openTask && handleDelete(openTask.id)}
      />
      <ProjectDialog
        open={projectOpen}
        name={newProject}
        onChange={setNewProject}
        onCancel={() => {
          setProjectOpen(false);
          setNewProject('');
        }}
        onSubmit={handleCreateProject}
      />
      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.title}
        excerpt={confirm?.excerpt}
        body={confirm?.body}
        confirmLabel={confirm?.confirmLabel}
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm?.onConfirm?.()}
      />
    </div>
  );
}
