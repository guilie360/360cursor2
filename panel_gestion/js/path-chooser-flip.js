(function(){
 var pc=document.getElementById('pathChooser');if(!pc)return;
 var cards=[].slice.call(pc.querySelectorAll('.flip-card'));
 function set(c,on){c.classList.toggle('flipped',on);var f=c.querySelector('.flip-front');if(f)f.setAttribute('aria-expanded',on?'true':'false');}
 cards.forEach(function(c){
  var f=c.querySelector('.flip-front'),r=c.querySelector('.flip-return');
  function open(){cards.forEach(function(o){set(o,o===c)});}
  f.addEventListener('click',open);
  f.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}});
  if(r)r.addEventListener('click',function(e){e.stopPropagation();set(c,false);});
 });
 /* Cada vez que se vuelve a la pantalla de elección, las tarjetas aparecen de frente */
 new MutationObserver(function(){if(!pc.classList.contains('hidden'))cards.forEach(function(c){set(c,false)});}).observe(pc,{attributes:true,attributeFilter:['class']});
})();
