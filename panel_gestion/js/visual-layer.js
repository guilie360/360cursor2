/* Capa visual: solo presentación. No altera la lógica existente. */
(function(){
 try{
  var bar=document.querySelector('.topbar');
  if(bar){
   var compact=false;
   var onScroll=function(){
    var y=window.scrollY||0;
    if(!compact&&y>60){var h0=bar.offsetHeight;bar.classList.add('is-scrolled');var h1=bar.offsetHeight;bar.style.marginBottom=Math.max(0,h0-h1)+'px';compact=true;}
    else if(compact&&y<20){bar.classList.remove('is-scrolled');bar.style.marginBottom='';compact=false;}
   };
   window.addEventListener('scroll',onScroll,{passive:true});
   window.addEventListener('resize',function(){if(compact){bar.classList.remove('is-scrolled');bar.style.marginBottom='';compact=false;onScroll();}});
   onScroll();
  }
  var topLogout=document.getElementById('topLogoutBtn'),logout=document.getElementById('logoutBtn');
  if(topLogout&&logout){
   topLogout.addEventListener('click',function(){
    var hb=document.getElementById('hunterBack');
    if(document.body.classList.contains('hunter-mode')&&hb)hb.click();
    logout.click();
    var back=document.getElementById('portalBack');if(back && !document.body.classList.contains('workspace-authenticated'))back.classList.add('portal-hidden');
   });
  }
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(window.MutationObserver&&!reduce){
   ['stickyPrice','grandTotal','orderTotal','hunterTotal','hunterLiveCommission'].forEach(function(id){
    var el=document.getElementById(id);if(!el)return;
    var last=el.textContent,timer;
    new MutationObserver(function(){
     var now=el.textContent;if(now===last)return;last=now;
     el.classList.remove('tick');void el.offsetWidth;el.classList.add('tick');
     clearTimeout(timer);timer=setTimeout(function(){el.classList.remove('tick')},700);
    }).observe(el,{childList:true,characterData:true,subtree:true});
   });
  }
 }catch(e){}
})();
