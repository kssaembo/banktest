import React from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export const CHART_COLORS = ['#2563eb','#10b981','#f59e0b','#8b5cf6','#ec4899','#06b6d4','#f97316','#64748b'];

export type ChartSlice = { name: string; value: number; details?: string[] };

const tooltipStyle = { borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 12px 28px rgba(15,23,42,.12)', fontSize: 12 };

export function DonutCard({ title, data, onSelect, centerLabel = '전체' }: { title: string; data: ChartSlice[]; onSelect?: (item: ChartSlice) => void; centerLabel?: string }) {
  const usable = data.filter(item => item.value > 0);
  const total = usable.reduce((sum, item) => sum + item.value, 0);
  const renderData = usable.length ? usable : [{ name: '데이터 없음', value: 1 }];
  return <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm">
    <h3 className="font-black text-slate-800">{title}</h3>
    <div className="relative h-56">
      <ResponsiveContainer width="100%" height="100%"><PieChart><Pie isAnimationActive={false} data={renderData} dataKey="value" nameKey="name" innerRadius={56} outerRadius={83} paddingAngle={3} onClick={(entry: any) => onSelect?.(entry)}>{renderData.map((_, index) => <Cell key={index} fill={usable.length ? CHART_COLORS[index % CHART_COLORS.length] : '#e2e8f0'} className={onSelect ? 'cursor-pointer' : ''}/>)}</Pie><Tooltip cursor={false} wrapperStyle={{zIndex:30}} contentStyle={tooltipStyle} formatter={(value: number, _name, item: any) => [usable.length ? `${Number(value).toLocaleString()} (${Math.round(Number(value) / Math.max(1,total) * 100)}%)` : '-', item.payload.name]} content={({active,payload})=>{if(!active||!payload?.[0])return null;const row=payload[0].payload as ChartSlice;return <div className="max-w-64 rounded-2xl border bg-white p-3 text-xs shadow-xl"><p className="font-black text-slate-800">{row.name}: {row.value.toLocaleString()}</p>{row.details?.length?<p className="mt-2 leading-5 text-slate-600">{row.details.join(', ')}</p>:null}</div>;}}/></PieChart></ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-[11px] font-bold text-slate-400">{centerLabel}</span><b className="text-xl text-slate-800">{usable.length ? total.toLocaleString() : '-'}</b></div>
    </div>
    <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">{usable.map((item,index)=><button key={item.name} onClick={()=>onSelect?.(item)} className="flex items-center gap-1 text-[11px] font-bold text-slate-600"><span className="h-2.5 w-2.5 rounded-full" style={{background:CHART_COLORS[index%CHART_COLORS.length]}}/>{item.name}</button>)}</div>
  </section>;
}

export function VerticalBars({ title, data, unit = '', metric = '금액', onSelect }: { title: string; data: ChartSlice[]; unit?: string; metric?: string; onSelect?: (item: ChartSlice) => void }) {
  const sorted=[...data].sort((a,b)=>b.value-a.value);
  return <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm"><h3 className="font-black text-slate-800">{title}</h3><div className="mt-3 h-60 min-w-0"><ResponsiveContainer width="100%" height="100%"><BarChart data={sorted} margin={{top:10,right:8,left:-20,bottom:18}}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name" tick={{fontSize:11,fontWeight:700}} interval={0}/><YAxis hide/><Tooltip cursor={false} wrapperStyle={{zIndex:30}} contentStyle={tooltipStyle} formatter={(v:number)=>[`${Number(v).toLocaleString()}${unit}`,metric]}/><Bar isAnimationActive={false} dataKey="value" radius={[12,12,3,3]} onClick={(entry:any)=>onSelect?.(entry)}>{sorted.map((_,i)=><Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]} className={onSelect?'cursor-pointer':''}/>)}</Bar></BarChart></ResponsiveContainer></div></section>;
}

export type TrendRow = { label: string; [key: string]: string | number };
export function TrendChart({ data, lines, height=280 }: { data: TrendRow[]; lines: {key:string;name:string;color:string}[]; height?:number }) {
  return <div style={{height}}><ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{top:12,right:15,left:-20,bottom:5}}><CartesianGrid strokeDasharray="4 4" vertical={false}/><XAxis dataKey="label" tick={{fontSize:10}}/><YAxis hide/><Tooltip cursor={false} wrapperStyle={{zIndex:30}} contentStyle={tooltipStyle}/><Legend wrapperStyle={{fontSize:12}}/>{lines.map(line=><Line isAnimationActive={false} key={line.key} type="monotone" dataKey={line.key} name={line.name} stroke={line.color} strokeWidth={3} dot={{r:3}} activeDot={{r:6}}/>)}</LineChart></ResponsiveContainer></div>;
}

export function ChartModal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-[510] flex items-center justify-center bg-slate-950/55 p-4" onClick={onClose}><section className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[30px] bg-white p-6 shadow-2xl" onClick={e=>e.stopPropagation()}><div className="mb-5 flex items-center justify-between gap-3"><h2 className="text-2xl font-black text-slate-900">{title}</h2><button onClick={onClose} className="h-10 w-10 rounded-full bg-slate-100 text-xl font-black text-slate-500">×</button></div>{children}</section></div>;
}

export function SegmentedBar({ title, rows, unit = '' }: { title: string; rows: ChartSlice[]; unit?: string }) {
  const total=rows.reduce((sum,row)=>sum+row.value,0);
  return <div className="rounded-2xl bg-slate-50 p-4"><h3 className="mb-3 font-black text-slate-800">{title}</h3><div className="flex h-12 overflow-visible rounded-2xl bg-slate-200">{rows.filter(r=>r.value>0).map((row,i)=><div key={row.name} className="group relative flex min-w-[4px] items-center justify-center first:rounded-l-2xl last:rounded-r-2xl text-[10px] font-black text-white" style={{width:`${row.value/Math.max(1,total)*100}%`,background:CHART_COLORS[i%CHART_COLORS.length]}}><span className="hidden truncate px-1 group-hover:block">{row.name}</span><span className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white shadow-xl group-hover:block">{row.name}: {row.value.toLocaleString()}{unit}</span></div>)}</div><div className="mt-3 flex flex-wrap gap-3">{rows.map((row,i)=><span key={row.name} className="text-xs font-bold text-slate-600"><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full" style={{background:CHART_COLORS[i%CHART_COLORS.length]}}/>{row.name} {row.value.toLocaleString()}{unit}</span>)}</div></div>;
}
