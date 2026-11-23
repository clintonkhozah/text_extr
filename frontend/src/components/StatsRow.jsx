import { Signal, BookType, ClipboardList, Archive } from 'lucide-react';

function sourceLabel(source, health) {
  const value = source || health?.llm || 'rules';
  if (value === 'mock') return 'Standing rules';
  if (value === 'llm') return 'Recorded brief';
  return value;
}

export default function StatsRow({ pendingCount, savedCount, health, source }) {
  const live = health?.status === 'ok';
  return (
    <div className="stats">
      <div className="stat-card">
        <div className={`stat-icon ${live ? 'green' : ''}`}>
          <Signal size={14} />
        </div>
        <div>
          <div className="stat-meta">Service</div>
          <div className="stat-value">{live ? 'Open' : 'Quiet'}</div>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon">
          <BookType size={14} />
        </div>
        <div>
          <div className="stat-meta">Source</div>
          <div className="stat-value">{sourceLabel(source, health)}</div>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon">
          <ClipboardList size={14} />
        </div>
        <div>
          <div className="stat-meta">On the desk</div>
          <div className="stat-value">{pendingCount}</div>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon">
          <Archive size={14} />
        </div>
        <div>
          <div className="stat-meta">On the board</div>
          <div className="stat-value">{savedCount}</div>
        </div>
      </div>
    </div>
  );
}
