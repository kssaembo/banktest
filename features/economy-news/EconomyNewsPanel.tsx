import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { User, Role } from '../../types';

type Article = { id: string; title: string; content: string | null; url: string | null; is_approved: boolean; created_at: string; keywords: string[] | null; teacher_id?: string };
type Comment = { id: string; userId: string | null; article_id: string; content: string | null; is_passed: boolean; created_at: string };
type Notice = { type: 'success' | 'error'; text: string } | null;

const parseFunctionData = <T,>(data: unknown): T => {
  if (typeof data === 'string') return JSON.parse(data) as T;
  return data as T;
};

async function invokeAi<T>(action: string, payload: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('gemini-handler', { body: { action, payload } });
  if (error) throw new Error('AI 서버 기능이 아직 준비되지 않았습니다. 직접 기사 등록 기능은 사용할 수 있습니다.');
  return parseFunctionData<T>(data);
}

function NoticeModal({ notice, close }: { notice: Notice; close: () => void }) {
  if (!notice) return null;
  return <div className="absolute inset-0 z-30 bg-slate-950/55 flex items-center justify-center p-4" onClick={close}>
    <div className="w-full max-w-sm rounded-3xl bg-white p-7 text-center shadow-2xl" onClick={e=>e.stopPropagation()}>
      <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl ${notice.type==='success'?'bg-emerald-50 text-emerald-600':'bg-red-50 text-red-600'}`}>{notice.type==='success'?'✓':'!'}</div>
      <p className="font-bold text-slate-700 leading-relaxed">{notice.text}</p>
      <button onClick={close} className="mt-6 w-full rounded-2xl bg-blue-600 py-3 text-white font-black">확인</button>
    </div>
  </div>;
}

function TeacherNews({ user }: { user: User }) {
  const [articles,setArticles]=useState<Article[]>([]);
  const [comments,setComments]=useState<Comment[]>([]);
  const [title,setTitle]=useState(''); const [content,setContent]=useState(''); const [url,setUrl]=useState('');
  const [editing,setEditing]=useState<Article|null>(null); const [busy,setBusy]=useState(false); const [notice,setNotice]=useState<Notice>(null);
  const load=useCallback(async()=>{
    const [{data:a,error:ae},{data:c,error:ce}]=await Promise.all([
      supabase.from('news_articles').select('*').eq('teacher_id',user.userId).order('created_at',{ascending:false}),
      supabase.from('news_comments').select('*').order('created_at',{ascending:false})
    ]);
    if(ae||ce) throw ae||ce; setArticles((a||[]) as Article[]); setComments((c||[]) as Comment[]);
  },[user.userId]);
  useEffect(()=>{load().catch(()=>setNotice({type:'error',text:'뉴스 자료를 불러오지 못했습니다.'}));},[load]);
  const save=async()=>{
    if(!title.trim()||!content.trim()){setNotice({type:'error',text:'제목과 기사 내용을 모두 입력해 주세요.'});return;}
    setBusy(true);
    const payload={title:title.trim(),content:content.trim(),url:url.trim(),keywords:['경제','학급'],is_approved:true,teacher_id:user.userId};
    const result=editing?await supabase.from('news_articles').update(payload).eq('id',editing.id):await supabase.from('news_articles').insert(payload);
    setBusy(false); if(result.error){setNotice({type:'error',text:result.error.message});return;}
    setTitle('');setContent('');setUrl('');setEditing(null);setNotice({type:'success',text:editing?'기사를 수정했습니다.':'기사를 학생 뉴스에 공개했습니다.'});await load();
  };
  const remove=async(article:Article)=>{
    if(!window.confirm(`'${article.title}' 기사를 삭제할까요?`)) return;
    const {error}=await supabase.rpc('delete_article_with_comments',{target_article_id:article.id});
    if(error)setNotice({type:'error',text:error.message});else{setNotice({type:'success',text:'기사를 삭제했습니다.'});await load();}
  };
  const searchAndCurate=async()=>{
    setBusy(true);
    try {
      const {data,error}=await supabase.functions.invoke('search-news',{body:{keyword:'경제 금융 뉴스'}});
      if(error)throw error;
      const raw=(data as {items?:unknown[]})?.items||[];
      const curated=await invokeAi<Array<{title:string;content:string;url?:string;keywords?:string[]}>>('recommend_news',{rawNews:raw});
      if(!curated.length) throw new Error('추천 결과가 없습니다.');
      const first=curated[0]; setTitle(first.title);setContent(first.content);setUrl(first.url||'');
      setNotice({type:'success',text:'추천 기사 1건을 편집창에 불러왔습니다. 내용을 확인한 뒤 공개하세요.'});
    } catch(e){setNotice({type:'error',text:e instanceof Error?e.message:'실시간 뉴스 기능을 사용할 수 없습니다.'});} finally{setBusy(false);}
  };
  const commentCount=useMemo(()=>Object.fromEntries(articles.map(a=>[a.id,comments.filter(c=>c.article_id===a.id).length])),[articles,comments]);
  return <div className="h-full overflow-y-auto bg-slate-50 p-4 md:p-7">
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="rounded-3xl bg-white p-5 md:p-7 border border-blue-100 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5"><div><h2 className="text-2xl font-black text-slate-900">경제뉴스 편집실</h2><p className="text-sm text-slate-500 mt-1">기사를 직접 작성해 학생 화면에 공개합니다.</p></div><button disabled={busy} onClick={searchAndCurate} className="rounded-2xl bg-amber-100 px-4 py-3 text-sm font-black text-amber-800 disabled:opacity-50">AI 기사 추천 불러오기</button></div>
        <div className="space-y-3"><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="기사 제목" className="w-full rounded-2xl border-2 border-slate-200 p-3.5 focus:border-blue-500 outline-none"/><textarea value={content} onChange={e=>setContent(e.target.value)} placeholder="초등학생이 이해하기 쉬운 기사 내용" className="w-full min-h-40 rounded-2xl border-2 border-slate-200 p-3.5 focus:border-blue-500 outline-none resize-y"/><input value={url} onChange={e=>setUrl(e.target.value)} placeholder="원문 주소 (선택)" className="w-full rounded-2xl border-2 border-slate-200 p-3.5 focus:border-blue-500 outline-none"/></div>
        <div className="mt-4 flex gap-3">{editing&&<button onClick={()=>{setEditing(null);setTitle('');setContent('');setUrl('');}} className="flex-1 rounded-2xl bg-slate-100 py-3 font-bold">수정 취소</button>}<button disabled={busy} onClick={save} className="flex-1 rounded-2xl bg-blue-600 py-3 font-black text-white disabled:opacity-50">{editing?'수정 내용 저장':'학생에게 공개'}</button></div>
      </section>
      <section><h3 className="mb-3 text-lg font-black text-slate-800">공개 기사 {articles.length}건</h3><div className="grid gap-3 md:grid-cols-2">{articles.map(a=><article key={a.id} className="rounded-3xl bg-white p-5 border border-slate-200 shadow-sm"><div className="flex justify-between gap-4"><div><h4 className="font-black text-slate-900">{a.title}</h4><p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600">{a.content}</p><p className="mt-3 text-xs font-bold text-blue-600">학생 의견 {commentCount[a.id]||0}개</p></div><div className="flex shrink-0 flex-col gap-2"><button onClick={()=>{setEditing(a);setTitle(a.title);setContent(a.content||'');setUrl(a.url||'');}} className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">수정</button><button onClick={()=>remove(a)} className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">삭제</button></div></div></article>)}{!articles.length&&<div className="md:col-span-2 rounded-3xl border-2 border-dashed border-slate-200 p-10 text-center text-slate-400">아직 공개된 기사가 없습니다.</div>}</div></section>
    </div><NoticeModal notice={notice} close={()=>setNotice(null)}/>
  </div>;
}

function StudentNews({user,onBalanceChanged}:{user:User;onBalanceChanged?:()=>void}){
  const [articles,setArticles]=useState<Article[]>([]);const [selected,setSelected]=useState<Article|null>(null);const [comment,setComment]=useState('');const [summary,setSummary]=useState<{summary:string;easy_words:{word:string;meaning:string}[]}|null>(null);const [notice,setNotice]=useState<Notice>(null);const [busy,setBusy]=useState(false);
  useEffect(()=>{supabase.from('news_articles').select('*').eq('teacher_id',user.teacher_id||'').eq('is_approved',true).order('created_at',{ascending:false}).then(({data,error})=>{if(error)setNotice({type:'error',text:'뉴스를 불러오지 못했습니다.'});else setArticles((data||[]) as Article[]);});},[user.teacher_id]);
  const summarize=async()=>{if(!selected)return;setBusy(true);try{setSummary(await invokeAi('summarize',{title:selected.title,content:selected.content||''}));}catch(e){setNotice({type:'error',text:e instanceof Error?e.message:'AI 요약을 사용할 수 없습니다.'});}finally{setBusy(false);}};
  const submit=async()=>{if(!selected||comment.trim().length<20){setNotice({type:'error',text:'기사에 대한 생각을 20자 이상 적어 주세요.'});return;}setBusy(true);try{let passed=true;try{const check=await invokeAi<{passed:boolean;reason:string}>('verify',{articleContent:selected.content||'',comment:comment.trim(),keywords:selected.keywords||[]});passed=check.passed;if(!passed){setNotice({type:'error',text:check.reason});return;}}catch{/* AI function is optional; length rule remains. */}const {error}=await supabase.from('news_comments').insert({userId:user.userId,article_id:selected.id,content:comment.trim(),is_passed:passed});if(error)throw error;await supabase.rpc('update_user_balance',{p_user_id:user.userId,p_amount:1});setComment('');setNotice({type:'success',text:'의견을 등록하고 1톨을 받았습니다.'});onBalanceChanged?.();}catch(e){setNotice({type:'error',text:e instanceof Error?e.message:'의견을 저장하지 못했습니다.'});}finally{setBusy(false);}};
  if(selected)return <div className="h-full overflow-y-auto bg-slate-50 p-4 md:p-7"><article className="mx-auto max-w-3xl rounded-3xl bg-white p-6 md:p-9 shadow-sm border border-slate-200"><button onClick={()=>{setSelected(null);setSummary(null);}} className="mb-5 font-bold text-blue-600">← 뉴스 목록</button><p className="text-xs font-bold text-slate-400">{new Date(selected.created_at).toLocaleDateString()}</p><h2 className="mt-2 text-2xl md:text-3xl font-black text-slate-900 leading-tight">{selected.title}</h2><p className="mt-6 whitespace-pre-line text-base md:text-lg leading-8 text-slate-700">{selected.content}</p>{selected.url&&<a href={selected.url} target="_blank" rel="noreferrer" className="mt-5 inline-block text-sm font-bold text-blue-600 underline">원문 보기</a>}<div className="mt-7 rounded-3xl bg-blue-50 p-5"><button disabled={busy} onClick={summarize} className="rounded-2xl bg-blue-600 px-5 py-3 font-black text-white disabled:opacity-50">AI로 쉽게 요약</button>{summary&&<div className="mt-4"><p className="whitespace-pre-line font-semibold leading-relaxed text-slate-700">{summary.summary}</p><div className="mt-3 flex flex-wrap gap-2">{summary.easy_words.map(w=><span key={w.word} className="rounded-xl bg-white px-3 py-2 text-sm"><b>{w.word}</b> · {w.meaning}</span>)}</div></div>}</div><div className="mt-7"><label className="font-black text-slate-800">뉴스를 읽고 든 생각</label><textarea value={comment} onChange={e=>setComment(e.target.value)} placeholder="기사 내용을 그대로 옮기지 말고, 새롭게 알게 된 점이나 생각을 20자 이상 적어 보세요." className="mt-2 min-h-28 w-full rounded-2xl border-2 border-slate-200 p-4 outline-none focus:border-blue-500"/><button disabled={busy} onClick={submit} className="mt-3 w-full rounded-2xl bg-emerald-600 py-3.5 font-black text-white disabled:opacity-50">의견 등록하고 1톨 받기</button></div></article><NoticeModal notice={notice} close={()=>setNotice(null)}/></div>;
  return <div className="h-full overflow-y-auto bg-slate-50 p-4 md:p-7"><div className="mx-auto max-w-4xl"><div className="mb-6"><h2 className="text-2xl md:text-3xl font-black text-slate-900">오늘의 경제뉴스</h2><p className="mt-1 text-slate-500">선생님이 고른 뉴스를 읽고 내 생각을 적어 보세요.</p></div><div className="grid gap-4 md:grid-cols-2">{articles.map(a=><button key={a.id} onClick={()=>setSelected(a)} className="rounded-3xl bg-white p-6 text-left border border-slate-200 shadow-sm hover:border-blue-400 hover:shadow-md"><p className="text-xs font-bold text-blue-600">경제 · {new Date(a.created_at).toLocaleDateString()}</p><h3 className="mt-2 text-lg font-black text-slate-900 leading-snug">{a.title}</h3><p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-600">{a.content}</p><span className="mt-4 inline-block font-bold text-blue-600">읽어보기 →</span></button>)}{!articles.length&&<div className="md:col-span-2 rounded-3xl border-2 border-dashed border-slate-200 bg-white p-12 text-center text-slate-400">선생님이 뉴스를 준비하고 있습니다.</div>}</div></div><NoticeModal notice={notice} close={()=>setNotice(null)}/></div>;
}

export default function EconomyNewsPanel({user,onBalanceChanged}:{user:User;onBalanceChanged?:()=>void}){
  return user.role===Role.TEACHER?<TeacherNews user={user}/>:<StudentNews user={user} onBalanceChanged={onBalanceChanged}/>;
}
