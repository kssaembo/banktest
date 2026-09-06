import {isDemo} from './runtime';
import {api} from './api';
import {playSound} from './sounds';
export async function getMartSales(teacherId:string):Promise<Record<string,number>>{
 if(isDemo)return JSON.parse(localStorage.getItem(`mart-sales:${teacherId}`)||'{}');
 const {supabase}=await import('./supabaseClient');const {data,error}=await supabase.rpc('classbank_mart_sales',{p_teacher:teacherId});if(error)throw new Error('판매량 기록용 SQL(06) 적용 후 집계됩니다.');return data||{};
}
export async function checkoutWithItems(teacherId:string,accountId:string,amount:number,cart:Record<string,number>,requestId:string){
 if(!Object.keys(cart).length)return api.martTransfer(accountId,amount,'FROM_STUDENT');
 if(isDemo){const message=await api.martTransfer(accountId,amount,'FROM_STUDENT');const sales=await getMartSales(teacherId);for(const [id,qty]of Object.entries(cart))sales[id]=(sales[id]||0)+qty;localStorage.setItem(`mart-sales:${teacherId}`,JSON.stringify(sales));return message;}
 const {supabase}=await import('./supabaseClient');const {data,error}=await supabase.rpc('classbank_mart_checkout',{p_account:accountId,p_amount:amount,p_cart:cart,p_request:requestId});if(error)throw new Error(error.code==='PGRST202'?'상품 결제 전 테스트 DB에 SQL(06)을 적용해 주세요. 결제는 실행되지 않았습니다.':error.message);playSound('success-coin');return data as string;
}
