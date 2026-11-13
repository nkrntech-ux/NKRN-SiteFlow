import {useEffect, useMemo, useState, type FormEvent, type ReactNode} from 'react';
import {
  AlertTriangle, ArrowRight, ArrowUp, Bookmark, Building2, CalendarDays,
  Check, CheckCircle2, ChevronRight, ClipboardList, Clock3, Copy,
  Download, HardHat, HelpCircle, LayoutDashboard, MapPin, Menu, MessageSquare,
  Moon, MoreHorizontal, Printer, Search, Send, Settings, Share2,
  ShieldCheck, Smartphone, Sun, Users, X
} from 'lucide-react';
import {translate, type Language} from './i18n';

type Page = 'dashboard' | 'planning' | 'tasks' | 'projects' | 'people' | 'messages' | 'settings';
type Status = 'planned' | 'inProgress' | 'complete' | 'blocked';
type Channel = 'SMS' | 'WhatsApp' | 'Voorman';
type Task = {id: number; title: string; titleKey?: string; project: string; team: string; time: string; status: Status; channel: Channel};
type Draft = {title: string; project: string; team: string; time: string; channel: Channel};
type Legal = 'privacy' | 'terms' | 'popia';
type InstallPromptEvent = Event & {prompt: () => Promise<void>; userChoice: Promise<{outcome: string}>};

const INITIAL_TASKS: Task[] = [
  {id:101,title:'Voltooi kombuis se teëlwerk',titleKey:'sampleTask1',project:'Boschkop Residence',team:'Pieter se span',time:'07:00',status:'inProgress',channel:'SMS'},
  {id:102,title:'Begin voorbereiding vir verfwerk',titleKey:'sampleTask2',project:'Silver Lakes Renovation',team:'Johan se span',time:'07:30',status:'planned',channel:'Voorman'},
  {id:103,title:'Inspekteer elektriese installasie',titleKey:'sampleTask3',project:'Faerie Glen Offices',team:'André',time:'09:00',status:'blocked',channel:'WhatsApp'},
  {id:104,title:'Finaliseer pleisterwerk',titleKey:'sampleTask4',project:'Boschkop Residence',team:'Sipho se span',time:'08:00',status:'complete',channel:'SMS'}
];
const PROJECTS = [
  {name:'Boschkop Residence',type:'typeResidential',progress:72,team:8,location:'Boschkop, Pretoria'},
  {name:'Silver Lakes Renovation',type:'typeRenovation',progress:46,team:5,location:'Silver Lakes, Pretoria'},
  {name:'Faerie Glen Offices',type:'typeCommercial',progress:31,team:4,location:'Faerie Glen, Pretoria'}
];
const PEOPLE = [
  {name:'Pieter van der Merwe',role:'supervisorRole',channel:'SMS' as Channel,team:'Pieter se span'},
  {name:'Johan Mokoena',role:'supervisorRole',channel:'Voorman' as Channel,team:'Johan se span'},
  {name:'Sipho Dlamini',role:'workerRole',channel:'SMS' as Channel,team:'Sipho se span'},
  {name:'André Botha',role:'electricianRole',channel:'WhatsApp' as Channel,team:'André'}
];
const PAGES = [
  {id:'dashboard',key:'overview',icon:LayoutDashboard},
  {id:'planning',key:'planning',icon:CalendarDays},
  {id:'tasks',key:'tasks',icon:ClipboardList},
  {id:'projects',key:'projects',icon:Building2},
  {id:'people',key:'people',icon:Users},
  {id:'messages',key:'messages',icon:MessageSquare},
  {id:'settings',key:'settings',icon:Settings}
] as const;
const STATUS_VALUES: Status[] = ['planned','inProgress','complete','blocked'];
const blankDraft = (): Draft => ({title:'',project:PROJECTS[0].name,team:PEOPLE[0].team,time:'07:00',channel:'SMS'});
const STATUS_MIGRATION: Record<string, Status> = {'Beplan':'planned','Aan die gang':'inProgress','Voltooi':'complete','Geblokkeer':'blocked', planned:'planned',inProgress:'inProgress',complete:'complete',blocked:'blocked'};

