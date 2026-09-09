import React, { useEffect, useMemo, useState } from 'react';
import { economyReadingLessons } from '../data/economyReadingLessons';
import { announceReward, getReadingCompletions, getRewardSettings, submitReadingLearning } from '../services/learningAddons';
import { Role, User } from '../types';
import { BackIcon, XIcon } from './icons';

interface Props { isOpen: boolean; onClose: () => void; user?: User; onBalanceChanged?: () => void }
type Result = { passed: boolean; correct: number; reward: number; pending: boolean; repeated: boolean } | null;

export const EconomyReadingModal: React.FC<Props> = ({ isOpen, onClose, user, onBalanceChanged }) => {
  const [selectedId,setSelectedId]=useState<string|null>(null),[step,setStep]=useState(0),[revealed,setRevealed]=useState<number[]>([]);
  const [challengeChoice,setChallengeChoice]=useState<number|null>(null),[quizAnswers,setQuizAnswers]=useState<(number|null)[]>([null,null,null]);
  const [result,setResult]=useState<Result>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[rewardAmount,setRewardAmount]=useState<number|null>(null);
  const [completedIds,setCompletedIds]=useState<string[]>([]),[repeatPrompt,setRepeatPrompt]=useState<string|null>(null);
  const lesson=useMemo(()=>economyReadingLessons.find(item=>item.id===selectedId)||null,[selectedId]);
  const unit=user?.currencyUnit||'톨',isStudent=user?.role===Role.STUDENT;

  useEffect(()=>{if(!isOpen)return;const old=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=old};},[isOpen]);
  useEffect(()=>{let active=true;if(isOpen&&user?.teacher_id)getRewardSettings(user.teacher_id).then(s=>{if(active)setRewardAmount(s.reading)}).catch(()=>{if(active)setRewardAmount(null)});return()=>{active=false};},[isOpen,user?.teacher_id]);
  useEffect(()=>{let active=true;if(isOpen&&isStudent&&user)getReadingCompletions(user.userId).then(ids=>{if(active)setCompletedIds(ids||[])}).catch(()=>{});return()=>{active=false};},[isOpen,isStudent,user?.userId]);
  if(!isOpen)return null;

  const resetStep=(next:number)=>{setStep(next);setRevealed([]);setChallengeChoice(null);setError('')};
  const enterLesson=(id:string)=>{setRepeatPrompt(null);setSelectedId(id);setQuizAnswers([null,null,null]);setResult(null);resetStep(0)};
  const openLesson=(id:string)=>{if(isStudent&&completedIds.includes(id)){setRepeatPrompt(id);return;}enterLesson(id)};
  const backToList=()=>{setSelectedId(null);setQuizAnswers([null,null,null]);setResult(null);setError('')};
  const submitQuiz=async()=>{
    if(!lesson||quizAnswers.some(a=>a===null))return;
    const answers=quizAnswers as number[],correct=answers.filter((a,i)=>a===lesson.quiz[i].answer).length;
    if(correct<2){setResult({passed:false,correct,reward:0,pending:false,repeated:false});return;}
    if(!isStudent||!user){setResult({passed:true,correct,reward:0,pending:false,repeated:true});return;}
    setBusy(true);setError('');
    try{const reward=await submitReadingLearning(user.userId,lesson.id,answers);setResult({passed:true,correct,...reward});setCompletedIds(ids=>ids.includes(lesson.id)?ids:[...ids,lesson.id]);announceReward(reward.reward,unit);onBalanceChanged?.();}
    catch(e:any){setError(e.message||'학습 완료를 저장하지 못했습니다.');}finally{setBusy(false)}
  };

  return <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/70 p-0 backdrop-blur-md md:p-4" onClick={onClose}>
    <section className="flex h-full w-full flex-col overflow-hidden bg-[#eef5ff] shadow-2xl md:h-[94vh] md:rounded-[36px]" onClick={e=>e.stopPropagation()}>
      <header className="flex shrink-0 items-center justify-between border-b border-blue-100 bg-white px-5 py-4 md:px-7">
        <div className="flex min-w-0 items-center gap-3">{lesson&&<button onClick={backToList} className="rounded-2xl bg-slate-100 p-3 text-slate-700" aria-label="경제상식 목록"><BackIcon className="h-5 w-5"/></button>}<div className="min-w-0"><p className="text-xs font-black tracking-widest text-blue-600">CLASS BANK ECONOMY LAB</p><h2 className="truncate text-xl font-black text-slate-950 md:text-2xl">{lesson?lesson.title:'경제 상식 탐험'}</h2></div></div>
        <div className="ml-auto flex items-center gap-3">{lesson&&<span className="hidden rounded-full bg-amber-50 px-4 py-2 text-xs font-black text-amber-700 sm:block">{rewardAmount===null?'보상 확인 중':'첫 이수 보상 '+rewardAmount+unit}</span>}<button onClick={onClose} className="rounded-full bg-slate-100 p-3" aria-label="경제상식 닫기"><XIcon className="h-5 w-5"/></button></div>
      </header>

      {!lesson?<div className="min-h-0 flex-1 overflow-y-auto p-5 md:p-8"><div className="mx-auto max-w-6xl">
        <div className="mb-6 rounded-[30px] bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white shadow-lg md:flex md:items-center md:justify-between md:p-8"><div><h3 className="text-2xl font-black md:text-3xl">보고, 눌러 보고, 생각하며 배워요!</h3><p className="mt-2 text-sm leading-6 text-blue-100">각 챕터는 가로형 체험 슬라이드 3장과 확인 문제 3개로 구성됩니다. 2문제 이상 맞히면 이수해요.</p></div><div className="mt-4 text-6xl md:mt-0">🧠✨</div></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{economyReadingLessons.map(item=>{const completed=completedIds.includes(item.id);return <button key={item.id} onClick={()=>openLesson(item.id)} className="group flex min-h-[150px] flex-col rounded-[24px] border-2 border-blue-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"><div className="flex items-center justify-between gap-3"><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">CH.{item.order}</span>{completed&&<span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">✓ 이수 완료</span>}</div><h4 className="mt-4 text-lg font-black text-slate-900">{item.title}</h4><p className="mt-2 text-sm font-semibold leading-5 text-slate-600">{item.summary}</p><span className="mt-auto pt-4 text-xs font-black text-blue-600">{completed?'다시 탐험하기':'탐험 시작'} →</span></button>})}</div>
      </div></div>:<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 border-b border-blue-100 bg-white px-5 py-3"><div className="mx-auto flex max-w-6xl items-center gap-2">{['개념 발견','생활 속 비교','선택 미션','확인 문제'].map((label,index)=><React.Fragment key={label}><div className={`flex items-center gap-2 ${index<=step?'text-blue-700':'text-slate-300'}`}><span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${index<=step?'bg-blue-600 text-white':'bg-slate-100'}`}>{index+1}</span><span className="hidden text-xs font-black sm:block">{label}</span></div>{index<3&&<div className={`h-1 flex-1 rounded-full ${index<step?'bg-blue-500':'bg-slate-100'}`}/>}</React.Fragment>)}</div></div>
        {step<3?<LessonSlide lesson={lesson} step={step} revealed={revealed} setRevealed={setRevealed} challengeChoice={challengeChoice} setChallengeChoice={setChallengeChoice} resetStep={resetStep}/>:<div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6"><div className="mx-auto max-w-5xl rounded-[32px] bg-white p-5 shadow-lg md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black text-blue-600">FINAL QUIZ</p><h3 className="text-2xl font-black text-slate-900">{lesson.title} 확인 문제</h3><p className="mt-1 text-sm text-slate-500">3문제 중 2문제 이상 맞히면 이수합니다.</p></div><span className="text-5xl">🏁</span></div>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">{lesson.quiz.map((item,index)=><article key={item.question} className="rounded-[24px] border border-blue-100 bg-blue-50/40 p-5"><span className="text-xs font-black text-blue-600">문제 {index+1}</span><h4 className="mt-2 min-h-14 font-black leading-6 text-slate-800">{item.question}</h4><div className="mt-3 space-y-2">{item.options.map((option,choice)=><button key={option} disabled={Boolean(result)} onClick={()=>setQuizAnswers(values=>values.map((value,i)=>i===index?choice:value))} className={`w-full rounded-xl border-2 px-3 py-2.5 text-left text-sm font-bold ${quizAnswers[index]===choice?'border-blue-500 bg-white text-blue-700':'border-transparent bg-white text-slate-600'}`}>{choice+1}. {option}</button>)}</div>{result&&<p className={`mt-3 text-xs font-bold ${quizAnswers[index]===item.answer?'text-emerald-700':'text-red-600'}`}>{quizAnswers[index]===item.answer?'정답! ':`정답은 ${item.answer+1}번. `}{item.explain}</p>}</article>)}</div>
          {error&&<p role="alert" className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p>}
          {result?<div className={`mt-6 rounded-[24px] p-5 text-center ${result.passed?'bg-emerald-50':'bg-amber-50'}`}><p className="text-4xl">{result.passed?'🎉':'🌱'}</p><h4 className="mt-2 text-xl font-black text-slate-900">{result.correct}문제를 맞혔어요</h4><p className="mt-2 text-sm font-bold text-slate-600">{result.passed?(result.pending?'이수했어요. 국고 잔액이 부족해 보상은 대기 중입니다.':result.reward>0?`${result.reward}${unit}이 입금됐어요!`:result.repeated?'이미 이수한 챕터라 추가 보상은 없어요.':'챕터를 이수했어요!'):'설명을 다시 살펴보고 재도전해 보세요.'}</p><div className="mt-4 flex justify-center gap-3">{!result.passed&&<button onClick={()=>{setQuizAnswers([null,null,null]);setResult(null)}} className="rounded-2xl bg-amber-500 px-6 py-3 font-black text-white">다시 풀기</button>}<button onClick={backToList} className="rounded-2xl bg-blue-600 px-6 py-3 font-black text-white">챕터 목록</button></div></div>:<div className="mt-6 flex justify-between"><button onClick={()=>resetStep(2)} className="rounded-2xl bg-slate-100 px-5 py-3 font-black text-slate-700">← 슬라이드 보기</button><button disabled={busy||quizAnswers.some(a=>a===null)} onClick={submitQuiz} className="rounded-2xl bg-blue-600 px-7 py-3 font-black text-white disabled:opacity-40">{busy?'확인 중...':'채점하고 이수하기'}</button></div>}
        </div></div>}
      </div>}
      {repeatPrompt&&<div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/60 p-4" onClick={()=>setRepeatPrompt(null)}><div className="w-full max-w-md rounded-[28px] bg-white p-7 text-center shadow-2xl" onClick={e=>e.stopPropagation()}><div className="text-5xl">✅</div><h3 className="mt-4 text-xl font-black text-slate-900">이미 이수한 경제상식입니다</h3><p className="mt-3 text-sm font-semibold leading-6 text-slate-600">재이수는 가능하지만 보상은 다시 받을 수 없습니다.</p><div className="mt-6 flex gap-3"><button onClick={()=>setRepeatPrompt(null)} className="flex-1 rounded-2xl bg-slate-100 py-3 font-black text-slate-700">취소</button><button onClick={()=>enterLesson(repeatPrompt)} className="flex-1 rounded-2xl bg-blue-600 py-3 font-black text-white">재이수하기</button></div></div></div>}
    </section>
  </div>;
};

