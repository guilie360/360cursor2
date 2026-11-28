const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine=matchMedia('(hover:hover) and (pointer:fine)').matches&&!reduce;
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const ss=(a,b,v)=>{v=clamp((v-a)/(b-a));return v*v*(3-2*v)};
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
const intro=$('.intro-content'),hint=$('.scroll-hint'),hl=$('.header-logo');
const storyActive=()=>!!document.body.classList.contains('scroll-story-active')||!!window.BoxiesScrollStory?.isLocked?.();

/* Portada: el reveal lo maneja scroll-story.js (sin logo top-left en intro). */
function syncHeaderLogo(){
  if(!hl) return;
  if(storyActive() && document.body.classList.contains('scroll-story-active')){
    hl.style.opacity='1';
    hl.style.visibility='visible';
    hl.style.pointerEvents='auto';
    hl.style.transform='none';
  }else{
    hl.style.opacity='0';
    hl.style.visibility='hidden';
    hl.style.pointerEvents='none';
  }
}
function read(){ syncHeaderLogo(); }
function snapScrollState(){ syncHeaderLogo(); }
addEventListener('scroll',read,{passive:true});addEventListener('resize',read);read();
/* Observa clases del story para mostrar/ocultar logo header */
const mo=new MutationObserver(syncHeaderLogo);
mo.observe(document.body,{attributes:true,attributeFilter:['class']});
mo.observe(document.documentElement,{attributes:true,attributeFilter:['class']});
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
  if(id==='inicio'){
    if(window.BoxiesScrollStory?.leaveToIntro) window.BoxiesScrollStory.leaveToIntro();
    else scrollTo({top:0,left:0,behavior:'instant'});
    if(updateHash){try{history.replaceState(null,'','#inicio')}catch(e){}}
    snapScrollState();
    return;
  }
  if(id==='servicio'){
    if(window.BoxiesScrollStory?.enterExp) window.BoxiesScrollStory.enterExp();
    else {
      const el=document.getElementById('servicio');
      if(el) scrollTo({top:sectionTop(el),left:0,behavior:'instant'});
    }
    if(updateHash){try{history.replaceState(null,'','#servicio')}catch(e){}}
    return;
  }
  if(id==='demo'){
    if(transitBusy && !fromLoad) return;
    transitBusy=true;
    showTransit();
    const done=()=>{
      hideTransit();
      transitBusy=false;
      snapScrollState();
    };
    const run=()=>{
      const api=window.BoxiesScrollStory;
      const finish=()=>{
        if(updateHash){try{history.replaceState(null,'','#demo')}catch(e){}}
        if(reduce) done();
        else setTimeout(done, fromLoad ? 180 : 260);
      };
      if(api?.jumpToDemo){
        Promise.resolve(api.jumpToDemo({soft:true})).then(finish).catch(finish);
        return;
      }
      if(api?.exitToDemo){
        Promise.resolve(api.exitToDemo()).then(finish).catch(finish);
        return;
      }
      prepareFinalAtJump();
      const el=document.getElementById('demo');
      if(el){
        const top=sectionTop(el);
        scrollTo({top,left:0,behavior:'instant'});
        document.documentElement.scrollTop=top;
        document.body.scrollTop=top;
      }
      finish();
    };
    requestAnimationFrame(()=>setTimeout(run, fromLoad ? 60 : 120));
    return;
  }
  const el=document.getElementById(id);
  if(!el) return;
  if(transitBusy && !fromLoad) return;
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
  // #demo-apartamento etc. se manejan aparte; llevar a #demo primero.
  const id=raw.startsWith('demo-') ? 'demo' : raw;
  if(!document.getElementById(id)) return;
  const pinInicio=()=>{
    scrollTo({top:0,left:0,behavior:'instant'});
    document.documentElement.scrollTop=0;
    document.body.scrollTop=0;
    snapScrollState();
    try{if(location.hash!=='#inicio') history.replaceState(null,'','#inicio')}catch(e){}
  };
  if(id==='inicio'){
    pinInicio();
    setTimeout(pinInicio,50);
    setTimeout(pinInicio,200);
    setTimeout(pinInicio,450);
    return;
  }
  // Evitar el scroll nativo del ancla antes de nuestro salto.
  scrollTo({top:0,left:0,behavior:'instant'});
  snapScrollState();
  goToSection(id,{updateHash:true,fromLoad:true});
  setTimeout(()=>goToSection(id,{updateHash:true,fromLoad:true}),250);
}

