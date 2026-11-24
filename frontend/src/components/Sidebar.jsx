import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  PenLine,
  LayoutGrid,
  Database,
  BookOpen,
  Users,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
} from 'lucide-react';
import { NAV_ITEMS } from '../constants';

const ICONS = {
  extract: PenLine,
  saved: LayoutGrid,
  documents: Database,
  users: Users,
  approach: BookOpen,
};

function letter(name) {
  return String(name || '?').trim().charAt(0).toUpperCase();
}

export default function Sidebar({ active, onNavigate, collapsed, onToggle, currentUser, onSignOut }) {
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState('');
  const groups = [...new Set(NAV_ITEMS.map((item) => item.group))];
  const user = currentUser || {};

  useEffect(() => {
    if (!confirmSignOut) return undefined;
    function handleKeyDown(event) {
      if (event.key === 'Escape' && !signingOut) setConfirmSignOut(false);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmSignOut, signingOut]);

  async function confirmAndSignOut() {
    setSigningOut(true);
    setSignOutError('');
    try {
      await onSignOut();
      setConfirmSignOut(false);
    } catch (error) {
      setSignOutError(error.message);
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-top">
        <button
          type="button"
          className="nav-toggle"
          onClick={onToggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Open navigation' : 'Close navigation'}
          title={collapsed ? 'Open navigation' : 'Close navigation'}
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {groups.map((group) => (
        <div className="nav-group" key={group}>
          {!collapsed && <div className="nav-label">{group}</div>}
          {NAV_ITEMS.filter((item) => item.group === group).map((item) => {
            const Icon = ICONS[item.id];
            return (
              <button
                key={item.id}
                type="button"
                className={`nav-item ${active === item.id ? 'active' : ''}`}
                onClick={() => onNavigate(item.id)}
                title={item.label}
                aria-current={active === item.id ? 'page' : undefined}
              >
                <Icon size={17} strokeWidth={1.7} />
                {!collapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </div>
      ))}

      <div className="sidebar-foot">
        <div className="session-user" title={user.email || user.name}>
          <span className="profile-orb" aria-hidden>{letter(user.name)}</span>
          {!collapsed && (
            <div className="session-copy">
              <strong>{user.name}</strong>
              <span>{user.role || ''}</span>
            </div>
          )}
          <button
            type="button"
            className="sidebar-logout"
            onClick={() => {
              setSignOutError('');
              setConfirmSignOut(true);
            }}
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
      {confirmSignOut && createPortal(
        <div
          className="confirm-overlay is-open"
          onClick={() => {
            if (!signingOut) setConfirmSignOut(false);
          }}
        >
          <section
            className="confirm-card"
            onClick={(event) => event.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="sign-out-title"
            aria-describedby="sign-out-description"
          >
            <div className="confirm-mark" aria-hidden>
              <LogOut size={18} />
            </div>
            <h3 id="sign-out-title">Sign out of Project Desk?</h3>
            <p id="sign-out-description">
              Are you sure you want to sign out? You will need to sign in again to access your workspace.
            </p>
            {signOutError && <div className="alert error" role="alert">{signOutError}</div>}
            <div className="confirm-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setConfirmSignOut(false)}
                disabled={signingOut}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger-solid"
                onClick={confirmAndSignOut}
                disabled={signingOut}
              >
                {signingOut ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          </section>
        </div>,
        document.body
      )}
    </aside>
  );
}
