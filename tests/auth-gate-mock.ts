const listeners=new Set<(event:string,session:any)=>void>();
export const stats={rpc:0};
export const emit=(event:string,id:string|null)=>listeners.forEach(fn=>fn(event,id?{user:{id},access_token:Math.random().toString()}:null));
export const supabase={auth:{onAuthStateChange(fn:any){listeners.add(fn);return {data:{subscription:{unsubscribe(){listeners.delete(fn)}}}}},getSession:async()=>({data:{session:{user:{id:'tester-1'}}}}),signOut:async()=>{emit('SIGNED_OUT',null);return {}},signInWithPassword:async()=>({})},rpc:async()=>{stats.rpc++;return {data:true}}};
