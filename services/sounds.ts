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
export type ButtonSoundGroup='default'|'navigation'|'action'|'dismiss'|'move'|'attack';
export async function playButtonSound(group:ButtonSoundGroup='default'){
 if(!enabled())return;
 try{
  const Ctx=window.AudioContext||(window as any).webkitAudioContext;if(!Ctx)return;
  if(!context||context.state==='closed')context=new Ctx();
  const ctx=context!;
  if(ctx.state!=='running')await ctx.resume();
  if(!enabled()||ctx.state!=='running')return;
  const osc=ctx.createOscillator(),gain=ctx.createGain();
  const tones:Record<ButtonSoundGroup,[number,number]>={default:[520,720],navigation:[580,760],action:[470,740],dismiss:[520,400],move:[260,340],attack:[190,70]};
  const [from,to]=tones[group],duration=group==='attack'?.14:group==='move'?.045:.085;
  osc.type=group==='attack'?'triangle':'sine';osc.frequency.setValueAtTime(from,ctx.currentTime);osc.frequency.exponentialRampToValueAtTime(to,ctx.currentTime+duration*.8);
  gain.gain.setValueAtTime(group==='move'?.025:.065,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+duration);
  osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+duration);osc.onended=()=>{osc.disconnect();gain.disconnect()};
 }catch{/* Sound failure must never interrupt input. */}
}
export function operationCue(method:string):SoundCue|undefined{
 if(method==='payTax')return 'tax-paid';
 if(['joinSavings','buyStock','joinFund','donate'].includes(method))return 'savings-open';
 if(['transfer','martTransfer','bankerDeposit','bankerWithdraw','issueCurrency','sellStock','processSavingsMaturity','cancelSavings','payAllSalaries','payJobSalary'].includes(method))return 'success-coin';
}
