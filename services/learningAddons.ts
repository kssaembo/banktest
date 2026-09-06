import {isDemo} from './runtime';
export type RewardSettings={news:number;reading:number};
export const ADDON_SETUP_MESSAGE='부가기능 SQL(05)을 테스트 Supabase에 적용해 주세요. 기본 금융 기능은 계속 사용할 수 있습니다.';
async function rpc(name:string,args:Record<string,unknown>){const {supabase}=await import('./supabaseClient');const {data,error}=await supabase.rpc(name,args);if(error){if(['PGRST202','42P01','42883'].includes(error.code))throw new Error(ADDON_SETUP_MESSAGE);throw new Error(error.message);}return data;}
export async function getRewardSettings(teacherId:string):Promise<RewardSettings>{if(isDemo)return JSON.parse(localStorage.getItem(`learning-settings:${teacherId}`)||'{"news":0,"reading":0}');return rpc('classbank_learning_settings',{p_teacher:teacherId});}
export async function saveRewardSettings(teacherId:string,settings:RewardSettings){if(!Object.values(settings).every(v=>Number.isInteger(v)&&v>=0&&v<=1000000))throw new Error('보상은 0~1,000,000 사이의 정수로 입력해 주세요.');if(isDemo){localStorage.setItem(`learning-settings:${teacherId}`,JSON.stringify(settings));return;}return rpc('classbank_learning_settings',{p_teacher:teacherId,p_news:settings.news,p_reading:settings.reading});}
export async function submitNewsLearning(userId:string,articleId:string,content:string):Promise<{reward:number;pending:boolean;repeated:boolean}>{return rpc('classbank_submit_news_learning',{p_student:userId,p_article:articleId,p_content:content});}
export async function syncTypingBadges(userId:string,badges:string[]):Promise<string[]>{if(isDemo)return badges;return rpc('classbank_sync_typing_badges',{p_student:userId,p_badges:badges});}
export function announceReward(amount:number,unit:string){if(amount>0)window.dispatchEvent(new CustomEvent('classbank-reward',{detail:{amount,unit}}));}
