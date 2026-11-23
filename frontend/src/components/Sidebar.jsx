import {
  PenLine,
  LayoutGrid,
  Database,
  BookOpen,
  Users,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { CURRENT_USER, NAV_ITEMS } from '../constants';

const ICONS = {
  extract: PenLine,
  saved: LayoutGrid,
  documents: Database,
  users: Users,
  approach: BookOpen,
};

function letter(name) {
  return String(name || 'Y').trim().charAt(0).toUpperCase();
}

export default function Sidebar({ active, onNavigate, collapsed, onToggle, currentUser }) {
  const groups = [...new Set(NAV_ITEMS.map((item) => item.group))];
  const user = currentUser || CURRENT_USER;

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
          <span className="profile-orb" aria-hidden>
            {letter(user.name)}
          </span>
          {!collapsed && (
            <div className="session-copy">
              <strong>{user.name}</strong>
              <span>{user.role || 'On the desk'}</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
