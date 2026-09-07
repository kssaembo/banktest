import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';
import { Role, User } from '../types';
import { XIcon } from './icons';

type Topic = { id: string; title: string; prompt: string; isOpen: boolean; createdAt: string; commentCount: number };
type Comment = { id: string; content: string; createdAt: string; userName: string; userNumber?: number };

export const EconomyStoryModal: React.FC<{ isOpen: boolean; onClose: () => void; user: User }> = ({ isOpen, onClose, user }) => {
  const teacherId = user.role === Role.TEACHER ? user.userId : String(user.teacher_id || '');
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selected, setSelected] = useState<Topic | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [opinion, setOpinion] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const loadTopics = useCallback(async () => {
    if (!teacherId) return;
    try { setTopics(await api.getEconomyStories(teacherId) as Topic[]); setError(''); }
    catch (e: any) { setError(e.message || '경제 이야기 목록을 불러오지 못했습니다.'); }
  }, [teacherId]);

  const loadComments = useCallback(async (topic: Topic) => {
    setSelected(topic);
    try { setComments(await api.getEconomyStoryComments(topic.id) as Comment[]); setError(''); }
    catch (e: any) { setError(e.message || '의견을 불러오지 못했습니다.'); }
  }, []);

  useEffect(() => { if (isOpen) loadTopics(); }, [isOpen, loadTopics]);
  useEffect(() => {
    if (!isOpen) return;
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = old; };
  }, [isOpen]);
  if (!isOpen) return null;

  const addTopic = async () => {
    if (!title.trim() || !prompt.trim()) return;
    setBusy(true);
    try { await api.createEconomyStory(teacherId, title.trim(), prompt.trim()); setTitle(''); setPrompt(''); await loadTopics(); }
    catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  };
  const addComment = async () => {
    if (!selected || !opinion.trim()) return;
    setBusy(true);
    try { await api.addEconomyStoryComment(selected.id, user.userId, opinion.trim()); setOpinion(''); await loadComments(selected); await loadTopics(); }
    catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  };

  return <div className="fixed inset-0 z-[240] flex items-center justify-center bg-slate-950/65 p-3 backdrop-blur-sm" onClick={onClose}>
    <section className="flex h-[min(88vh,780px)] w-full max-w-5xl flex-col overflow-hidden rounded-[32px] bg-[#f4f8ff] shadow-2xl" onClick={e=>e.stopPropagation()}>
      <header className="flex items-center justify-between border-b border-blue-100 bg-white px-6 py-5">
        <div><p className="text-xs font-black text-blue-600">생각을 나누는 우리 반 경제 게시판</p><h2 className="text-2xl font-black text-slate-900">경제 이야기</h2></div>
        <button onClick={onClose} className="rounded-full bg-slate-100 p-3"><XIcon className="h-5 w-5"/></button>
      </header>
      <div className="grid min-h-0 flex-1 md:grid-cols-[320px_1fr]">
        <aside className="overflow-y-auto border-r border-blue-100 bg-white p-4">
          {user.role===Role.TEACHER && <div className="mb-5 rounded-2xl bg-blue-50 p-4">
            <h3 className="mb-3 font-black text-blue-900">새 이야기 열기</h3>
            <input value={title} onChange={e=>setTitle(e.target.value)} maxLength={60} placeholder="주제 제목" className="mb-2 w-full rounded-xl border bg-white p-3 text-sm"/>
            <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} maxLength={500} placeholder="학생들이 생각할 질문을 적어주세요." className="h-24 w-full resize-none rounded-xl border bg-white p-3 text-sm"/>
            <button disabled={busy||!title.trim()||!prompt.trim()} onClick={addTopic} className="mt-2 w-full rounded-xl bg-blue-600 p-3 text-sm font-black text-white disabled:opacity-40">게시하기</button>
          </div>}
          <div className="space-y-2">{topics.map(topic=><button key={topic.id} onClick={()=>loadComments(topic)} className={`w-full rounded-2xl border p-4 text-left ${selected?.id===topic.id?'border-blue-400 bg-blue-50':'border-slate-100 bg-white'}`}>
            <div className="flex justify-between gap-2"><strong className="text-sm text-slate-900">{topic.title}</strong><span className={`shrink-0 text-[10px] font-black ${topic.isOpen?'text-emerald-600':'text-slate-400'}`}>{topic.isOpen?'진행 중':'종료'}</span></div>
            <p className="mt-2 text-xs text-slate-500">의견 {topic.commentCount}개</p>
          </button>)}</div>
          {!topics.length&&!error&&<p className="py-12 text-center text-sm text-slate-400">아직 열린 이야기가 없습니다.</p>}
        </aside>
        <main className="min-h-0 overflow-y-auto p-5 md:p-7">
          {selected ? <>
            <div className="rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-600 p-6 text-white shadow-lg"><div className="flex justify-between gap-4"><h3 className="text-xl font-black">{selected.title}</h3>{user.role===Role.TEACHER&&<button disabled={busy} onClick={async()=>{setBusy(true);try{await api.setEconomyStoryStatus(teacherId,selected.id,!selected.isOpen);await loadTopics();setSelected({...selected,isOpen:!selected.isOpen});}catch(e:any){setError(e.message)}finally{setBusy(false)}}} className="rounded-xl bg-white/15 px-3 py-2 text-xs font-black">{selected.isOpen?'이야기 종료':'다시 열기'}</button>}</div><p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-blue-50">{selected.prompt}</p></div>
            {user.role===Role.STUDENT&&selected.isOpen&&<div className="mt-4 rounded-2xl border border-blue-100 bg-white p-4"><label className="text-sm font-black text-slate-800">나의 생각</label><div className="mt-2 flex gap-2"><input value={opinion} onChange={e=>setOpinion(e.target.value)} maxLength={300} placeholder="한 문장으로 생각을 적어보세요." className="min-w-0 flex-1 rounded-xl border p-3 text-sm"/><button disabled={busy||!opinion.trim()} onClick={addComment} className="rounded-xl bg-indigo-600 px-5 font-black text-white disabled:opacity-40">등록</button></div></div>}
            <div className="mt-5 space-y-3">{comments.map(comment=><article key={comment.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><div className="flex justify-between"><strong className="text-sm text-slate-900">{comment.userNumber ? `${comment.userNumber}번 `:''}{comment.userName}</strong><time className="text-[10px] text-slate-400">{new Date(comment.createdAt).toLocaleString()}</time></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{comment.content}</p></article>)}</div>
          </> : <div className="flex h-full items-center justify-center text-center text-slate-400"><div><div className="mb-3 text-5xl">💬</div><p className="font-black">왼쪽에서 이야기 주제를 선택하세요.</p></div></div>}
          {error&&<p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
        </main>
      </div>
    </section>
  </div>;
};
