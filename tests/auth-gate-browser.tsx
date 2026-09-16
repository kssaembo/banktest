import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import TestAccessGate from '../components/TestAccessGate';
import { emit, stats } from './auth-gate-mock';
let mounts=0;
function App(){useEffect(()=>{mounts++},[]);return <input aria-label="draft" defaultValue="입력 유지"/>}
createRoot(document.getElementById('root')!).render(<React.StrictMode><TestAccessGate><App/></TestAccessGate></React.StrictMode>);
const pause=()=>new Promise(resolve=>setTimeout(resolve,100));
const check=(ok:unknown,message:string)=>{if(!ok)throw Error(message)};
(async()=>{await pause(); await pause();const input=document.querySelector('input[aria-label="draft"]') as HTMLInputElement;check(input,'initial login');input.value='작성 중인 내용';const before=mounts,rpcs=stats.rpc;
for(const event of ['SIGNED_IN','TOKEN_REFRESHED','SIGNED_IN']){emit(event,'tester-1');await pause();check(document.querySelector('input[aria-label="draft"]')===input,'App was replaced');check(input.value==='작성 중인 내용','draft lost');}
check(mounts===before,'remounted');check(stats.rpc===rpcs,'access RPC repeated');
emit('SIGNED_OUT',null);await pause();check(!document.querySelector('input[aria-label="draft"]'),'signout failed');
emit('SIGNED_IN','tester-2');await pause();await pause();check(stats.rpc>rpcs,'new identity not checked');check(document.querySelector('input[aria-label="draft"]'),'new identity failed');
document.getElementById('result')!.textContent='PASS: same-user focus/token events preserve DOM, draft and RPC count; signout blocks; new user rechecks.';
})().catch(error=>document.getElementById('result')!.textContent='FAIL: '+error.message);