function LessonSlide({lesson,step,revealed,setRevealed,challengeChoice,setChallengeChoice,resetStep}:any){
  const current=lesson.slides[step];
  return <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6"><div className="mx-auto grid min-h-full max-w-6xl gap-5 rounded-[32px] border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-5 text-slate-900 shadow-xl md:grid-cols-[.78fr_1.22fr] md:p-8">
    <div className="flex flex-col justify-between rounded-[26px] bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-white shadow-lg"><div><span className="rounded-full bg-white/20 px-3 py-1 text-xs font-black">SLIDE {step+1} / 3</span><div className="mt-6 text-7xl">{current.emoji}</div><h3 className="mt-5 text-3xl font-black md:text-4xl">{current.title}</h3><p className="mt-4 text-sm font-semibold leading-7 text-blue-50 md:text-base">{current.lead}</p></div><p className="mt-6 text-xs font-black text-blue-100">카드를 눌러 핵심 내용을 펼쳐보세요.</p></div>
    <div className="flex flex-col gap-4"><div className="grid gap-3 sm:grid-cols-3">{current.facts.map((fact:any,index:number)=>{const open=revealed.includes(index);return <button key={fact.label} onClick={()=>setRevealed((values:number[])=>values.includes(index)?values:[...values,index])} className={`min-h-36 rounded-[22px] border-2 p-4 text-left transition ${open?'border-blue-300 bg-white text-slate-900 shadow-md':'border-slate-200 bg-slate-100 text-slate-800 hover:border-blue-300 hover:bg-blue-50'}`}><span className="text-3xl">{fact.emoji}</span><strong className="mt-3 block">{fact.label}</strong><p className={`mt-2 text-xs font-semibold leading-5 ${open?'text-slate-600':'text-slate-500'}`}>{open?fact.detail:'눌러서 알아보기'}</p></button>})}</div>
      <div className="rounded-[24px] bg-white p-5 text-slate-800"><p className="text-xs font-black text-blue-600">생각 선택</p><h4 className="mt-1 font-black">{current.challenge.question}</h4><div className="mt-3 grid gap-2 sm:grid-cols-2">{current.challenge.options.map((option:any,index:number)=><button key={option.label} onClick={()=>setChallengeChoice(index)} className={`rounded-2xl border-2 px-4 py-3 text-sm font-black ${challengeChoice===index?(index===current.challenge.answer?'border-emerald-500 bg-emerald-50 text-emerald-700':'border-amber-400 bg-amber-50 text-amber-800'):'border-slate-100 bg-slate-50 text-slate-700'}`}>{option.label}</button>)}</div>{challengeChoice!==null&&<p className="mt-3 rounded-xl bg-blue-50 p-3 text-xs font-bold leading-5 text-blue-800">{challengeChoice===current.challenge.answer?'좋은 판단이에요! ':'한 번 더 생각해봐요. '}{current.challenge.explain}</p>}</div>
      <div className="mt-auto flex justify-between gap-3"><button disabled={step===0} onClick={()=>resetStep(step-1)} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 font-black text-slate-700 shadow-sm disabled:opacity-30">← 이전</button><button disabled={challengeChoice===null} onClick={()=>resetStep(step+1)} className="rounded-2xl bg-blue-600 px-6 py-3 font-black text-white shadow disabled:opacity-40">{step===2?'확인 문제 풀기':'다음 슬라이드'} →</button></div>
    </div>
  </div></div>;
}
