import React from 'react';

export default function StatCard({ title, value, icon: Icon, color = 'blue', subtitle, change }) {
  const colorMap = {
    blue: {
      bg: 'bg-blue-50 text-blue-600',
      border: 'border-blue-100'
    },
    emerald: {
      bg: 'bg-emerald-50 text-emerald-600',
      border: 'border-emerald-100'
    },
    navy: {
      bg: 'bg-slate-800 text-white',
      border: 'border-slate-700'
    },
    amber: {
      bg: 'bg-amber-50 text-amber-600',
      border: 'border-amber-100'
    },
    indigo: {
      bg: 'bg-indigo-50 text-indigo-600',
      border: 'border-indigo-100'
    },
    purple: {
      bg: 'bg-purple-50 text-purple-600',
      border: 'border-purple-100'
    }
  };

  const currentTheme = colorMap[color] || colorMap.blue;

  return (
    <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">{title}</p>
          <h3 className="text-2xl font-bold text-slate-800 tracking-tight">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </h3>
          {subtitle && (
            <p className="text-xs text-slate-500 font-medium">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${currentTheme.bg} transition-transform hover:scale-105`}>
          {Icon && <Icon className="w-5 h-5" />}
        </div>
      </div>
      {change && (
        <div className="mt-3 pt-3 border-t border-slate-50 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
          <span>{change}</span>
        </div>
      )}
    </div>
  );
}

