const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine=matchMedia('(hover:hover) and (pointer:fine)').matches&&!reduce;
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const ss=(a,b,v)=>{v=clamp((v-a)/(b-a));return v*v*(3-2*v)};
const exp=$('.experience'),sticky=$('.experience-sticky'),msgs=$$('.message'),dots=$$('.progress span'),prog=$('#progress'),
      intro=$('.intro-content'),hint=$('.scroll-hint'),hl=$('.header-logo'),N=msgs.length;

/* Títulos: cada palabra sube desde una máscara */
msgs.forEach(m=>{const h=m.querySelector('h2');
  h.innerHTML=h.textContent.trim().split(/\s+/).map((w,i)=>`<span class="w"><span style="--d:${i*55}ms">${w}</span></span>`).join(' ')});

/* Progreso de scroll con inercia suave (el scroll nativo no se toca) */
const tgt={intro:0,exp:0},cur={intro:0,exp:0};let raf=0;
function read(){
  const vh=innerHeight;
  tgt.intro=clamp(scrollY/(vh*.7));
  const sc=exp.offsetHeight-vh;
  tgt.exp=sc>0?clamp(-exp.getBoundingClientRect().top/sc):0;
  if(!raf)raf=requestAnimationFrame(tick);
}
function tick(){
  let busy=false;const k=reduce?1:.14;
  for(const key in tgt){const d=tgt[key]-cur[key];if(Math.abs(d)>.0004){cur[key]+=d*k;busy=true}else cur[key]=tgt[key]}
  render();raf=busy?requestAnimationFrame(tick):0;
}
function render(){
  const pi=cur.intro,hv=ss(.55,1,pi);
  intro.style.opacity=1-ss(0,.8,pi);
  intro.style.transform=`translateY(${-90*pi}px) scale(${1-.06*pi})`;
  hint.style.opacity=1-ss(0,.25,pi);
  hl.style.opacity=hv;hl.style.transform=`translateY(${-12*(1-hv)}px)`;hl.style.pointerEvents=hv>.5?'auto':'none';
  const p=cur.exp,f=p*N;
  sticky.style.setProperty('--z',(1.04+.08*p).toFixed(4));
  sticky.style.setProperty('--ty',((.5-p)*40).toFixed(1)+'px');
  msgs.forEach((m,i)=>{
    const t=f-i,inn=i===0?1:ss(-.14,.14,t),out=i===N-1?0:ss(.86,1.14,t),o=inn*(1-out);
    m.style.opacity=o.toFixed(3);
    const sp=(1-inn)-out,ab=Math.abs(sp);
    m.style.setProperty('--s',sp.toFixed(3));
    m.style.transform=reduce
      ?`translateY(${(sp*70).toFixed(1)}px) scale(${(.965+.035*o).toFixed(4)})`
      :`translate3d(0,${(sp*70).toFixed(1)}px,0) rotateX(${(ab*8).toFixed(2)}deg) scale(${(.965+.035*o).toFixed(4)})`;
    m.style.filter=(reduce||ab<.03)?'none':`blur(${(ab*5).toFixed(2)}px)`;
    m.style.pointerEvents=o>.5?'auto':'none';
    m.classList.toggle('on',o>.55);
  });
  const idx=clamp(Math.floor(f),0,N-1);
  dots.forEach((d,j)=>d.classList.toggle('active',j===idx));
  prog.style.setProperty('--prog',(clamp(f-.5,0,N-1)/(N-1)).toFixed(4));
}
addEventListener('scroll',read,{passive:true});addEventListener('resize',read);read();

/* Salto de sección sin scrub visual del scroll-story */
if('scrollRestoration' in history) history.scrollRestoration='manual';
function snapScrollState(){
  read();
  cur.intro=tgt.intro;
  cur.exp=tgt.exp;
  if(raf){cancelAnimationFrame(raf);raf=0;}
  render();
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
  transitBusy=true;
  showTransit();
  const run=()=>{
    prepareFinalAtJump();
    const top=sectionTop(el);
    scrollTo({top,left:0,behavior:'instant'});
    // Algunos navegadores corrigen el ancla después; forzar posición y estado.
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
  // Dejar que el overlay pinte un frame antes del salto.
  requestAnimationFrame(()=>setTimeout(run, fromLoad ? 40 : 90));
}
window.BoxiesGoToSection=goToSection;
function bootHashJump(){
  const raw=(location.hash||'').replace(/^#/,'');
  if(!raw) return;
  // #demo-apartamento etc. se manejan aparte; llevar a #demo primero.
  const id=raw.startsWith('demo-') ? 'demo' : raw;
  if(!document.getElementById(id)) return;
  // Evitar el scroll nativo del ancla antes de nuestro salto.
  scrollTo({top:0,left:0,behavior:'instant'});
  snapScrollState();
  goToSection(id,{updateHash:true,fromLoad:true});
}

/* Entrada de la sección final */
const fin=$('.final');
const fh=$('.final-copy h2');
fh.innerHTML=fh.textContent.trim().split(/\s+/).map((w,i)=>`<span class="w"><span style="--d:${i*70}ms">${w}</span></span>`).join(' ');
if('IntersectionObserver' in window){new IntersectionObserver((es,o)=>es.forEach(e=>{if(e.isIntersecting){fin.classList.add('in');o.disconnect()}}),{threshold:.2}).observe(fin)}
else fin.classList.add('in');

/* Luz que sigue al cursor en las tarjetas */
$$('.showroom,.message').forEach(c=>c.addEventListener('pointermove',e=>{const r=c.getBoundingClientRect();c.style.setProperty('--mx',e.clientX-r.left+'px');c.style.setProperty('--my',e.clientY-r.top+'px')}));

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
  try{
    if(window.BoxiesFullscreen?.toggle) await window.BoxiesFullscreen.toggle();
    else if(document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  }catch(e){console.warn('Pantalla completa no disponible.',e)}
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
