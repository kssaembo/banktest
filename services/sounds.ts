export type SoundCue='typing-correct'|'typing-success'|'tax-paid'|'success-coin'|'error-soft'|'savings-open'|'news-open';
export const SOUND_KEY='classbank_sound_enabled';
let context:AudioContext|undefined;
let active:HTMLAudioElement|undefined;
const clips=new Map<SoundCue,HTMLAudioElement>();
let lastCue='',lastTime=0;
const enabled=()=>{try{return typeof window!=='undefined'&&localStorage.getItem(SOUND_KEY)!=='off';}catch{return false;}};
export function stopSounds(){active?.pause();if(context?.state==='running')void context.suspend().catch(()=>{});}
export function playSound(cue:SoundCue){
 if(!enabled())return;
 try{
  const now=Date.now();if(lastCue===cue&&now-lastTime<250)return;lastCue=cue;lastTime=now;
  active?.pause();let audio=clips.get(cue);
  if(!audio){audio=new Audio('/sfx/'+cue+(cue==='news-open'?'.mp3':'.wav'));audio.preload='none';clips.set(cue,audio);}
  audio.currentTime=0;audio.volume=cue==='typing-correct'?.3:.45;active=audio;void audio.play().catch(()=>{});
 }catch{/* Audio never changes an operation's outcome. */}
}
export function playButtonSound(group:'default'|'navigation'|'action'|'dismiss'='default'){
 if(!enabled())return;
 try{
  const Ctx=window.AudioContext||(window as any).webkitAudioContext;if(!Ctx)return;
  context??=new Ctx();if(context!.state==='suspended')void context!.resume().catch(()=>{});
  const ctx=context!,osc=ctx.createOscillator(),gain=ctx.createGain();
  const [from,to]=group==='navigation'?[580,760]:group==='action'?[470,740]:group==='dismiss'?[520,400]:[520,720];
  osc.type='sine';osc.frequency.setValueAtTime(from,ctx.currentTime);osc.frequency.exponentialRampToValueAtTime(to,ctx.currentTime+.055);
  gain.gain.setValueAtTime(.035,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.07);
  osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+.075);osc.onended=()=>{osc.disconnect();gain.disconnect()};
 }catch{}
}
export function operationCue(method:string):SoundCue|undefined{
 if(method==='payTax')return 'tax-paid';
 if(['joinSavings','buyStock','joinFund','donate'].includes(method))return 'savings-open';
 if(['transfer','martTransfer','bankerDeposit','bankerWithdraw','issueCurrency','sellStock','processSavingsMaturity','cancelSavings','payAllSalaries','payJobSalary'].includes(method))return 'success-coin';
}
