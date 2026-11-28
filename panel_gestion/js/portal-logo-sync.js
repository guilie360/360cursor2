(function(){
 var h=document.querySelector('.portal-head');if(!h)return;
 var l=document.getElementById('portalLogo'),q=document.querySelector('.topbar .brand-logo');
 if(l&&q&&q.src)l.src=q.src;
 var on=function(){h.classList.toggle('is-scrolled',(window.scrollY||0)>20)};
 window.addEventListener('scroll',on,{passive:true});on();
 var lo=document.getElementById('logoutBtn');
 if(lo)lo.addEventListener('click',function(){
  if(document.body.classList.contains('hunter-mode')){document.body.classList.remove('hunter-mode');var hu=document.getElementById('hunter');if(hu)hu.style.display='none';}
 },true);
})();
