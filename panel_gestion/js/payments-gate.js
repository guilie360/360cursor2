/* Salida de la ventana de acceso a Pagos: botón Cancelar, tecla Esc o toque fuera de la ventana */
(function(){
 var g=document.getElementById('paymentsGateBackdrop');if(!g)return;
 var close=function(){g.classList.add('portal-hidden');var k=document.getElementById('paymentsDynamicKey');if(k)k.value='';var er=document.getElementById('paymentsGateError');if(er)er.textContent='';};
 var c=document.getElementById('paymentsGateCancel');if(c)c.addEventListener('click',close);
 document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!g.classList.contains('portal-hidden'))close();});
 g.addEventListener('click',function(e){if(e.target===g)close();});
})();
