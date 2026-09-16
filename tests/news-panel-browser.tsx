import React from 'react';
import {createRoot} from 'react-dom/client';
import EconomyNewsPanel from '../features/economy-news/EconomyNewsPanel';
import {Role} from '../types';
createRoot(document.getElementById('root')!).render(<div style={{height:'100vh'}}><EconomyNewsPanel user={{userId:'fixture-teacher',role:Role.TEACHER,name:'테스트 교사'} as any}/></div>);
