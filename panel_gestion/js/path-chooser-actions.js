(function(){
  var chooser=document.getElementById('pathChooser');
  if(!chooser)return;

  chooser.querySelectorAll('.flip-card').forEach(function(card){
    var back=card.querySelector('.flip-back');
    if(!back)return;

    var action=card.querySelector('.flip-cta');
    if(!action)return;

    back.setAttribute('tabindex','0');
    back.setAttribute('aria-label',
      card.getAttribute('data-flip')==='package'
        ? 'Seleccionar Showroom Completo'
        : 'Seleccionar Showroom Personalizado'
    );

    back.addEventListener('click',function(event){
      /* Los controles internos mantienen su comportamiento original. */
      if(event.target.closest('button,a,input,select,textarea'))return;
      action.click();
    });

    back.addEventListener('keydown',function(event){
      if(event.target!==back)return;
      if(event.key==='Enter'||event.key===' '){
        event.preventDefault();
        action.click();
      }
    });
  });
})();
