(()=>{
 let previousFocus=null;
 const lightbox=document.getElementById('showroomLightbox');
 const closeButton=document.getElementById('showroomLightboxClose');
 const largeImage=document.getElementById('showroomLightboxImage');
 if(!lightbox||!closeButton||!largeImage)return;

 const open=(button)=>{
  const preview=button.querySelector('img');
  if(!preview)return;
  previousFocus=button;
  largeImage.src=preview.currentSrc||preview.src;
  lightbox.classList.add('is-open');
  lightbox.setAttribute('aria-hidden','false');
  document.body.classList.add('showroom-lightbox-active');
  closeButton.focus();
 };
 const close=()=>{
  lightbox.classList.remove('is-open');
  lightbox.setAttribute('aria-hidden','true');
  document.body.classList.remove('showroom-lightbox-active');
  largeImage.removeAttribute('src');
  if(previousFocus&&document.contains(previousFocus))previousFocus.focus();
 };

 // La imagen está dentro de una plantilla que se inserta dinámicamente al elegir el paquete.
 // Por eso el clic se escucha en document y no se enlaza al cargar la página.
 document.addEventListener('click',e=>{
  const trigger=e.target.closest('#showroomImageOpen');
  if(trigger){e.preventDefault();open(trigger);return;}
  if(e.target.closest('#showroomLightboxClose')){close();return;}
  if(e.target===lightbox)close();
 });
 document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&lightbox.classList.contains('is-open'))close();
 });
})();