function readSaved<T>(key:string, fallback:T): T {
  try {const value=localStorage.getItem(key);return value?JSON.parse(value) as T:fallback;} catch{return fallback;}
}
function loadTasks():Task[] {
  const fromStorage=readSaved<Task[]>('siteflow-tasks',INITIAL_TASKS);
  if(!Array.isArray(fromStorage))return INITIAL_TASKS;
  return fromStorage.filter(x=>x&&typeof x.title==='string').map(x=>({...x,status:STATUS_MIGRATION[String(x.status)]??'planned',titleKey:x.titleKey ?? INITIAL_TASKS.find(i=>i.id===x.id && i.title===x.title)?.titleKey}));
}

export default function App(){
  const [page,setPage]=useState<Page>('dashboard');
  const [language,setLanguage]=useState<Language>(()=>localStorage.getItem('sf-language')==='en'?'en':'af');
  const [dark,setDark]=useState(()=>localStorage.getItem('sf-dark')==='true');
  const [fontScale,setFontScale]=useState(()=>Math.min(120,Math.max(90,Number(localStorage.getItem('sf-font')||100))));
  const [tasks,setTasks]=useState<Task[]>(loadTasks);
  const [draft,setDraft]=useState<Draft>(()=>readSaved('sf-draft',blankDraft()));
  const [saved,setSaved]=useState<number[]>(()=>readSaved('sf-saved',[]));
  const [recent,setRecent]=useState<Page[]>(()=>readSaved('sf-recent',[]));
  const [search,setSearch]=useState('');
  const [statusFilter,setStatusFilter]=useState<Status|'all'>('all');
  const [sort,setSort]=useState<'time'|'title'|'status'>('time');
  const [faqSearch,setFaqSearch]=useState('');
  const [drawer,setDrawer]=useState(false);
  const [more,setMore]=useState(false);
  const [taskModal,setTaskModal]=useState(false);
  const [shortcuts,setShortcuts]=useState(false);
  const [legal,setLegal]=useState<Legal|null>(null);
  const [toast,setToast]=useState('');
  const [scrollProgress,setScrollProgress]=useState(0);
  const [isOnline,setIsOnline]=useState(()=>navigator.onLine);
  const [pwaReady,setPwaReady]=useState(false);
  const [installPrompt,setInstallPrompt]=useState<InstallPromptEvent|null>(null);
  const [installed,setInstalled]=useState(()=>window.matchMedia('(display-mode: standalone)').matches);
  const t=(key:string)=>translate(language,key);
  const displayTask=(task:Task)=>task.titleKey?t(task.titleKey):task.title;
  const displayTeam=(team:string)=>language==='en'?team.replace(' se span',' team'):team;
  const channelLabel=(channel:Channel)=>channel==='Voorman'?t('supervisorRole'):channel;
  const activeTitle=t(PAGES.find(n=>n.id===page)?.key??'overview');

  useEffect(()=>{
    const goOnline=()=>setIsOnline(true);
    const goOffline=()=>setIsOnline(false);
    const onPrompt=(event:Event)=>{event.preventDefault();setInstallPrompt(event as InstallPromptEvent);};
    const onInstalled=()=>{setInstalled(true);setInstallPrompt(null);};
    window.addEventListener('online',goOnline);
    window.addEventListener('offline',goOffline);
    window.addEventListener('beforeinstallprompt',onPrompt);
    window.addEventListener('appinstalled',onInstalled);
    if('serviceWorker' in navigator){void navigator.serviceWorker.ready.then(()=>setPwaReady(true)).catch(()=>{});}
    return()=>{
      window.removeEventListener('online',goOnline);
      window.removeEventListener('offline',goOffline);
      window.removeEventListener('beforeinstallprompt',onPrompt);
      window.removeEventListener('appinstalled',onInstalled);
    };
  },[]);
  useEffect(()=>{document.documentElement.lang=language;document.title=`${activeTitle} | SiteFlow — Meridium Construction`;localStorage.setItem('sf-language',language);},[language,activeTitle]);
  useEffect(()=>{document.documentElement.dataset.theme=dark?'dark':'light';localStorage.setItem('sf-dark',String(dark));},[dark]);
  useEffect(()=>{document.documentElement.style.fontSize=fontScale+'%';localStorage.setItem('sf-font',String(fontScale));},[fontScale]);
  useEffect(()=>localStorage.setItem('siteflow-tasks',JSON.stringify(tasks)),[tasks]);
  useEffect(()=>localStorage.setItem('sf-draft',JSON.stringify(draft)),[draft]);
  useEffect(()=>localStorage.setItem('sf-saved',JSON.stringify(saved)),[saved]);
  useEffect(()=>{
    setRecent(current=>{
      const updated=[page,...current.filter(x=>x!==page)].slice(0,5);
      localStorage.setItem('sf-recent',JSON.stringify(updated));return updated;
    });
  },[page]);
  useEffect(()=>{if(!toast)return;const timer=window.setTimeout(()=>setToast(''),3600);return()=>window.clearTimeout(timer);},[toast]);
  useEffect(()=>{
    const update=()=>{const max=document.documentElement.scrollHeight-window.innerHeight;setScrollProgress(max>0?Math.max(0,Math.min(100,window.scrollY/max*100)):0);};
    window.addEventListener('scroll',update,{passive:true});update();return()=>window.removeEventListener('scroll',update);
  },[page]);
  useEffect(()=>{
    const handle=(event:KeyboardEvent)=>{
      const inField=event.target instanceof HTMLElement && Boolean(event.target.closest('input,textarea,select,[contenteditable="true"]'));
      if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){
        event.preventDefault();goTo('tasks');window.setTimeout(()=>document.querySelector<HTMLInputElement>('#task-search')?.focus(),60);
      }
      if(event.key==='Escape'){setDrawer(false);setMore(false);setLegal(null);setTaskModal(false);setShortcuts(false);}
      if(event.key==='?'&&!inField)setShortcuts(s=>!s);
    };
    window.addEventListener('keydown',handle);return()=>window.removeEventListener('keydown',handle);
  },[]);

  function goTo(target:Page){setPage(target);setDrawer(false);setMore(false);window.scrollTo({top:0,behavior:'instant'});}
  function changeStatus(id:number,status:Status){setTasks(old=>old.map(item=>item.id===id?{...item,status}:item));}
  function toggleSaved(id:number){setSaved(old=>old.includes(id)?old.filter(x=>x!==id):[...old,id]);}
  function addTask(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(!draft.title.trim())return;
    setTasks(current=>[{...draft,title:draft.title.trim(),id:Date.now(),status:'planned'},...current]);
    setDraft(blankDraft());setTaskModal(false);setToast(t('savedTask'));
  }
  async function copyList(){
    const content=filtered.map(item=>`${item.time} | ${displayTask(item)} | ${displayTeam(item.team)} | ${t(item.status)}`).join('\n');
    try{await navigator.clipboard.writeText(content);setToast(t('copied'));}catch{setToast(t('copyFailed'));}
  }
  async function share(){
    const details={title:'SiteFlow — Meridium',url:location.href};
    try{if(navigator.share){await navigator.share(details);}else{await navigator.clipboard.writeText(details.url);setToast(t('shared'));}}catch(error){if(!(error instanceof DOMException && error.name==='AbortError'))setToast(t('shareFailed'));}
  }
  async function installApp(){
    if(!installPrompt)return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }
  function simulate(){setToast(t('simulateNotice'));}
  const filtered=useMemo(()=>tasks.filter(task=>{
    const title=task.titleKey?translate(language,task.titleKey):task.title;
    const searchString=`${title} ${task.title} ${task.project} ${task.team}`.toLocaleLowerCase();
    return searchString.includes(search.toLocaleLowerCase())&&(statusFilter==='all'||task.status===statusFilter);
  }).sort((a,b)=>sort==='title'?displayForSort(a,language).localeCompare(displayForSort(b,language)):sort==='status'?a.status.localeCompare(b.status):a.time.localeCompare(b.time)),[tasks,search,statusFilter,sort,language]);

  const showTaskTable=(items:Task[],id:string)=> <TaskList id={id} tasks={items} language={language} onStatus={changeStatus} saved={saved} onSave={toggleSaved}/>;
  const faq=[{question:t('faqSmsQ'),answer:t('faqSmsA')},{question:t('faqOfflineQ'),answer:t('faqOfflineA')},{question:t('faqSendQ'),answer:t('faqSendA')}].filter(item=>`${item.question} ${item.answer}`.toLocaleLowerCase().includes(faqSearch.toLocaleLowerCase()));

  return <div className="app">
    <div className="reading-progress" style={{width:`${scrollProgress}%`}}/>
    {drawer&&<button className="drawer-backdrop" aria-label={t('closeMenu')} onClick={()=>setDrawer(false)}/>}
    <aside className={`sidebar ${drawer?'open':''}`} aria-label={t('workspace')}>
      <div className="brand">
        <img src="/siteflow-wordmark-on-dark.png" className="siteflow-logo" alt="SiteFlow"/>
        <span className="siteflow-byline">NKRN Technologies</span>
        <button className="mobile-close icon-control" aria-label={t('closeMenu')} onClick={()=>setDrawer(false)}><X size={20}/></button>
      </div>
      <div className="org"><div className="org-logo-frame"><img src="/meridium-mark.png" alt="Meridium Construction"/></div><div><strong>Meridium Construction</strong><small>{t('demoWorkspace')}</small></div></div>
      <div className="nav-label">{t('workspace')}</div>
      <nav className="side-nav">{PAGES.map(item=><button key={item.id} className={page===item.id?'active':''} onClick={()=>goTo(item.id)} aria-current={page===item.id?'page':undefined}><item.icon size={19}/><span>{t(item.key)}</span></button>)}</nav>
      <div className="sidebar-foot"><span className={`online-mark ${!isOnline?'is-offline':''}`}/> {t(isOnline?'onlineNow':'offlineNow')} <small>{t('localData')}</small></div>
    </aside>
    <main id="main-content">
      <header className="topbar">
        <div className="topbar-left">
          <button className="menu-btn icon-control" aria-label={t('menu')} onClick={()=>setDrawer(true)}><Menu size={22}/></button>
          <div className="topbar-heading"><span className="breadcrumb">MERIDIUM / SITEFLOW</span><h1>{activeTitle}</h1></div>
        </div>
        <div className="header-actions">
          <label className="lang-switch"><span className="sr-only">{t('changeLanguage')}</span><select value={language} onChange={event=>setLanguage(event.target.value as Language)} aria-label={t('changeLanguage')}><option value="af">AF</option><option value="en">EN</option></select></label>
          <button className="icon-control" title={dark?t('lightMode'):t('darkMode')} aria-label={t('toggleTheme')} onClick={()=>setDark(!dark)}>{dark?<Sun size={20}/>:<Moon size={20}/>}</button>
          <button className="icon-control desktop-only" title={t('shortcuts')} aria-label={t('shortcuts')} onClick={()=>setShortcuts(true)}><HelpCircle size={19}/></button>
          <span className="demo-pill">{t('demo')}</span>
        </div>
      </header>
      <div className="content">
        <div className="client-strip"><div className="client-logo"><img src="/meridium-logo.png" alt="Meridium Construction"/></div><div><span className="eyebrow">{t('sampleData')}</span><strong>Meridium Construction</strong><small>{t('sampleOnly')}</small></div></div>
        {recent.length>1&&<div className="recent" aria-label={t('recent')}><span>{t('recent')}:</span>{recent.filter(x=>x!==page).slice(0,3).map(id=><button key={id} onClick={()=>goTo(id)}>{t(PAGES.find(x=>x.id===id)?.key??'overview')}</button>)}</div>}
        {page==='dashboard'&&<>
          <section className="welcome"><div><span className="eyebrow">{t('sampleData')}</span><h2>{t('demoIntro')}</h2><p>{t('demoExplain')}</p><button className="primary" onClick={()=>goTo('planning')}><CalendarDays size={18}/>{t('buildPlan')}<ArrowRight size={17}/></button></div><HardHat className="hero-icon" size={110} strokeWidth={1}/></section>
          <div className="metrics"><Metric icon={<Building2/>} label={t('activeProjects')} value="03" sub={t('residentialCommercial')}/><Metric icon={<Users/>} label={t('fieldTeams')} value="04" sub={t('sampleWorkers')}/><Metric icon={<ClipboardList/>} label={t('totalTasks')} value={String(tasks.length).padStart(2,'0')} sub={t('todaysTasks')}/><Metric icon={<AlertTriangle/>} label={t('needsAttention')} value={String(tasks.filter(x=>x.status==='blocked').length).padStart(2,'0')} sub={t('blockedTasks')}/></div>
          <div className="two-cols"><section className="panel"><SectionHeading title={t('todaysPlan')} action={<button className="text-btn" onClick={()=>goTo('tasks')}>{t('viewAll')}<ArrowRight size={16}/></button>}/>{showTaskTable(tasks.slice(0,4),'dashboard-tasks')}</section><section className="panel"><SectionHeading title={t('projectOverview')}/>{PROJECTS.map(project=><ProjectProgress key={project.name} project={project}/>)}<div className="notice"><ShieldCheck size={20}/><div><strong>{t('demoNoteTitle')}</strong><p>{t('demoNote')}</p></div></div></section></div>
        </>}
        {page==='planning'&&<><PageIntro title={t('planHeading')} subtitle={t('planDescription')}/><div className="planning-layout"><section className="panel"><SectionHeading title={t('todaysPlan')}/>{showTaskTable(tasks,'planning-tasks')}<div className="panel-actions"><button className="outline" onClick={()=>window.print()}><Printer size={17}/>{t('print')}</button><button className="primary" onClick={simulate}><Send size={17}/>{t('simulate')}</button></div></section><section className="panel"><SectionHeading title={t('planSteps')}/><ol className="process-list">{['planStep1','planStep2','planStep3','planStep4'].map((key,i)=><li key={key}><span>{i+1}</span>{t(key)}</li>)}</ol><SectionHeading title={t('channelOverview')}/><div className="channel-list"><div><Smartphone size={18}/>{t('mobilePhone')}<strong>SMS</strong></div><div><MessageSquare size={18}/>{t('smartphones')}<strong>WA</strong></div><div><Users size={18}/>{t('supervisor')}<strong>—</strong></div></div><p className="muted">{t('noIntegrations')}</p></section></div></>}
        {page==='tasks'&&<><PageIntro title={t('allTasks')} subtitle={t('tasksDescription')} action={<button className="primary" onClick={()=>setTaskModal(true)}><ClipboardList size={17}/>{t('newTask')}</button>}/><section className="panel"><div className="toolbar"><Search size={19}/><input id="task-search" value={search} onChange={e=>setSearch(e.target.value)} placeholder={t('searchTasks')} aria-label={t('searchTasks')}/>{search&&<button className="icon-control" aria-label={t('close')} onClick={()=>setSearch('')}><X size={17}/></button>}</div><div className="filters"><select aria-label={t('status')} value={statusFilter} onChange={e=>setStatusFilter(e.target.value as Status|'all')}><option value="all">{t('allStatuses')}</option>{STATUS_VALUES.map(status=><option value={status} key={status}>{t(status)}</option>)}</select><select aria-label={t('sortTime')} value={sort} onChange={e=>setSort(e.target.value as typeof sort)}><option value="time">{t('sortTime')}</option><option value="title">{t('sortName')}</option><option value="status">{t('sortStatus')}</option></select><button className="outline" onClick={copyList}><Copy size={16}/>{t('copyList')}</button></div>{showTaskTable(filtered,'all-tasks')}<div className="saved-list"><strong>{t('savedItems')} ({saved.length})</strong>{tasks.filter(item=>saved.includes(item.id)).map(item=><button key={item.id} onClick={()=>{setStatusFilter('all');setSearch(displayTask(item));}}>{displayTask(item)}</button>)}</div></section></>}
        {page==='projects'&&<><PageIntro title={t('projectList')} subtitle={t('projectDescription')}/><div className="project-grid">{PROJECTS.map(project=><article className="panel project-card" key={project.name}><div className="project-icon"><Building2/></div><h3>{project.name}</h3><p>{t(project.type)}</p><div className="muted-line"><MapPin size={16}/>{project.location}</div><div className="muted-line"><Users size={16}/>{project.team} {t('workers')}</div><ProjectProgress project={project}/></article>)}</div></>}
        {page==='people'&&<><PageIntro title={t('peopleList')} subtitle={t('peopleDescription')}/><section className="panel"><div className="workforce-list">{PEOPLE.map(person=><article className="person-card" key={person.name}><div className="person-avatar">{person.name.split(' ').map(x=>x[0]).slice(0,2).join('')}</div><div className="person-info"><strong>{person.name}</strong><small>{t(person.role)} · {displayTeam(person.team)}</small></div><span className="channel-chip">{channelLabel(person.channel)}</span></article>)}</div></section></>}
        {page==='messages'&&<><PageIntro title={t('messageCenter')} subtitle={t('messagesDescription')}/><div className="two-cols"><section className="panel"><SectionHeading title={t('smsPreview')}/><div className="sms-preview"><strong>{t('smsHeader')}</strong><div>{t('smsProject')}: {PROJECTS[0].name}</div><div>{t('smsStart')}: 07:00</div><div>{t('smsTask')}: {t('sampleTask1')}</div><div>{t('smsTeam')}: {displayTeam(PEOPLE[0].team)}</div><div>{t('smsHelp')}</div></div><button className="primary" onClick={simulate}><Send size={17}/>{t('simulateSms')}</button></section><section className="panel"><SectionHeading title={t('deliveryProcess')}/><ol className="process-list">{['planStep1','planStep2','planStep3','planStep4'].map((key,i)=><li key={key}><span>{i+1}</span>{t(key)}</li>)}</ol><p className="muted">{t('noSms')}</p></section></div></>}
        {page==='settings'&&<div className="settings-stack"><section className="panel"><SectionHeading title={t('preferences')}/><div className="settings-row"><label htmlFor="text-range">{t('textSize')}</label><div><input id="text-range" type="range" min="90" max="120" step="5" value={fontScale} onChange={e=>setFontScale(Number(e.target.value))}/><output htmlFor="text-range">{fontScale}%</output></div></div><div className="settings-row"><label>{t('changeLanguage')}</label><div className="language-choices"><button className={language==='af'?'selected':''} onClick={()=>setLanguage('af')} aria-pressed={language==='af'}>Afrikaans</button><button className={language==='en'?'selected':''} onClick={()=>setLanguage('en')} aria-pressed={language==='en'}>English</button></div></div><div className="settings-row"><label>{t('shareDemo')}</label><button className="outline" onClick={share}><Share2 size={16}/>{t('shareDemo')}</button></div></section><section className="panel"><SectionHeading title={t('help')}/><div className="toolbar"><Search size={18}/><input value={faqSearch} onChange={e=>setFaqSearch(e.target.value)} placeholder={t('searchFaq')} aria-label={t('searchFaq')}/></div>{faq.map(item=><details key={item.question}><summary>{item.question}<ChevronRight size={16}/></summary><p>{item.answer}</p></details>)}</section><section className="panel"><SectionHeading title={t('offline')}/><p className="muted">{t('offlineNotice')}</p><div className="pwa-state"><span className={`online-mark ${!isOnline?'is-offline':''}`}/><strong>{t(isOnline?'onlineNow':'offlineNow')}</strong></div><p className="muted">{t(pwaReady?'pwaCached':'pwaPreparing')}</p>{installPrompt&&!installed&&<button className="primary" type="button" onClick={()=>{void installApp();}}><Download size={17}/>{t('installApp')}</button>}{installed&&<p className="muted">{t('alreadyInstalled')}</p>}<p className="muted">{t('installGuide')}</p><p className="muted">{t('pwaProtection')}</p><p className="muted">{t('storageNotice')}</p><button className="outline" onClick={()=>{setTasks(INITIAL_TASKS);setSaved([]);setDraft(blankDraft());setToast(t('restored'));}}>{t('resetData')}</button></section></div>}
      </div>
      <footer className="legal-footer"><div className="legal-brand"><img src="/nkrn-technologies-on-light.png" alt="NKRN Technologies"/><span>SiteFlow · {t('demo')}</span></div><div className="legal-links"><button onClick={()=>setLegal('privacy')}>{t('privacy')}</button><button onClick={()=>setLegal('terms')}>{t('terms')}</button><button onClick={()=>setLegal('popia')}>{t('popia')}</button></div></footer>
    </main>
    <nav className="bottom-nav" aria-label={t('workspace')}>
      {PAGES.slice(0,4).map(item=><button key={item.id} onClick={()=>goTo(item.id)} className={page===item.id?'active':''} aria-current={page===item.id?'page':undefined}><item.icon size={21}/><span>{t(item.key)}</span></button>)}
      <button onClick={()=>setMore(true)} className={['people','messages','settings'].includes(page)?'active':''} aria-label={t('more')}><MoreHorizontal size={22}/><span>{t('more')}</span></button>
    </nav>
    {more&&<div className="overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setMore(false);}}><section className="dialog mobile-more" role="dialog" aria-modal="true" aria-label={t('more')}><div className="dialog-heading"><h3>{t('more')}</h3><button className="icon-control" aria-label={t('close')} onClick={()=>setMore(false)}><X size={20}/></button></div>{PAGES.slice(4).map(item=><button key={item.id} onClick={()=>goTo(item.id)} className="more-link"><item.icon size={20}/>{t(item.key)}<ChevronRight size={17}/></button>)}</section></div>}
    {taskModal&&<div className="overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setTaskModal(false);}}><section className="dialog task-dialog" role="dialog" aria-modal="true" aria-labelledby="task-heading"><div className="dialog-heading"><h3 id="task-heading">{t('newTask')}</h3><button className="icon-control" aria-label={t('closeDialog')} onClick={()=>setTaskModal(false)}><X size={20}/></button></div><form onSubmit={addTask}><label>{t('taskDescription')}<input autoFocus value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})} placeholder={t('taskExample')} required/></label><label>{t('project')}<select value={draft.project} onChange={e=>setDraft({...draft,project:e.target.value})}>{PROJECTS.map(item=><option key={item.name} value={item.name}>{item.name}</option>)}</select></label><label>{t('team')}<select value={draft.team} onChange={e=>setDraft({...draft,team:e.target.value})}>{PEOPLE.map(item=><option key={item.name} value={item.team}>{displayTeam(item.team)}</option>)}</select></label><div className="form-grid"><label>{t('startTime')}<input type="time" value={draft.time} onChange={e=>setDraft({...draft,time:e.target.value})}/></label><label>{t('channel')}<select value={draft.channel} onChange={e=>setDraft({...draft,channel:e.target.value as Channel})}><option value="SMS">SMS</option><option value="Voorman">{t('supervisorRole')}</option><option value="WhatsApp">WhatsApp</option></select></label></div><small className="autosave-hint"><Check size={15}/>{t('formAutoSaved')}</small><button className="primary full" type="submit">{t('saveTask')}</button></form></section></div>}
    {legal&&<div className="overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setLegal(null);}}><section className="dialog legal-dialog" role="dialog" aria-modal="true" aria-label={t(legal)}><div className="dialog-heading"><h3>{t(legal)}</h3><button className="icon-control" aria-label={t('closeDialog')} onClick={()=>setLegal(null)}><X size={20}/></button></div><strong>{t('legalDraft')}</strong><p>{t('legalOne')}</p><p>{t('legalTwo')}</p><p className="muted">{t('legalPlaceholder')}</p></section></div>}
    {shortcuts&&<div className="overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setShortcuts(false);}}><section className="dialog" role="dialog" aria-modal="true" aria-label={t('shortcutsTitle')}><div className="dialog-heading"><h3>{t('shortcutsTitle')}</h3><button className="icon-control" aria-label={t('closeDialog')} onClick={()=>setShortcuts(false)}><X size={20}/></button></div><p><kbd>Ctrl</kbd> + <kbd>K</kbd> — {t('shortcutSearch')}</p><p><kbd>?</kbd> — {t('shortcutHelp')}</p><p><kbd>Esc</kbd> — {t('shortcutClose')}</p></section></div>}
    <button className="back-to-top" aria-label={t('backToTop')} onClick={()=>window.scrollTo({top:0,behavior:'smooth'})}><ArrowUp size={18}/></button>
    {toast&&<div className="toast" role="status"><CheckCircle2 size={18}/>{toast}</div>}
  </div>;
}

function displayForSort(task:Task,language:Language){return task.titleKey?translate(language,task.titleKey):task.title;}
function Metric({icon,label,value,sub}:{icon:ReactNode,label:string,value:string,sub:string}){return <div className="metric"><div className="metric-top"><span>{label}</span><div className="metric-icon">{icon}</div></div><strong>{value}</strong><small>{sub}</small></div>;}
function SectionHeading({title,action}:{title:string,action?:ReactNode}){return <div className="section-heading"><h3>{title}</h3>{action}</div>;}
function PageIntro({title,subtitle,action}:{title:string,subtitle:string,action?:ReactNode}){return <div className="page-intro"><div><h2>{title}</h2><p>{subtitle}</p></div>{action}</div>;}
function ProjectProgress({project}:{project:typeof PROJECTS[number]}){return <div className="project-progress"><div className="project-progress-meta"><strong>{project.name}</strong><span>{project.progress}%</span></div><div className="progress" role="progressbar" aria-label={project.name} aria-valuemin={0} aria-valuemax={100} aria-valuenow={project.progress}><div style={{width:`${project.progress}%`}}/></div></div>;}
function TaskList({id,tasks,language,onStatus,saved,onSave}:{id:string,tasks:Task[],language:Language,onStatus:(id:number,status:Status)=>void,saved:number[],onSave:(id:number)=>void}){
  const t=(key:string)=>translate(language,key);
  const title=(task:Task)=>task.titleKey?t(task.titleKey):task.title;
  const team=(value:string)=>language==='en'?value.replace(' se span',' team'):value;
  return <div className="task-list" id={id}>
    <div className="table-scroll"><table><thead><tr><th>{t('task')}</th><th>{t('team')}</th><th>{t('time')}</th><th>{t('status')}</th><th>{t('channel')}</th><th>{t('save')}</th></tr></thead><tbody>{tasks.map(task=><tr key={task.id}><td><strong>{title(task)}</strong><small>{task.project}</small></td><td>{team(task.team)}</td><td>{task.time}</td><td><select className={`status-select status-${task.status}`} aria-label={`${t('status')}: ${title(task)}`} value={task.status} onChange={e=>onStatus(task.id,e.target.value as Status)}>{STATUS_VALUES.map(status=><option key={status} value={status}>{t(status)}</option>)}</select></td><td><span className="channel-chip">{task.channel==='Voorman'?t('supervisorRole'):task.channel}</span></td><td><button className="icon-control" aria-label={`${t('saveLater')}: ${title(task)}`} aria-pressed={saved.includes(task.id)} onClick={()=>onSave(task.id)}><Bookmark size={18} fill={saved.includes(task.id)?'currentColor':'none'}/></button></td></tr>)}</tbody></table></div>
    <div className="mobile-task-list">{tasks.map(task=><article className="mobile-task" key={task.id}><div className="mobile-task-top"><span className="task-time"><Clock3 size={15}/>{task.time}</span><button className="icon-control" aria-label={`${t('saveLater')}: ${title(task)}`} aria-pressed={saved.includes(task.id)} onClick={()=>onSave(task.id)}><Bookmark size={18} fill={saved.includes(task.id)?'currentColor':'none'}/></button></div><strong>{title(task)}</strong><p>{task.project}</p><div className="mobile-task-footer"><span className="task-team"><Users size={15}/>{team(task.team)}</span><span className="channel-chip">{task.channel==='Voorman'?t('supervisorRole'):task.channel}</span></div><label className="task-status-control"><span>{t('status')}</span><select className={`status-select status-${task.status}`} value={task.status} onChange={e=>onStatus(task.id,e.target.value as Status)} aria-label={`${t('status')}: ${title(task)}`}>{STATUS_VALUES.map(status=><option key={status} value={status}>{t(status)}</option>)}</select></label></article>)}</div>
    {tasks.length===0&&<div className="empty"><Search size={20}/>{t('emptyTasks')}</div>}
  </div>;
}