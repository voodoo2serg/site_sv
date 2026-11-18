'use client';

const entries=[
 {id:'solo',name:'Соло-Пиар',mark:'СП',site:'https://solo-pr.ru/',admin:'https://cms.solo-pr.ru/admin'},
 {id:'raga',name:'РАГА',mark:'РА',site:'https://raga.vodopetov.ru/'},
 {id:'raga7',name:'Кабинет RAGA7',mark:'R7',site:'https://raga7.vodopetov.ru/'},
 {id:'wited',name:'wi-ted',mark:'WT',site:'https://wi-ted.solo-pr.ru/'},
 {id:'signal',name:'СИГНАЛ',mark:'СИ',site:'https://signal.vodopetov.ru/'},
 {id:'crm',name:'CRM',mark:'CRM',site:'https://crm.solo-pr.ru/crm/',admin:'https://crm.solo-pr.ru/crm/'},
 {id:'lms',name:'Обучение',mark:'LMS',site:'https://lms.solo-pr.ru/'},
 {id:'personal',name:'Личный сайт',mark:'СВ',site:'https://vodopetov.ru/',admin:'https://vodopetov.ru/edit/'}
] as const;

/** Editor-only navigation; destination apps must independently verify identity and rights. */
export default function SignalAppLauncher(){
 return <details className="signal-editor-launcher">
   <summary aria-label="Приложения SIGNAL" title="Приложения SIGNAL">▦</summary>
   <div className="signal-editor-launcher-panel">
     <strong>Приложения SIGNAL</strong>
     <p>Сервисы</p>
     <div className="signal-editor-apps">{entries.map(x=><a key={x.id} href={x.site}><span>{x.mark}</span>{x.name}</a>)}</div>
     <p>Админка</p>
     <div className="signal-editor-apps">
       <a href="/edit/"><span>СВ</span>Редактор</a>
     </div>
     <small>Доступ к админкам других сервисов проверяется ими отдельно. Единый SSO внедряется по AUTH-201…210.</small>
   </div>
 </details>
}
