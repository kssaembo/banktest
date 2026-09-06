import React, { useState } from 'react';

export type GuideItem = { title: string; description: string };

export const FeatureGuide: React.FC<{ title: string; items: GuideItem[]; className?: string; label?: string }> = ({ title, items, className = '', label }) => {
  const [open, setOpen] = useState(false);
  return <>
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={`inline-flex items-center gap-2 rounded-2xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-black text-blue-700 shadow-sm transition hover:border-blue-400 hover:bg-blue-50 active:scale-95 ${className}`}
      aria-label={`${title} 사용 안내 열기`}
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs text-white">?</span>
      {label || title}
    </button>
    {open && <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-950/55 p-4" onClick={() => setOpen(false)}>
      <section className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="feature-guide-title">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-xs font-black text-blue-600">CLASS BANK GUIDE</p><h2 id="feature-guide-title" className="mt-1 text-2xl font-black text-slate-900">{title}</h2></div>
          <button onClick={() => setOpen(false)} className="h-10 w-10 rounded-full bg-slate-100 text-xl font-bold text-slate-500 hover:bg-slate-200" aria-label="닫기">×</button>
        </div>
        <div className="mt-6 space-y-3">
          {items.map((item, index) => <div key={item.title} className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-sm font-black text-white">{index + 1}</span>
            <div><h3 className="font-black text-slate-800">{item.title}</h3><p className="mt-1 text-sm leading-relaxed text-slate-600">{item.description}</p></div>
          </div>)}
        </div>
        <button onClick={() => setOpen(false)} className="mt-6 w-full rounded-2xl bg-[#2B548F] py-3.5 font-black text-white">확인했어요</button>
      </section>
    </div>}
  </>;
};

export const SectionTitle: React.FC<{ title: string; guide?: GuideItem[]; actions?: React.ReactNode }> = ({ title, guide, actions }) => <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap items-center gap-3"><h2 className="text-2xl font-black text-slate-800">{title}</h2>{guide?.length ? <FeatureGuide title={`${title} 사용 안내`} label={`${title} 사용 안내`} items={guide}/> : null}</div>{actions}</div>;

export const OverviewCards: React.FC<{ items: { label: string; value: string; note?: string; color?: string }[] }> = ({ items }) => (
  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
    {items.map(item => <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold text-slate-500">{item.label}</p>
      <p className={`mt-1 text-2xl font-black ${item.color || 'text-slate-900'}`}>{item.value}</p>
      {item.note && <p className="mt-1 text-[11px] font-medium text-slate-400">{item.note}</p>}
    </div>)}
  </div>
);

export const MiniBars: React.FC<{ title: string; rows: { label: string; value: number; display: string }[]; color?: string }> = ({ title, rows, color = 'bg-blue-500' }) => {
  const max = Math.max(1, ...rows.map(row => row.value));
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <h3 className="mb-4 font-black text-slate-800">{title}</h3>
    <div className="space-y-3">
      {rows.slice(0, 6).map(row => <div key={row.label}>
        <div className="mb-1 flex justify-between gap-3 text-xs"><span className="truncate font-bold text-slate-600">{row.label}</span><span className="shrink-0 font-black text-slate-800">{row.display}</span></div>
        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(row.value > 0 ? 5 : 0, row.value / max * 100)}%` }} /></div>
      </div>)}
      {!rows.length && <p className="py-4 text-center text-sm text-slate-400">표시할 데이터가 없습니다.</p>}
    </div>
  </section>;
};
