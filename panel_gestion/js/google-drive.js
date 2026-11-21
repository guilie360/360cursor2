/* BOXIES · Google Drive readonly explorer */
(function(){
 const CLIENT_ID='345645771838-u8if1rhp4rh2ejcpp1est7c4ntrbi7qt.apps.googleusercontent.com';
 const ROOT_ID='1czkxx8sL1GJf5yWUc62e7jYrjT-si6ox';
 const SCOPE='https://www.googleapis.com/auth/drive.readonly';
 let tokenClient=null,accessToken='',currentFolder=ROOT_ID,folderStack=[{id:ROOT_ID,name:'360PREVENTA'}];
 const $=id=>document.getElementById(id);
 const status=(msg)=>{const el=$('boxiesDriveStatus');if(el)el.textContent=msg;};
 const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function loadGIS(){return new Promise((resolve,reject)=>{if(window.google&&google.accounts&&google.accounts.oauth2)return resolve();let old=document.querySelector('script[data-gis]');if(old){old.addEventListener('load',resolve,{once:true});old.addEventListener('error',reject,{once:true});return;}let sc=document.createElement('script');sc.src='https://accounts.google.com/gsi/client';sc.async=true;sc.defer=true;sc.dataset.gis='1';sc.onload=resolve;sc.onerror=reject;document.head.appendChild(sc);});}
 async function connect(){
  try{status('Cargando autorización de Google…');await loadGIS();
   if(!tokenClient)tokenClient=google.accounts.oauth2.initTokenClient({client_id:CLIENT_ID,scope:SCOPE,callback:async(resp)=>{if(resp.error){status('No se pudo autorizar Google Drive: '+resp.error);return;}accessToken=resp.access_token;status('Google Drive conectado. Mostrando carpeta 360PREVENTA…');const projectsGroup=$('projectsDatabaseAccordion');if(projectsGroup)projectsGroup.open=true;const explorer=$('boxiesDriveExplorer');if(explorer)explorer.hidden=false;const hint=$('boxiesDriveExplorerHint');if(hint)hint.hidden=true;currentFolder=ROOT_ID;folderStack=[{id:ROOT_ID,name:'360PREVENTA'}];await listFolder();}});
   tokenClient.requestAccessToken({prompt:'consent'});
  }catch(e){status('No se pudo cargar Google Identity Services. Comprueba tu conexión a internet.');}
 }

 async function openCategoryFolder(category){
  if(!accessToken){const target=$('driveCategoryStatus'+category);if(target)target.textContent='Primero conecta Google Drive desde la parte superior.';return;}
  const target=$('driveCategoryStatus'+category);
  if(target)target.textContent='Buscando la carpeta '+category+'…';
  try{
   const q=`'${ROOT_ID}' in parents and trashed = false and mimeType = 'application/vnd.google-apps.folder'`;
   const data=await api('https://www.googleapis.com/drive/v3/files?'+new URLSearchParams({q,pageSize:'100',orderBy:'name',fields:'files(id,name,mimeType)'}));
   const norm=s=>String(s||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().trim();
   const folder=(data.files||[]).find(f=>norm(f.name)===norm(category));
   if(!folder){if(target)target.textContent=`No se encontró una carpeta llamada “${category}” directamente dentro de 360PREVENTA. Puedes crearla en Drive y volver a intentarlo.`;return;}
   const group=$('projectsDatabaseAccordion');if(group)group.open=true;
   const explorerDetails=document.querySelector('.projects-drive-accordion');if(explorerDetails)explorerDetails.open=true;
   const explorer=$('boxiesDriveExplorer');if(explorer)explorer.hidden=false;
   const hint=$('boxiesDriveExplorerHint');if(hint)hint.hidden=true;
   currentFolder=folder.id;folderStack=[{id:ROOT_ID,name:'360PREVENTA'},{id:folder.id,name:folder.name}];
   await listFolder();
   if(target)target.textContent=`Carpeta “${folder.name}” abierta en el explorador general.`;
   $('boxiesDrivePanel')?.scrollIntoView({behavior:'smooth',block:'nearest'});
  }catch(err){if(target)target.textContent='No se pudo localizar la carpeta: '+err.message;}
 }
 async function api(url){const r=await fetch(url,{headers:{Authorization:'Bearer '+accessToken}});if(!r.ok){let msg='Error de Google Drive ('+r.status+')';try{const j=await r.json();msg=j.error?.message||msg;}catch(e){}throw new Error(msg);}return r.json();}
 function renderCrumb(){const el=$('boxiesDriveBreadcrumb');if(!el)return;el.innerHTML=folderStack.map((f,i)=>`<button type="button" data-drive-crumb="${i}" style="background:none;border:0;color:${i===folderStack.length-1?'#e4d5b8':'#aaa'};padding:3px;cursor:pointer">${esc(f.name)}</button>`).join(' <span style="color:#666">/</span> ');}
 async function listFolder(){
  status('Cargando contenido…');renderCrumb();const box=$('boxiesDriveItems');box.innerHTML='';
  try{let q=`'${currentFolder}' in parents and trashed = false`;let data=await api('https://www.googleapis.com/drive/v3/files?'+new URLSearchParams({q, pageSize:'100', orderBy:'folder,name', fields:'files(id,name,mimeType,modifiedTime,size,webViewLink,thumbnailLink),nextPageToken'}));
   const files=data.files||[];if(!files.length){box.innerHTML='<div class="muted" style="padding:18px">Esta carpeta está vacía.</div>';status('Carpeta cargada.');return;}
   box.innerHTML=files.map(f=>{const folder=f.mimeType==='application/vnd.google-apps.folder';const icon=folder?'<svg viewBox="0 0 24 24" width="25" height="25" aria-hidden="true" style="display:block;fill:#080808;stroke:#777;stroke-width:1.15;stroke-linejoin:round"><path d="M2.8 6.2a1.7 1.7 0 0 1 1.7-1.7h5l2 2h8a1.7 1.7 0 0 1 1.7 1.7v9.6a1.7 1.7 0 0 1-1.7 1.7H4.5a1.7 1.7 0 0 1-1.7-1.7z"/></svg>':f.mimeType?.startsWith('image/')?'▧':f.mimeType==='application/pdf'?'▤':f.mimeType?.startsWith('video/')?'▶':'▤';return `<button type="button" data-drive-id="${esc(f.id)}" data-drive-name="${esc(f.name)}" data-drive-folder="${folder?'1':'0'}" data-drive-url="${esc(f.webViewLink||'')}" style="text-align:left;min-height:92px;padding:13px;background:#171717;border:1px solid #383838;color:#eee;border-radius:8px;cursor:pointer;display:flex;flex-direction:column;gap:9px"><span style="font-size:23px;color:#c5ad7c">${icon}</span><b style="font-size:12px;line-height:1.35;overflow-wrap:anywhere">${esc(f.name)}</b><small style="font-size:10px;color:#888">${folder?'Carpeta':(f.mimeType||'Archivo').replace('application/','')}</small></button>`;}).join('');status(files.length+' elemento(s) · Solo lectura');
  }catch(e){status('No se pudo leer la carpeta: '+e.message+'. Verifica que la cuenta autorizada tenga acceso.');}
 }
 document.addEventListener('click',e=>{
  if(e.target.closest('#boxiesDriveConnect')){connect();return;}
  const categoryButton=e.target.closest('[data-drive-category]');
  if(categoryButton){openCategoryFolder(categoryButton.dataset.driveCategory);return;}
  if(e.target.closest('#boxiesDriveRefresh')){if(accessToken)listFolder();return;}
  const item=e.target.closest('#boxiesDriveItems [data-drive-id]');if(item){if(item.dataset.driveFolder==='1'){currentFolder=item.dataset.driveId;folderStack.push({id:currentFolder,name:item.dataset.driveName});listFolder();}else{const url=item.dataset.driveUrl||('https://drive.google.com/file/d/'+encodeURIComponent(item.dataset.driveId)+'/view');window.open(url,'_blank','noopener');}return;}
  const crumb=e.target.closest('#boxiesDriveBreadcrumb [data-drive-crumb]');if(crumb){const i=Number(crumb.dataset.driveCrumb);folderStack=folderStack.slice(0,i+1);currentFolder=folderStack[folderStack.length-1].id;listFolder();}
 });
 document.addEventListener('click',e=>{if(e.target.closest('#logoutBtn,#topLogoutBtn')){accessToken='';$('boxiesDriveExplorer')?.setAttribute('hidden','');status('Sesión de Drive desconectada de esta vista.');}});
})();
