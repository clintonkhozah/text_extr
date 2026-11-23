import { Search } from 'lucide-react';

const TITLES = {
  extract: 'Assistant',
  saved: 'Board',
  documents: 'Data',
  users: 'People & groups',
  approach: 'Notes',
};

export default function Topbar({ view }) {
  return (
    <header className="topbar">
      <div className="crumbs">
        <strong>{TITLES[view]}</strong>
      </div>
      <div className="topbar-actions">
        <div className="search-fake" aria-hidden>
          <Search size={13} />
          <span>Look up a brief…</span>
          <span className="kbd">Ctrl K</span>
        </div>
      </div>
    </header>
  );
}