/* Entrada de la sección final */
const fin=$('.final');
const fh=$('.final-copy h2');
fh.innerHTML=fh.textContent.trim().split(/\s+/).map((w,i)=>`<span class="w"><span style="--d:${i*70}ms">${w}</span></span>`).join(' ');
if('IntersectionObserver' in window){new IntersectionObserver((es,o)=>es.forEach(e=>{if(e.isIntersecting){fin.classList.add('in');o.disconnect()}}),{threshold:.2}).observe(fin)}
else fin.classList.add('in');

/* Luz que sigue al cursor en las tarjetas */
$$('.showroom').forEach(c=>c.addEventListener('pointermove',e=>{const r=c.getBoundingClientRect();c.style.setProperty('--mx',e.clientX-r.left+'px');c.style.setProperty('--my',e.clientY-r.top+'px')}));

/* Botones magnéticos + cursor propio (solo escritorio) */
if(fine){
  $$('.mag').forEach(b=>{
    b.addEventListener('pointermove',e=>{const r=b.getBoundingClientRect();b.style.transform=`translate(${clamp((e.clientX-r.left-r.width/2)*.28,-10,10)}px,${clamp((e.clientY-r.top-r.height/2)*.35,-8,8)}px)`});
    b.addEventListener('pointerleave',()=>b.style.transform='');
  });
  document.documentElement.classList.add('has-cur');
  $$('.showroom').forEach(a=>a.dataset.cursor='EXPLORAR');
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

/* PANTALLA COMPLETA (persiste en toda la plataforma vía BoxiesFullscreen) */
const fs=$('#fullscreenToggle');
const fsLabel=()=>{
  const a=!!(window.BoxiesFullscreen?.isActive?.()||document.fullscreenElement);
  fs.setAttribute('aria-label',a?'Salir de pantalla completa':'Activar pantalla completa');
  fs.title=a?'Salir de pantalla completa':'Pantalla completa';
};
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

/* Anclas internas (logo header, etc.): transición con logo */
document.querySelectorAll('a[href^="#"]').forEach(a=>{
  const href=a.getAttribute('href')||'';
  const id=href.slice(1);
  if(!id || id.startsWith('demo-')) return;
  if(!document.getElementById(id)) return;
  a.addEventListener('click',e=>{
    e.preventDefault();
    window.BoxiesGlobalNav?.close?.();
    goToSection(id,{updateHash:true});
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
/* Páginas estáticas de tipologías: apartamento, estudio y coliving */
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
  if(!demoPage.classList.contains('active'))return;
  demoPage.classList.remove('active');
  demoPage.setAttribute('aria-hidden','true');
  document.body.classList.remove('demo-open');
  if(location.hash.startsWith('#demo-'))history.replaceState(null,'',location.pathname+location.search+'#demo');
  requestAnimationFrame(()=>scrollTo({top:demoReturnY,behavior:'instant'}));
}
demoExplore.addEventListener('click',()=>{
  const url=(demoExplore.dataset.url||'').trim();
  if(!url||url==='#')return;
  window.open(url,'_blank','noopener');
});
demoBack.addEventListener('click',closeDemoPage);
addEventListener('popstate',()=>{if(demoPage.classList.contains('active'))closeDemoPage()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDemoPage()});

/* Año fijo según la referencia visual: 2026. */
