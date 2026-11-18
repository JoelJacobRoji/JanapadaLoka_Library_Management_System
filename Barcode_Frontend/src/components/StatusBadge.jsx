import React from 'react';

export default function StatusBadge({ status, type = 'availability' }) {
  const norm = (status || '').toLowerCase();

  let styles = 'bg-slate-100 text-slate-700 border-slate-200';
  let dotColor = 'bg-slate-400';

  if (norm === 'available' || norm === 'active' || norm === 'returned') {
    styles = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    dotColor = 'bg-emerald-500';
  } else if (norm === 'issued') {
    styles = 'bg-blue-50 text-blue-700 border-blue-200';
    dotColor = 'bg-blue-500';
  } else if (norm === 'overdue' || norm === 'suspended' || norm === 'lost') {
    styles = 'bg-rose-50 text-rose-700 border-rose-200';
    dotColor = 'bg-rose-500';
  } else if (norm === 'maintenance' || norm === 'reserved') {
    styles = 'bg-amber-50 text-amber-700 border-amber-200';
    dotColor = 'bg-amber-500';
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${styles}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></span>
      {status || 'Unknown'}
    </span>
  );
}

