import React from 'react';
import {createRoot} from 'react-dom/client';
import {DonutCard,VerticalBars} from '../components/VisualAnalytics';
import StudentAssetBars from '../components/StudentAssetBars';
import GlobalExperience from '../components/GlobalExperience';
createRoot(document.getElementById('root')!).render(<GlobalExperience><main className="mx-auto max-w-4xl p-5"><StudentAssetBars students={[{userId:'a',name:'학생 A'},{userId:'b',name:'학생 B'}]} assets={{a:{cash:300,savings:0,stocks:0},b:{cash:500,savings:0,stocks:0}}} unit="톨" onSelect={()=>{}}/><div className="grid grid-cols-2 gap-4"><DonutCard title="툴팁 겹침 확인" data={[{name:'현금',value:300},{name:'예금',value:500}]} onSelect={()=>{}}/><VerticalBars title="예금" metric="예치액" data={[{name:'단기 예금',value:500},{name:'장기 예금',value:300}]} unit="톨"/></div></main></GlobalExperience>);
