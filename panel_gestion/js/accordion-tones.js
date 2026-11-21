/* Numeración correlativa y tonos alternos (claro/oscuro) según el orden visual de cada lista */
(function(){
 var SEL='details.package-accordion,details.step';
 function key(el,root){var k=[];for(var n=el;n&&n!==root;n=n.parentElement){k.unshift([parseInt(getComputedStyle(n).order,10)||0,Array.prototype.indexOf.call(n.parentElement.children,n)]);}return k;}
 function cmp(a,b){for(var i=0;i<Math.max(a.length,b.length);i++){var x=a[i],y=b[i];if(!x)return -1;if(!y)return 1;if(x[0]!==y[0])return x[0]-y[0];if(x[1]!==y[1])return x[1]-y[1];}return 0;}
 function apply(sel){
  var root=document.querySelector(sel);if(!root)return;
  var cards=[].slice.call(root.querySelectorAll(SEL)).filter(function(c){return !c.parentElement.closest(SEL)&&!c.hidden&&getComputedStyle(c).display!=='none';});
  cards.sort(function(a,b){return cmp(key(a,root),key(b,root));});
  cards.forEach(function(c,i){
   var n=('0'+(i+1)).slice(-2),idx=c.querySelector(':scope>summary .accordion-index,:scope>summary .step-num'),tone=i%2===0?'light':'dark';
   if(idx&&idx.textContent!==n)idx.textContent=n;
   if(c.dataset.tone!==tone)c.dataset.tone=tone;
  });
 }
 function run(){apply('#packageDetails');apply('#manualDetails');}
 run();
 var pd=document.getElementById('packageDetails');
 if(pd)new MutationObserver(function(){requestAnimationFrame(run);}).observe(pd,{childList:true,subtree:true});
})();
