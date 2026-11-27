const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine=matchMedia('(hover:hover) and (pointer:fine)').matches&&!reduce;
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
/* Evitar que el navegador restaure un scroll viejo al volver desde /cotizar */
if('scrollRestoration' in history) history.scrollRestoration='manual';
(function earlyHashPin(){
  try{
    const force=sessionStorage.getItem('boxiesForceSection');
    const hash=(location.hash||'').replace(/^#/,'');
    if(force||hash){
      scrollTo(0,0);
      document.documentElement.scrollTop=0;
      document.body.scrollTop=0;
    }
  }catch(e){}
})();

function snapScrollState(){
  /* no-op: el scrub lo maneja scroll-story mientras está locked */
}
function sectionTop(el){
  if(!el) return 0;
  const y=el.getBoundingClientRect().top+scrollY;
  return Math.max(0, Math.round(y));
}
function prepareFinalAtJump(){
  const finEl=$('.final');
  if(finEl) finEl.classList.add('in');
}
const transit=$('#pageTransit');
let transitBusy=false;
function showTransit(){
  if(!transit) return;
  transit.classList.add('on');
  transit.setAttribute('aria-hidden','false');
}
function hideTransit(){
  if(!transit) return;
  transit.classList.remove('on');
  transit.setAttribute('aria-hidden','true');
}
function goToSection(id,{updateHash=true,fromLoad=false}={}){
  const el=document.getElementById(id);
  if(!el) return;
  if(transitBusy && !fromLoad) return;
  if(id==='inicio'){
    if(window.BoxiesScrollStory?.leaveToIntro) window.BoxiesScrollStory.leaveToIntro();
    else scrollTo({top:0,left:0,behavior:'instant'});
    if(updateHash){
      try{history.replaceState(null,'','#inicio')}catch(e){}
    }
    return;
  }
  if(id==='servicio'||id==='scrollStage'){
    const stageEl=document.getElementById('scrollStage');
    if(stageEl && window.BoxiesScrollStory?.enterExp){
      window.BoxiesScrollStory.enterExp();
    } else if(stageEl){
      scrollTo({top:sectionTop(stageEl),left:0,behavior:'instant'});
    }
    if(updateHash){
      try{history.replaceState(null,'','#servicio')}catch(e){}
    }
    return;
  }
  if(window.BoxiesScrollStory?.isLocked?.()){
    window.BoxiesScrollStory.exitFree?.();
  }
  transitBusy=true;
  showTransit();
  const run=()=>{
    prepareFinalAtJump();
    const top=sectionTop(el);
    scrollTo({top,left:0,behavior:'instant'});
    document.documentElement.scrollTop=top;
    document.body.scrollTop=top;
    snapScrollState();
    if(updateHash){
      const next='#'+id;
      if(location.hash!==next) history.replaceState(null,'',next);
    }
    requestAnimationFrame(()=>{
      snapScrollState();
      const done=()=>{
        hideTransit();
        transitBusy=false;
      };
      if(reduce) done();
      else setTimeout(done, fromLoad ? 220 : 280);
    });
  };
  requestAnimationFrame(()=>setTimeout(run, fromLoad ? 40 : 90));
}
window.BoxiesGoToSection=goToSection;
window.BoxiesSnapLandingScroll=snapScrollState;
let pendingFsView=null;
window.BoxiesCaptureLandingView=()=>({
  y:scrollY||document.documentElement.scrollTop||0,
  vh:innerHeight,
  sh:document.documentElement.scrollHeight
});
window.BoxiesRememberLandingForFs=()=>{
  pendingFsView=window.BoxiesCaptureLandingView();
};
window.BoxiesRestoreLandingView=state=>{
  if(!state||typeof state.y!=='number') return false;
  const vh=innerHeight||1;
  const sh=document.documentElement.scrollHeight||0;
  let top=state.y;
  if(state.sh>state.vh&&sh>vh){
    top=(state.y/Math.max(1,state.sh-state.vh))*Math.max(1,sh-vh);
  }
  top=Math.max(0,Math.round(top));
  scrollTo({top,left:0,behavior:'instant'});
  document.documentElement.scrollTop=top;
  document.body.scrollTop=top;
  snapScrollState();
  return true;
};
function applyPendingFsView(){
  const state=pendingFsView;
  if(state){
    window.BoxiesRestoreLandingView(state);
  }else{
    snapScrollState();
  }
}
document.addEventListener('fullscreenchange',()=>{
  requestAnimationFrame(()=>requestAnimationFrame(applyPendingFsView));
});
document.addEventListener('webkitfullscreenchange',()=>{
  requestAnimationFrame(()=>requestAnimationFrame(applyPendingFsView));
});
document.addEventListener('boxies:fullscreen',()=>{
  requestAnimationFrame(()=>requestAnimationFrame(applyPendingFsView));
});
function bootHashJump(){
  let raw=(location.hash||'').replace(/^#/,'');
  try{
    const force=sessionStorage.getItem('boxiesForceSection');
    if(force){
      raw=force;
      sessionStorage.removeItem('boxiesForceSection');
      sessionStorage.removeItem('boxiesFsView');
      sessionStorage.removeItem('boxiesMenuScrollY');
    }
  }catch(e){}
  if(!raw) return;
  const id=raw.startsWith('demo-') ? 'demo' : raw;
  if(id==='inicio'){
    goToSection('inicio',{updateHash:true,fromLoad:true});
    return;
  }
  if(id==='servicio'||id==='scrollStage'){
    goToSection('servicio',{updateHash:true,fromLoad:true});
    return;
  }
  if(!document.getElementById(id)) return;
  scrollTo({top:0,left:0,behavior:'instant'});
  goToSection(id,{updateHash:true,fromLoad:true});
  setTimeout(()=>goToSection(id,{updateHash:true,fromLoad:true}),250);
}

/* Entrada de la sección final */
const fin=$('.final');
const fh=$('.final-copy h2');
if(fh){
  fh.innerHTML=fh.textContent.trim().split(/\s+/).map((w,i)=>`<span class="w"><span style="--d:${i*70}ms">${w}</span></span>`).join(' ');
}
if(fin){
  if('IntersectionObserver' in window){
    new IntersectionObserver((es,o)=>es.forEach(e=>{if(e.isIntersecting){fin.classList.add('in');o.disconnect()}}),{threshold:.2}).observe(fin);
  } else fin.classList.add('in');
}

/* Luz que sigue al cursor en las tarjetas */
$$('.showroom').forEach(c=>c.addEventListener('pointermove',e=>{const r=c.getBoundingClientRect();c.style.setProperty('--mx',e.clientX-r.left+'px');c.style.setProperty('--my',e.clientY-r.top+'px')}));

/* Botones magnéticos + cursor propio (solo escritorio) */
if(fine){
  $$('.mag').forEach(b=>{
    b.addEventListener('pointermove',e=>{const r=b.getBoundingClientRect();b.style.transform=`translate(${clamp((e.clientX-r.left-r.width/2)*.28,-10,10)}px,${clamp((e.clientY-r.top-r.height/2)*.35,-8,8)}px)`});
    b.addEventListener('pointerleave',()=>b.style.transform='');
  });
  document.documentElement.classList.add('has-cur');
  $$('.showroom').forEach(a=>a.dataset.cursor=a.dataset.cursor||'EXPLORAR');
  const c=document.createElement('div');c.className='cur';const lb=document.createElement('span');c.appendChild(lb);
  const d=document.createElement('div');d.className='cur-dot';
  document.body.append(c,d);
  let x=innerWidth/2,y=innerHeight/2,cx=x,cy=y;
  addEventListener('pointermove',e=>{x=e.clientX;y=e.clientY;c.style.opacity=1;d.style.opacity=1;d.style.transform=`translate(${x}px,${y}px) translate(-50%,-50%)`});
  document.addEventListener('pointerover',e=>{
    const t=e.target.closest('[data-cursor]'),i=e.target.closest('a,button');
    if(t){lb.textContent=t.dataset.cursor}
    c.classList.toggle('label',!!t);
    c.classList.toggle('big',!!i&&!t);
    d.classList.toggle('hide',!!t);
  });
  addEventListener('pointerdown',()=>c.classList.add('down'));
  addEventListener('pointerup',()=>c.classList.remove('down'));
  document.addEventListener('mouseleave',()=>{c.style.opacity=0;d.style.opacity=0});
  (function loop(){cx+=(x-cx)*.16;cy+=(y-cy)*.16;c.style.transform=`translate(${cx}px,${cy}px) translate(-50%,-50%)`;requestAnimationFrame(loop)})();
}

/* PANTALLA COMPLETA */
const fs=$('#fullscreenToggle');
const fsLabel=()=>{
  if(!fs) return;
  const a=!!(window.BoxiesFullscreen?.isActive?.()||document.fullscreenElement);
  fs.setAttribute('aria-label',a?'Salir de pantalla completa':'Activar pantalla completa');
  fs.title=a?'Salir de pantalla completa':'Pantalla completa';
};
if(fs){
  fs.addEventListener('click',async()=>{
    try{window.BoxiesRememberLandingForFs?.()}catch(e0){}
    try{
      if(window.BoxiesFullscreen?.toggle) await window.BoxiesFullscreen.toggle();
      else if(document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    }catch(e){console.warn('Pantalla completa no disponible.',e)}
    applyPendingFsView();
    fsLabel();
  });
  document.addEventListener('fullscreenchange',fsLabel);
  document.addEventListener('boxies:fullscreen',fsLabel);
  fsLabel();
}

document.querySelectorAll('a[href^="#"]').forEach(a=>{
  const href=a.getAttribute('href')||'';
  const id=href.slice(1);
  if(!id || id.startsWith('demo-')) return;
  if(!document.getElementById(id) && id!=='inicio') return;
  a.addEventListener('click',e=>{
    e.preventDefault();
    window.BoxiesGlobalNav?.close?.();
    goToSection(id==='inicio'? 'inicio' : id,{updateHash:true});
  });
});
const headerLogo=$('#headerLogo');
if(headerLogo){
  headerLogo.addEventListener('click',()=>{
    window.BoxiesGlobalNav?.close?.();
    goToSection('inicio',{updateHash:true});
  });
}
if(document.readyState==='complete') bootHashJump();
else addEventListener('load',bootHashJump);

const demoPage=$('#demoPage'),demoPageTitle=$('#demoPageTitle'),demoExplore=$('#demoExplore'),demoBack=$('#demoBack');
let demoReturnY=0;
$$('.showroom').forEach(card=>{
  card.addEventListener('click',e=>{
    e.preventDefault();
    const title=card.querySelector('strong')?.textContent.trim()||'SHOWROOM';
    demoReturnY=scrollY;
    demoPageTitle.textContent=title;
    demoExplore.dataset.url=card.dataset.url||'#';
    demoPage.classList.add('active');
    demoPage.setAttribute('aria-hidden','false');
    document.body.classList.add('demo-open');
    history.pushState({demoPage:true},'',`#demo-${title.toLowerCase()}`);
  });
});
function closeDemoPage(){
  if(!demoPage||!demoPage.classList.contains('active'))return;
  demoPage.classList.remove('active');
  demoPage.setAttribute('aria-hidden','true');
  document.body.classList.remove('demo-open');
  if(location.hash.startsWith('#demo-'))history.replaceState(null,'',location.pathname+location.search+'#demo');
  requestAnimationFrame(()=>scrollTo({top:demoReturnY,behavior:'instant'}));
}
if(demoExplore){
  demoExplore.addEventListener('click',()=>{
    const url=(demoExplore.dataset.url||'').trim();
    if(!url||url==='#')return;
    window.open(url,'_blank','noopener');
  });
}
if(demoBack) demoBack.addEventListener('click',closeDemoPage);
addEventListener('popstate',()=>{if(demoPage&&demoPage.classList.contains('active'))closeDemoPage()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDemoPage()});
