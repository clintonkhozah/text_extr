import { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import ChatView from './views/ChatView';
import SavedView from './views/SavedView';
import DataView from './views/DataView';
import ApproachView from './views/ApproachView';
import UsersView from './views/UsersView';
import AuthView from './views/AuthView';
import { supabase, supabaseConfigured } from './supabase';
import {
  addPerson,
  askAgent,
  approveTasks,
  createProject,
  createTask,
  deletePerson,
  deleteProject,
  deleteTask,
  extractTasks,
  listPeople,
  listProjects,
  listTasks,
  updatePerson,
  updateProject,
  updateTask,
} from './api';

function withEditDefaults(tasks) {
  return tasks.map((task) => ({
    ...task,
    approved: null,
    editedDescription: task.description,
    editedOwner: task.owner,
    editedDeadline: task.deadline,
    editedPriority: task.priority,
  }));
}

export default function App() {
  const [pathname, setPathname] = useState(() => (
    window.location.pathname.replace(/\/+$/, '') || '/'
  ));
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [dataLoading, setDataLoading] = useState(false);
  const [view, setView] = useState('extract');
  const [text, setText] = useState('');
  const [source, setSource] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [saved, setSaved] = useState([]);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [projects, setProjects] = useState([]);
  const [people, setPeople] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [navOpen, setNavOpen] = useState(() => {
    try {
      return localStorage.getItem('nav-open') !== 'false';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    function syncPathname() {
      setPathname(window.location.pathname.replace(/\/+$/, '') || '/');
    }

    window.addEventListener('popstate', syncPathname);
    return () => window.removeEventListener('popstate', syncPathname);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    const nextPath = session ? '/' : '/login';
    if (pathname !== nextPath) {
      window.history.replaceState(null, '', nextPath);
      setPathname(nextPath);
    }
  }, [authLoading, session, pathname]);

  useEffect(() => {
    if (!supabaseConfigured || !supabase) {
      setAuthLoading(false);
      return undefined;
    }

    let active = true;
    supabase.auth.getSession()
      .then(({ data, error: sessionError }) => {
        if (!active) return;
        if (sessionError) setAuthError(sessionError.message);
        setSession(data.session);
        setAuthLoading(false);
      })
      .catch((sessionError) => {
        if (!active) return;
        setAuthError(sessionError.message);
        setAuthLoading(false);
      });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthError('');
      setAuthMessage('');
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) {
      setProjects([]);
      setPeople([]);
      setSaved([]);
      setActiveProjectId(null);
      setText('');
      setSource(null);
      setTasks([]);
      setDataLoading(false);
      return undefined;
    }
    let active = true;
    setActiveProjectId(null);
    setText('');
    setSource(null);
    setTasks([]);
    setDataLoading(true);
    setError('');
    Promise.all([listProjects(), listPeople(), listTasks()])
      .then(([projectResult, peopleResult, taskResult]) => {
        if (!active) return;
        setProjects(projectResult.projects || []);
        setPeople(peopleResult.people || []);
        setSaved(taskResult.tasks || []);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message);
      })
      .finally(() => {
        if (active) setDataLoading(false);
      });
    return () => {
      active = false;
    };
  }, [session?.user?.id]);

  async function refreshData() {
    const [projectResult, peopleResult, taskResult] = await Promise.all([
      listProjects(),
      listPeople(),
      listTasks(),
    ]);
    setProjects(projectResult.projects || []);
    setPeople(peopleResult.people || []);
    setSaved(taskResult.tasks || []);
  }

  async function handleAuthenticate({ mode, email, password }) {
    if (!supabase) return;
    setAuthBusy(true);
    setAuthError('');
    setAuthMessage('');
    try {
      const result = mode === 'sign-up'
        ? await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: 'https://textxx.netlify.app/',
            },
          })
        : await supabase.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      if (mode === 'sign-up' && !result.data.session) {
        setAuthMessage('Check your email to confirm your account, then sign in.');
      }
    } catch (authFailure) {
      setAuthError(authFailure.message);
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleSignOut() {
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) throw signOutError;
    setError('');
  }

  function runAction(action) {
    setError('');
    return action().catch((actionError) => {
      setError(actionError.message);
      return null;
    });
  }

  function toggleNav() {
    setNavOpen((open) => {
      const next = !open;
      try {
        localStorage.setItem('nav-open', String(next));
      } catch {
        return next;
      }
      return next;
    });
  }

  async function handleExtract(input = { text }) {
    const payload = typeof input === 'string'
      ? { text: input }
      : { text: input?.text || '', documents: input?.documents || [] };
    setText(payload.text);
    setError('');
    setSuccess('');
    setExtracting(true);
    try {
      const result = await extractTasks(payload);
      setTasks(withEditDefaults(result.tasks || []));
      setSource(result.source || null);
      return result;
    } catch (extractError) {
      setTasks([]);
      setSource(null);
      setError(extractError.message);
      return null;
    } finally {
      setExtracting(false);
    }
  }

  function handleToggle(index, approved) {
    setTasks((prev) => prev.map((task, i) => (i === index ? { ...task, approved } : task)));
  }

  function handleChange(index, field, value) {
    setTasks((prev) => prev.map((task, i) => (i === index ? { ...task, [field]: value } : task)));
  }

  async function handleSendToData({ acceptAll = false } = {}) {
    const approved = tasks.filter(
      (task) => (task.approved === true || acceptAll) && !task.sentToData
    );
    if (!approved.length) {
      setError('Accept at least one task before adding it to Data.');
      return;
    }
    const hasUnassignedProject = approved.some((task) => (
      task.editedProjectId !== undefined ? !task.editedProjectId : !activeProjectId
    ));
    if (hasUnassignedProject) {
      setError('Assign each accepted task to a project before adding it to Data.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const result = await approveTasks({
        projectId: activeProjectId || undefined,
        tasks: approved.map((task) => ({
          projectId: task.editedProjectId !== undefined ? task.editedProjectId : activeProjectId,
          status: task.editedStatus || 'incoming',
          description: task.editedDescription || task.description,
          owner: task.editedOwner ?? task.owner ?? null,
          deadline: task.editedDeadline ?? task.deadline ?? null,
          priority: task.editedPriority ?? task.priority ?? null,
          confidence: task.confidence,
          evidence: task.evidence,
          unknowns: task.unknowns || [],
          approved: true,
          editedDescription: task.editedDescription,
          editedOwner: task.editedOwner ?? null,
          editedDeadline: task.editedDeadline ?? null,
          editedPriority: task.editedPriority ?? null,
        })),
      });
      setSaved((prev) => [...(result.tasks || []), ...prev]);
      setTasks((prev) => prev.map((task) =>
        task.approved === true || acceptAll
          ? { ...task, approved: true, sentToData: true }
          : task
      ));
      setSuccess('');
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  if (authLoading) {
    return <main className="auth-page"><p role="status">Checking your session…</p></main>;
  }
  if (!session) {
    return (
      <AuthView
        configured={supabaseConfigured}
        loading={authBusy}
        error={authError}
        message={authMessage}
        onAuthenticate={handleAuthenticate}
      />
    );
  }

  const currentUser = {
    name: session.user.user_metadata?.full_name || session.user.email || 'Workspace member',
    email: session.user.email || '',
    role: 'Workspace member',
  };

  return (
    <div className={`app-shell ${navOpen ? 'nav-open' : 'nav-collapsed'}`}>
      <Sidebar
        active={view}
        onNavigate={setView}
        collapsed={!navOpen}
        onToggle={toggleNav}
        currentUser={currentUser}
        onSignOut={handleSignOut}
      />
      <div className="main">
        <Topbar view={view} />
        <div
          className={`content ${view === 'extract' ? 'content-chat' : ''} ${
            view === 'saved' ? 'content-board' : ''
          }`}
        >
          {error && view !== 'extract' && <div className="alert error app-error" role="alert">{error}</div>}
          {dataLoading ? (
            <div className="data-loading" role="status">Loading your workspace…</div>
          ) : (
            <>
              {view === 'extract' && (
                <ChatView
                  text={text}
                  loading={extracting}
                  error={error}
                  source={source}
                  tasks={tasks}
                  saving={saving}
                  success={success}
                  projects={projects}
                  activeProjectId={activeProjectId}
                  people={people}
                  onTextChange={setText}
                  onExtract={handleExtract}
                  onAskAgent={(messages) => askAgent(messages)}
                  onToggle={handleToggle}
                  onChange={handleChange}
                  onSendToData={handleSendToData}
                  onClear={() => {
                    setText('');
                    setSource(null);
                    setTasks([]);
                    setError('');
                    setSuccess('');
                  }}
                  onSelectProject={(project) => setActiveProjectId(project?.id || null)}
                  onDeleteProject={(projectId) => runAction(async () => {
                    await deleteProject(projectId);
                    await refreshData();
                    if (activeProjectId === projectId) setActiveProjectId(null);
                  })}
                />
              )}

              {view === 'saved' && (
                <SavedView
                  tasks={saved}
                  projects={projects}
                  people={people}
                  loading={dataLoading}
                  error=""
                  onRefresh={() => runAction(refreshData)}
                  onMove={(taskId, status) => runAction(async () => {
                    const result = await updateTask(taskId, { status });
                    setSaved((prev) => prev.map((task) => task.id === taskId ? result.task : task));
                  })}
                  onUpdate={(taskId, patch) => runAction(async () => {
                    const result = await updateTask(taskId, patch);
                    setSaved((prev) => prev.map((task) => task.id === taskId ? result.task : task));
                  })}
                  onCreate={(payload) => runAction(async () => {
                    const result = await createTask(payload);
                    setSaved((prev) => [result.task, ...prev]);
                    return result.task;
                  })}
                  onDelete={(taskId) => runAction(async () => {
                    await deleteTask(taskId);
                    setSaved((prev) => prev.filter((task) => task.id !== taskId));
                  })}
                  onCreateProject={(name) => runAction(async () => {
                    const result = await createProject({ name });
                    setProjects((prev) => [result.project, ...prev]);
                    return result.project;
                  })}
                  onRenameProject={(projectId, name) => runAction(async () => {
                    const result = await updateProject(projectId, { name });
                    setProjects((prev) => prev.map((project) => project.id === projectId ? result.project : project));
                    setSaved((prev) => prev.map((task) => task.projectId === projectId
                      ? { ...task, projectName: result.project.name } : task));
                  })}
                  onDeleteProject={(projectId) => runAction(async () => {
                    await deleteProject(projectId);
                    await refreshData();
                    if (activeProjectId === projectId) setActiveProjectId(null);
                  })}
                />
              )}

              {view === 'users' && (
                <UsersView
                  people={people}
                  currentUser={currentUser}
                  error=""
                  onAdd={(payload) => runAction(async () => {
                    const result = await addPerson(payload);
                    setPeople((prev) => [...prev, result.person]);
                  })}
                  onUpdate={(id, patch) => runAction(async () => {
                    const result = await updatePerson(id, patch);
                    setPeople((prev) => prev.map((person) => person.id === id ? result.person : person));
                  })}
                  onDelete={(id) => runAction(async () => {
                    await deletePerson(id);
                    await refreshData();
                  })}
                />
              )}

              {view === 'documents' && (
                <DataView
                  records={saved}
                  projects={projects}
                  activeProjectId={activeProjectId}
                  success={success}
                  error=""
                  onOpenProject={(projectId) => {
                    setActiveProjectId(projectId);
                    setView('extract');
                  }}
                  onCreateProject={(payload) => runAction(async () => {
                    const result = await createProject(payload);
                    setProjects((prev) => [...prev, result.project]);
                    return result.project;
                  })}
                />
              )}

              {view === 'approach' && <ApproachView />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
