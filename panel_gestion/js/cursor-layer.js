/* Cursor + imán: misma sensación que la landing (solo escritorio fino). */
(function(){
 const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const fine=matchMedia('(hover:hover) and (pointer:fine)').matches&&!reduce;
 if(!fine)return;

 const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
 const $$=(s)=>[...document.querySelectorAll(s)];

 document.documentElement.classList.add('has-cur');

 function bindMag(root){
  (root?root.querySelectorAll('.mag'):$$('.mag')).forEach(b=>{
   if(b.dataset.magBound==='1')return;
   b.dataset.magBound='1';
   b.addEventListener('pointermove',e=>{
    const r=b.getBoundingClientRect();
    b.style.transform=`translate(${clamp((e.clientX-r.left-r.width/2)*.28,-10,10)}px,${clamp((e.clientY-r.top-r.height/2)*.35,-8,8)}px)`;
   });
   b.addEventListener('pointerleave',()=>{b.style.transform='';});
  });
 }

 bindMag();

 const c=document.createElement('div');c.className='cur';const lb=document.createElement('span');c.appendChild(lb);
 const d=document.createElement('div');d.className='cur-dot';
 document.body.append(c,d);

 let x=innerWidth/2,y=innerHeight/2,cx=x,cy=y;
 addEventListener('pointermove',e=>{
  x=e.clientX;y=e.clientY;
  c.style.opacity=1;d.style.opacity=1;
  d.style.transform=`translate(${x}px,${y}px) translate(-50%,-50%)`;
 });
 document.addEventListener('pointerover',e=>{
  const t=e.target.closest('[data-cursor]');
  const i=e.target.closest('a,button,[role="button"],summary,.portal-card,.choice,.clickable');
  if(t)lb.textContent=t.dataset.cursor;
  c.classList.toggle('label',!!t);
  c.classList.toggle('big',!!i&&!t);
  d.classList.toggle('hide',!!t);
 });
 addEventListener('pointerdown',()=>c.classList.add('down'));
 addEventListener('pointerup',()=>c.classList.remove('down'));
 document.addEventListener('mouseleave',()=>{c.style.opacity=0;d.style.opacity=0});
 (function loop(){
  cx+=(x-cx)*.16;cy+=(y-cy)*.16;
  c.style.transform=`translate(${cx}px,${cy}px) translate(-50%,-50%)`;
  requestAnimationFrame(loop);
 })();

 // Re-bind magnets when portal content is swapped in.
 const mo=new MutationObserver(()=>bindMag());
 mo.observe(document.body,{childList:true,subtree:true});
})();
