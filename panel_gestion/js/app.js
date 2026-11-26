const $=id=>document.getElementById(id);
if(typeof window.fillPaddleCountrySelect==='function'){
 try{window.fillPaddleCountrySelect($('customerCountry'),'ES')}catch(_){/* ignore */}
}
const money=n=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:2}).format(n);
const num=(id,min=0,max=100000)=>Math.max(min,Math.min(max,Number($(id).value)||min));
/* Precios sin IVA · + IVA si aplica (checkout / Paddle) */
const PACKAGE_BASE=2190;
const HUNTER_RATE=0.08;
const HUNTER_MIN_MONTHLY=70;
const PRICE_BASE=545;
const PRICE_FLOOR=245;
const PRICE_MAIN=275;
const PRICE_SECONDARY=155;
const PRICE_AREA_M2=8;
const PRICE_REEL=275;
const PRICE_VERTICAL=245;
const PRICE_CINEMA=390;
const PRICE_SHEET=245;
const PRICE_CATALOG=220;
const PRICE_VAT_NOTE='€ sin IVA · + IVA si aplica';
const areaExtra=a=>Math.max(0,a-100)*PRICE_AREA_M2;
const hunterCommission=total=>total>0?Math.max(HUNTER_MIN_MONTHLY,total*HUNTER_RATE):0;
const checked=sel=>[...document.querySelectorAll(sel+':checked')];
function mainSpaces(){return checked('.mainspace').length}
function nonBedroomMainSpaces(){return checked('.mainspace').filter(e=>e.id!=='master').length}
function bedroomCount(){return ( $('master').checked ? 1 : 0 ) + num('extraBedrooms')}
function bedroomPrice(){return ($('master').checked?PRICE_MAIN:0)+num('extraBedrooms')*PRICE_SECONDARY}
function secondarySpaces(){return checked('.secondary').length}
function addons(){return checked('.addon').reduce((s,e)=>s+Number(e.dataset.cost),0)}
function configSubtotal(area,floors,includeResources=true){return PRICE_BASE+areaExtra(area)+floors*PRICE_FLOOR+nonBedroomMainSpaces()*PRICE_MAIN+bedroomPrice()+secondarySpaces()*PRICE_SECONDARY+(includeResources?addons():0)}
function current(){
 const area=num('area',1),floors=num('floors',0,30);
 const primary=configSubtotal(area,floors);
 const hasSimilar=$('addSimilar').checked;
 const simArea=num('similarArea',1),simFloors=num('similarFloors',0,30);
 const simType=$('similarType')?.value||'Apartamento';
 const similarBase=configSubtotal(simArea,simFloors,false);
 const discount=similarBase*.5;
 const total=primary+(hasSimilar?similarBase-discount:0);
 return {area,floors,primary,hasSimilar,simArea,simFloors,simType,similarBase,discount,total};
}
function update(){
 const q=current(),type=document.querySelector('input[name="type"]:checked').value;
 $('typeMeta').textContent=type;$('areaMeta').textContent=q.area+' m²';$('areaCost').textContent=money(areaExtra(q.area));
 const extraFloorCount=q.floors,extraFloorCost=extraFloorCount*PRICE_FLOOR;
 $('floorMeta').textContent=q.floors+(q.floors===1?' planta 3D · ':' plantas 3D · ')+money(extraFloorCost);
 if($('manualTotalAreaLabel'))$('manualTotalAreaLabel').textContent=q.area+' m²';
 $('floorFormula').textContent=`${extraFloorCount} ${extraFloorCount===1?'planta':'plantas'} × ${PRICE_FLOOR} €`;
 $('floorCost').textContent=money(extraFloorCost);
 if($('manualRequestedPlantCount'))$('manualRequestedPlantCount').textContent=String(extraFloorCount);
 if($('manualTotalPlantCount'))$('manualTotalPlantCount').textContent=String(extraFloorCount);
 $('bedroomCost').value=money(bedroomPrice());
 $('spacesMeta').textContent=(nonBedroomMainSpaces()+bedroomCount()+secondarySpaces())+' espacio(s) seleccionado(s)';
 $('addonsMeta').textContent=checked('.addon').length+' recurso(s) seleccionado(s)';$('similarFields').classList.toggle('hidden',!q.hasSimilar);$('similarFields').setAttribute('aria-hidden',String(!q.hasSimilar));if($('manualSimilarSummary')){$('manualSimilarSummary').hidden=!q.hasSimilar;$('manualSimilarSummary').setAttribute('aria-hidden',String(!q.hasSimilar));if(q.hasSimilar)$('manualSimilarPrice').textContent=money(q.similarBase-q.discount);}
 if($('additionalMeta'))$('additionalMeta').textContent=q.hasSimilar?'Segundo inmueble agregado':'Opcional · sin coste por añadirlo';
 if(!$('manualConfigurator').classList.contains('hidden')){
  $('stickyPrice').textContent=money(q.total);
  $('hunterLiveCommission').textContent=money(hunterCommission(q.total));
 }
 const rows=[];
 rows.push(['Base del showroom · hasta 100 m²',PRICE_BASE]);
 if(areaExtra(q.area))rows.push([`Ajuste de superficie · ${q.area} m²`,areaExtra(q.area)]);
 if(q.floors>0)rows.push([`Plantas 3D del inmueble · ${q.floors} × ${PRICE_FLOOR} €`,q.floors*PRICE_FLOOR]);
 checked('.mainspace').filter(e=>e.id!=='master').forEach(e=>rows.push([e.dataset.name,PRICE_MAIN]));
 const rooms=bedroomCount();
 if($('master').checked)rows.push([`Dormitorio principal · ${PRICE_MAIN} €`,PRICE_MAIN]);
 if(num('extraBedrooms'))rows.push([`Dormitorios adicionales · ${num('extraBedrooms')} × ${PRICE_SECONDARY} €`,num('extraBedrooms')*PRICE_SECONDARY]);
 checked('.secondary').forEach(e=>rows.push([(e.id==='otherSpace'&&$('otherName').value.trim()?$('otherName').value.trim():e.dataset.name)+' · zona complementaria',PRICE_SECONDARY]));
 checked('.addon').forEach(e=>rows.push([e.closest('.choice').querySelector('b').textContent,Number(e.dataset.cost)]));
 $('quoteRows').innerHTML='<div class="price-line"><span>Tipología</span><strong>'+type+'</strong></div>'+rows.map(([a,b])=>`<div class="price-line"><span>${a}</span><strong>${typeof b==='number'?money(b):b}</strong></div>`).join('');
 $('quoteRows').innerHTML+=`<div class="price-line"><span>Subtotal del primer inmueble</span><strong>${money(q.primary)}</strong></div>`;
 if(q.hasSimilar){
  $('quoteRows').innerHTML+=`<div class="property-block"><h4>Segundo showroom · ${q.simType}</h4><div class="price-line"><span>Tipo de inmueble</span><strong>${q.simType}</strong></div><div class="price-line"><span>Superficie</span><strong>${q.simArea} m²</strong></div><div class="price-line"><span>Planta 3D incluida</span><strong>1</strong></div>${q.simFloors?`<div class="price-line"><span>Plantas 3D adicionales</span><strong>${q.simFloors} · ${money(q.simFloors*PRICE_FLOOR)}</strong></div>`:''}<div class="price-line"><span>Recursos adicionales</span><strong>Compartidos · sin coste extra</strong></div><div class="price-line"><span>Configuración reutilizada antes del descuento</span><strong>${money(q.similarBase)}</strong></div><div class="price-line"><span>Descuento aplicado</span><strong>50 % · − ${money(q.discount)}</strong></div><div class="price-line"><span>Segundo inmueble</span><strong>${money(q.similarBase-q.discount)}</strong></div></div>`;
 }
 $('grandTotal').textContent=money(q.total);
 if($('manualHeadTotal'))$('manualHeadTotal').textContent=money(q.total);
 const liveTotal=$('manualLiveTotal');
 if(liveTotal){
  liveTotal.textContent=money(q.total);
  const selectedRows=rows.slice(1);
  const selectedLabels=selectedRows.map(([label])=>label.replace(' · modelado 3D','').replace(' · zona complementaria',''));
  $('manualLiveSummary').textContent=selectedLabels.length
   ? selectedLabels.slice(0,3).join(' · ')+(selectedLabels.length>3?` · +${selectedLabels.length-3} más`:'')
   : 'Base del showroom · hasta 100 m²';
  const spaceCount=nonBedroomMainSpaces()+bedroomCount()+secondarySpaces();
  $('manualLiveCounts').textContent=[
   `${q.area} m²`,
   `${1+q.floors} ${1+q.floors===1?'planta 3D':'plantas 3D'} (${q.floors} adicionales)`,
   `${spaceCount} ${spaceCount===1?'espacio':'espacios'}`,
   `${checked('.addon').length} recursos`
  ].join('  /  ');
  const progress=Math.min(100,Math.max(8,(q.total/3000)*100));
  $('manualLiveProgress').style.width=progress+'%';
 }
 $('discountExplanation').textContent=q.hasSimilar?'Se aplica automáticamente un 50 % de descuento al segundo showroom. Incluye 1 planta 3D y comparte los recursos adicionales contratados, sin coste extra. Las plantas adicionales del segundo inmueble se calculan aparte.':'El precio corresponde a un inmueble. Puedes añadir un segundo showroom con un 50 % de descuento.';
}
function updateKeepingScroll(){const y=window.scrollY;update();requestAnimationFrame(()=>window.scrollTo(0,y));}
const fromManual=e=>!!(e.target&&e.target.closest&&e.target.closest('#manualConfigurator'));
document.addEventListener('click',e=>{const btn=e.target.closest('#manualFloorsMinus,#manualFloorsPlus');if(!btn)return;const input=$('floors');if(!input)return;const current=Math.max(0,Math.floor(Number(input.value)||0));input.value=String(Math.max(0,Math.min(30,current+(btn.id==='manualFloorsPlus'?1:-1))));input.dispatchEvent(new Event('input',{bubbles:true}));});
document.addEventListener('input',e=>{if(fromManual(e))updateKeepingScroll();});document.addEventListener('change',e=>{if(fromManual(e))updateKeepingScroll();});
function quoteStepList(fromEl){
 const root=fromEl?.closest('#manualConfigurator, #packageDetails');
 if(!root)return[];
 return[...root.querySelectorAll('details.step, details.package-accordion')];
}
function revealNextStep(next,current){
 if(!next)return;
 const steps=quoteStepList(current||next);
 steps.forEach(d=>{if(d!==next)d.open=false;});
 next.open=true;
 const anchor=current&&steps.includes(current)?current:next;
 const align=()=>{
  const bar=document.querySelector('.topbar');
  const offset=(bar?bar.getBoundingClientRect().height:0)+8;
  const top=anchor.getBoundingClientRect().top+window.scrollY-offset;
  window.scrollTo({top:Math.max(0,top),behavior:'smooth'});
 };
 requestAnimationFrame(()=>{
  requestAnimationFrame(()=>{
   align();
   setTimeout(align,200);
  });
 });
 saveQuoteDraftSoon();
}
document.querySelectorAll('#manualConfigurator [data-next]').forEach(b=>b.addEventListener('click',()=>{
 const current=b.closest('details.step');
 const steps=quoteStepList(current);
 const idx=steps.indexOf(current);
 const next=idx>=0?steps[idx+1]:$(b.dataset.next);
 revealNextStep(next,current);
}));
$('addSimilar').addEventListener('change',update);
$('confirmOpen').addEventListener('click',showManualPackageOffer);
$('copyQuote').addEventListener('click',async()=>{const q=current();const text=['PRESUPUESTO SHOWROOM 360PREVENTA', 'Tipología: '+document.querySelector('input[name="type"]:checked').value,'Superficie: '+q.area+' m²','Plantas: '+q.floors,'Subtotal primer inmueble: '+money(q.primary),...(q.hasSimilar?['Segundo showroom: '+q.simType+' · '+q.simArea+' m²','Tipo de inmueble: '+q.simType,'1 planta 3D incluida','Recursos adicionales compartidos','Descuento: 50 % ('+money(q.discount)+')','Importe segundo showroom: '+money(q.similarBase-q.discount)]:[]),'TOTAL: '+money(q.total)].join('\\n');try{await navigator.clipboard.writeText(text);$('copyStatus').textContent='Presupuesto copiado.'}catch(e){$('copyStatus').textContent=text}});

const QUOTE_DRAFT_KEY='boxiesQuoteDraft';
const QUOTE_DRAFT_TTL_MS=1000*60*60*24; // 24h
let _quoteDraftTimer=null;
let _restoringQuote=false;

function quoteDraftScreen(){
 if($('manualConfigurator')&&!$('manualConfigurator').classList.contains('hidden')) return 'manual';
 if($('packageChooser')&&!$('packageChooser').classList.contains('hidden')) return 'package';
 return 'paths';
}
function collectQuoteDraft(){
 const rootManual=$('manualConfigurator');
 const rootPkg=$('packageDetails');
 const manual={checks:{},values:{},openSteps:[]};
 if(rootManual){
  rootManual.querySelectorAll('input[type="checkbox"],input[type="radio"]').forEach(el=>{
   const key=el.id||(el.name?`${el.name}:${el.value}`:'');
   if(key) manual.checks[key]=!!el.checked;
  });
  rootManual.querySelectorAll('input:not([type="checkbox"]):not([type="radio"]),select,textarea').forEach(el=>{
   if(el.id) manual.values[el.id]=el.value;
  });
  rootManual.querySelectorAll('details.step').forEach(s=>{ if(s.open&&s.id) manual.openSteps.push(s.id); });
 }
 let pkgKey='apartment';
 try{ if(typeof activePackage==='string'&&activePackage) pkgKey=activePackage; }catch(e){}
 const pkg={activePackage:pkgKey,checks:{},values:{},openAccordions:[]};
 if(rootPkg){
  rootPkg.querySelectorAll('input[type="checkbox"],input[type="radio"]').forEach(el=>{
   const key=el.id||(el.name?`${el.name}:${el.value}`:'');
   if(key) pkg.checks[key]=!!el.checked;
  });
  rootPkg.querySelectorAll('input:not([type="checkbox"]):not([type="radio"]),select,textarea').forEach(el=>{
   if(el.id) pkg.values[el.id]=el.value;
  });
  rootPkg.querySelectorAll('details.package-accordion').forEach(s=>{ if(s.open&&s.id) pkg.openAccordions.push(s.id); });
 }
 return {v:1,screen:quoteDraftScreen(),ts:Date.now(),manual,package:pkg};
}
function saveQuoteDraft(){
 if(_restoringQuote) return;
 try{ localStorage.setItem(QUOTE_DRAFT_KEY,JSON.stringify(collectQuoteDraft())); }catch(e){}
}
function saveQuoteDraftSoon(){
 clearTimeout(_quoteDraftTimer);
 _quoteDraftTimer=setTimeout(saveQuoteDraft,140);
}
function clearQuoteDraft(){
 clearTimeout(_quoteDraftTimer);
 try{ localStorage.removeItem(QUOTE_DRAFT_KEY); }catch(e){}
}
function readQuoteDraft(){
 try{
  const raw=JSON.parse(localStorage.getItem(QUOTE_DRAFT_KEY)||'null');
  if(!raw||raw.v!==1) return null;
  if(raw.ts&&(Date.now()-Number(raw.ts))>QUOTE_DRAFT_TTL_MS){ clearQuoteDraft(); return null; }
  return raw;
 }catch(e){ return null; }
}
function applyFieldMap(checks,values){
 Object.entries(checks||{}).forEach(([key,on])=>{
  let el=$(key);
  if(!el&&key.includes(':')){
   const i=key.indexOf(':');
   el=document.querySelector(`input[name="${CSS.escape(key.slice(0,i))}"][value="${CSS.escape(key.slice(i+1))}"]`);
  }
  if(el&&(el.type==='checkbox'||el.type==='radio')) el.checked=!!on;
 });
 Object.entries(values||{}).forEach(([id,val])=>{
  const el=$(id);
  if(el) el.value=val;
 });
}
function collapseAllQuoteSteps(root){
 const scope=root||document;
 scope.querySelectorAll('details.step, details.package-accordion').forEach(d=>{ d.open=false; });
}
function applyManualDraft(draft){
 if(!draft?.manual) return;
 applyFieldMap(draft.manual.checks,draft.manual.values);
}
function applyPackageDraft(draft){
 if(!draft?.package) return;
 applyFieldMap(draft.package.checks,draft.package.values);
 if(typeof updatePackagePrice==='function'&&$('packageDetails')?.innerHTML.trim()) updatePackagePrice();
}
function restoreQuoteSession(){
 const draft=readQuoteDraft();
 if(!draft||!draft.screen||draft.screen==='paths') return false;
 _restoringQuote=true;
 try{
  if(draft.screen==='manual') showConfiguratorScreen('manual');
  else if(draft.screen==='package') showConfiguratorScreen('package');
  else return false;
 }finally{
  _restoringQuote=false;
 }
 saveQuoteDraft();
 return true;
}

function resetConfigurator(){
 clearQuoteDraft();
 const manualVisible=!$('manualConfigurator').classList.contains('hidden');
 const packageVisible=!$('packageChooser').classList.contains('hidden') && $('packageDetails').innerHTML.trim()!=='';
 if(manualVisible){
  document.querySelectorAll('#manualConfigurator input[type="checkbox"]').forEach(x=>x.checked=false);
  $('typeApartment').checked=true;
  $('area').value=100;$('floors').value=0;$('extraBedrooms').value=0;
  $('similarArea').value=100;$('similarFloors').value=0;if($('similarType'))$('similarType').value='Apartamento';$('otherName').value='';
  document.querySelectorAll('#manualConfigurator input[type="number"]').forEach(x=>{
   if(!['area','similarArea'].includes(x.id))x.value=0;
  });
  document.querySelectorAll('.step').forEach(s=>s.open=false);
  update();
  $('stickyPrice').textContent=money(PRICE_BASE);
  $('hunterLiveCommission').textContent=money(70);
 }else if(packageVisible){
  const first=Object.keys(packageCatalog)[0];
  renderPackage(first);
  $('packageArea').value=100;
  updatePackagePrice();
  $('stickyPrice').textContent=money(PACKAGE_BASE);
  $('hunterLiveCommission').textContent=money(hunterCommission(PACKAGE_BASE));
  $('packageSelectedNote').textContent='Configuración reiniciada al precio base del paquete.';
 }else{
  $('stickyPrice').textContent=money(0);
  $('hunterLiveCommission').textContent=money(0);
 }
 window.scrollTo({top:0,behavior:'smooth'});
}

$('manualUpsellGo').addEventListener('click',()=>{
 $('manualUpsell').classList.add('hidden');
 $('packagePath').click();
});
$('manualUpsellClose').addEventListener('click',()=>{$('manualUpsell').classList.add('hidden');});

$('headerReset').addEventListener('click',resetConfigurator);

$('reset').addEventListener('click',resetConfigurator);
function bonus(n){return n>=10?320:n>=8?220:n>=5?170:n>=1?70:0}
function renderHunterPrices(){
 const n=Math.max(0,Math.min(100,Math.floor(num('sales',0,100))));
 const host=$('individualInputs');
 const old=[...host.querySelectorAll('input')].map(x=>x.value);
 host.innerHTML=Array.from({length:n},(_,i)=>`<div class="field"><label for="hunterProject${i+1}">Precio del proyecto ${i+1} (€)</label><input id="hunterProject${i+1}" class="hunter-project-price" type="number" min="0" step="10" value="${old[i]??700}"></div>`).join('');
 host.querySelectorAll('input').forEach(x=>x.addEventListener('input',updateHunter));
}
function updateHunter(){
 const n=Math.max(0,Math.min(100,Math.floor(num('sales',0,100))));
 const mode=document.querySelector('input[name="hunterPriceMode"]:checked')?.value||'average';
 $('hunterAverageField').hidden=mode!=='average';
 $('individualInputs').hidden=mode!=='individual';
 if(mode==='individual'&&document.querySelectorAll('.hunter-project-price').length!==n)renderHunterPrices();
 const prices=mode==='average'
  ? Array(n).fill(Math.max(0,Number($('hunterAverage').value)||0))
  : [...document.querySelectorAll('.hunter-project-price')].map(x=>Math.max(0,Number(x.value)||0));
 const rawCommission=prices.reduce((sum,v)=>sum+v*HUNTER_RATE,0);
 const commission=n>0?Math.max(70,rawCommission):0;
 const b=bonus(n),total=commission+b;
 $('hunterCommission').textContent=money(commission);
 $('hunterBonus').textContent=money(b);
 $('hunterTotal').textContent=money(total);
 $('milestones').innerHTML=[
   {label:'1–4 proyectos',amount:70,condition:n>=1&&n<=4,achieved:n>=1},
   {label:'5–7 proyectos',amount:170,condition:n>=5&&n<=7,achieved:n>=5},
   {label:'8–9 proyectos',amount:220,condition:n>=8&&n<=9,achieved:n>=8},
   {label:'10 o más proyectos',amount:320,condition:n>=10,achieved:n>=10}
 ].map(goal=>`<div class="hunter-goal${goal.condition?' active':''}"><small>${goal.label}</small><strong>${money(goal.amount)}</strong><em>${goal.achieved?'Tramo alcanzado':'Bono de este tramo'}</em></div>`).join('');
}
if($('sales'))$('sales').addEventListener('input',()=>{renderHunterPrices();updateHunter()});
if($('hunterAverage'))$('hunterAverage').addEventListener('input',updateHunter);
document.querySelectorAll('input[name="hunterPriceMode"]').forEach(x=>x.addEventListener('change',updateHunter));
/* Módulos congelados temporalmente en el home del panel (contenido intacto). */
const PORTAL_LOCKED_PAGES=new Set(['tasks']);
function portalIsAdmin(){
 const rol=(document.body.dataset.panelRole||sessionStorage.getItem('boxiesPanelRole')||'').toLowerCase();
 return rol==='admin'||rol==='super_admin'||!!window.BoxiesTeamChat?.isAdmin?.();
}
function portalModuleLocked(key){
 if(key==='database') return !portalIsAdmin();
 return PORTAL_LOCKED_PAGES.has(key);
}
function showPortalLockedToast(msg){
 let toast=document.getElementById('portalLockToast');
 if(!toast){
  toast=document.createElement('div');
  toast.id='portalLockToast';
  toast.className='portal-lock-toast';
  toast.setAttribute('role','status');
  document.body.appendChild(toast);
 }
 toast.textContent=msg||'Acceso bloqueado temporalmente';
 toast.classList.add('is-on');
 clearTimeout(showPortalLockedToast._t);
 showPortalLockedToast._t=setTimeout(()=>toast.classList.remove('is-on'),2400);
}
$('portalHunterOpen').addEventListener('click',e=>{
 if($('portalHunterOpen').getAttribute('data-portal-locked')==='1'){
  e.preventDefault();e.stopPropagation();
  showPortalLockedToast('Acceso bloqueado temporalmente');
  return;
 }
 document.body.classList.add('hunter-mode');
 $('hunter').style.display='block';
 $('portalBack').classList.remove('portal-hidden');
 initHunterProfile();
 updateHunter();
 window.scrollTo(0,0);
});
$('hunterLogoutBtn').addEventListener('click',()=>{
 document.body.classList.remove('hunter-mode');
 $('hunter').style.display='none';
 $('logoutBtn').click();
});
$('hunterBack').addEventListener('click',()=>{
 document.body.classList.remove('hunter-mode');
 $('hunter').style.display='none';
 $('portal').classList.remove('portal-hidden');
 $('portalHome').classList.remove('portal-hidden');
 $('portalSubpage').classList.add('portal-hidden');
 $('portalBack').classList.remove('portal-hidden');
 window.scrollTo(0,0);
});
$('fullscreenBtn').addEventListener('click',async()=>{
 try{
  if(window.BoxiesFullscreen?.toggle) await window.BoxiesFullscreen.toggle();
  else if(!document.fullscreenElement) await document.documentElement.requestFullscreen();
  else await document.exitFullscreen();
 }catch(e){}
});
document.addEventListener('fullscreenchange',()=>{$('fullscreenBtn').textContent=document.fullscreenElement?'Salir de pantalla completa':'Pantalla completa';});
function manualPackageComparison(){
 const q=current();
 const main=packageSinglePrice(q.area,q.floors);
 const similar=q.hasSimilar?packageSinglePrice(q.simArea,q.simFloors):null;
 const packageTotal=main.price+(similar?similar.price*.5:0);
 return {customTotal:q.total,packageTotal,saving:q.total-packageTotal,q};
}
function showManualPackageOffer(){
 const comparison=manualPackageComparison();
 // Solo interrumpimos el flujo cuando el paquete completo realmente cuesta menos.
 if(comparison.saving<=0){openOrderModal();return;}
 $('manualOfferCustomPrice').textContent=money(comparison.customTotal);
 $('manualOfferPackagePrice').textContent=money(comparison.packageTotal);
 $('manualOfferSavingAmount').textContent=money(comparison.saving);
 const q=comparison.q;
 $('manualOfferPackageScope').textContent=`${q.area} m² · ${1+q.floors} planta(s) 3D${q.hasSimilar?` · segundo showroom con 50 % de descuento`:''}`;
 $('manualOfferModal').classList.remove('hidden');
}
function closeManualPackageOffer(){ $('manualOfferModal').classList.add('hidden'); }
$('manualOfferClose').addEventListener('click',closeManualPackageOffer);
$('manualOfferContinue').addEventListener('click',()=>{closeManualPackageOffer();openOrderModal();});
$('manualOfferModal').addEventListener('click',e=>{if(e.target===$('manualOfferModal'))closeManualPackageOffer();});
$('manualOfferChoosePackage').addEventListener('click',()=>{
 const q=current();
 const type=document.querySelector('input[name="type"]:checked').value;
 const packageKey=type==='Apartestudio'?'studio':type==='Co-living'?'coliving':'apartment';
 closeManualPackageOffer();
 $('packagePath').click();
 renderPackage(packageKey);
 $('packageArea').value=q.area;
 $('packageExtraFloors').value=q.floors;
 if(q.hasSimilar){
  $('packageAddSimilar').checked=true;
  $('packageSimilarType').value=q.simType;
  $('packageSimilarArea').value=q.simArea;
  $('packageSimilarFloors').value=q.simFloors;
 }
 updatePackagePrice();
 window.scrollTo({top:0,behavior:'smooth'});
});

function openOrderModal(){
 restoreOrderModal();
 const q=current(),type=document.querySelector('input[name="type"]:checked').value;
 const rows=[['Tipo de inmueble',type],['Superficie',q.area+' m²'],['Plantas 3D',q.floors+' × '+PRICE_FLOOR+' €'],['Subtotal primer inmueble',money(q.primary)]];
 if(q.hasSimilar){rows.push(['Segundo showroom',q.simType+' · '+q.simArea+' m²'],['Tipo de inmueble',q.simType],['Planta 3D incluida','1'],['Plantas 3D adicionales',q.simFloors],['Recursos adicionales','Compartidos · sin coste extra'],['Descuento aplicado','50 %'],['Importe segundo inmueble',money(q.similarBase-q.discount)]);}
 $('orderSummary').innerHTML=rows.map(([a,b])=>`<div class="order-detail-row"><span>${a}</span><strong>${b}</strong></div>`).join('');
 $('orderSummary').innerHTML+=$('quoteRows').innerHTML;
 $('orderTotal').textContent=money(q.total);$('confirmStatus').textContent='';
 $('exportCustomerName').textContent=$('customerName').value.trim();
 try{
  window.PanelPaddle?.mountInOrderModal?.(q.total,{
   customerName:$('customerName').value.trim(),
   customerEmail:$('customerEmail')?.value.trim()||'',
   proyectoLabel:'Showroom personalizado · '+type,
   quoteSnapshot:{mode:'manual',total:q.total,area:q.area,floors:q.floors,type}
  });
 }catch(ePay){}
 $('orderModal').classList.remove('hidden');
 try{$('orderPaySchedule')?.scrollIntoView?.({block:'nearest',behavior:'smooth'});}catch(eScroll){}
}
$('modalClose').addEventListener('click',()=>{$('orderModal').classList.add('hidden');restoreOrderModal();});
$('orderModal').addEventListener('click',e=>{if(e.target===$('orderModal')){$('orderModal').classList.add('hidden');restoreOrderModal();}});
$('customerName').addEventListener('input',()=>{$('exportCustomerName').textContent=$('customerName').value.trim();});
$('customerEmail').addEventListener('input',()=>{$('customerEmail').setCustomValidity('');});
$('quoteToProject').addEventListener('click',()=>{
 const client=$('customerName').value.trim()||'Cliente por confirmar';
 const amount=Number(String($('orderTotal').textContent).replace(/[^0-9,.-]/g,'').replace(/\./g,'').replace(',','.'))||0;
 const name=(client==='Cliente por confirmar'?'Nuevo proyecto':`Proyecto · ${client}`);
 const id=Math.max(0,...demoProjects.map(p=>p.id))+1;
 demoProjects.unshift({id,name,client,owner:'Por asignar',status:'Pendiente',amount,progress:0,area:'Por definir'});
 $('orderModal').classList.add('hidden');portalOpenPage('database');setTimeout(()=>showProject(id),0);
});
function safeFileName(){
 const name=$('customerName').value.trim()||'Cliente';
 return name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'_').replace(/^_+|_+$/g,'')||'Cliente';
}
async function buildSummaryCanvas(forPdf){
 await Promise.all([
  document.fonts.load('400 52px Italiana'),
  document.fonts.load('400 22px Manrope'),
  document.fonts.load('700 22px Manrope')
 ]);
 const name=$('customerName').value.trim(),email=$('customerEmail').value.trim();
 const logo=new Image();
 const logoCandidates=['/panel_gestion/assets/logo-pdf.png','/panel_gestion/assets/logo.png','assets/logo-pdf.png','assets/logo.png'];
 await new Promise((resolve)=>{
  let i=0;
  const tryNext=()=>{
   if(i>=logoCandidates.length){logo.removeAttribute('src');return resolve();}
   logo.onload=()=>resolve();
   logo.onerror=()=>{i+=1;tryNext();};
   logo.src=logoCandidates[i++];
  };
  tryNext();
 });

 const css=getComputedStyle(document.documentElement),tk=(n,d)=>css.getPropertyValue(n).trim()||d;
 const T={
  bg:'#0d0d0d',panel:'#151515',panelDeep:'#101010',line:'#39332b',
  ink:tk('--ink','#f1eee8'),muted:tk('--muted','#b2a797'),
  acc:tk('--accent','#c5a675'),gold:tk('--gold-soft','#d0b88f')
 };
 const SERIF='Italiana,Georgia,serif',SANS='Manrope,Arial,sans-serif';
 const rows=[...$('orderSummary').querySelectorAll('.order-detail-row,.price-line')].map(row=>({
  label:row.querySelector('span')?.textContent?.trim()||'',
  value:row.querySelector('strong')?.textContent?.trim()||''
 })).filter(r=>r.label||r.value);

 const W=1200,H=1697,pad=92,right=W-pad;
 const probe=document.createElement('canvas').getContext('2d');
 const wrap=(text,font,max)=>{
  probe.font=font;const lines=[];let line='';
  for(const word of String(text).split(/\s+/)){
   const next=line?line+' '+word:word;
   if(line&&probe.measureText(next).width>max){lines.push(line);line=word;}else line=next;
  }
  if(line)lines.push(line);
  return lines.length?lines:[''];
 };
 let fontSize=Math.max(15,22-Math.max(0,rows.length-12)*.42);
 let lineH=Math.round(fontSize*1.38);
 let rowPad=Math.max(8,22-Math.max(0,rows.length-12)*.7);
 let prep,contentHeight;
 const buildRows=()=>{
  prep=rows.map(r=>({
   L:wrap(r.label,`400 ${fontSize}px ${SANS}`,620),
   V:wrap(r.value,`700 ${fontSize}px ${SANS}`,330)
  }));
  contentHeight=prep.reduce((sum,r)=>sum+Math.max(r.L.length,r.V.length)*lineH+rowPad,0);
 };
 buildRows();
 const headerBottom=405,footerHeight=245,available=H-headerBottom-footerHeight-100;
 while(contentHeight>available&&fontSize>14){
  fontSize-=.5;lineH=Math.round(fontSize*1.34);rowPad=Math.max(6,rowPad-1);buildRows();
 }
 const rowsStart=headerBottom;
 const totalH=112,ctaH=62,ctaGap=22;
 const rowsEnd=rowsStart+contentHeight;
 const totalY=Math.max(rowsEnd+28,H-footerHeight-140);
 const ctaY=totalY+totalH+34;
 const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
 const c=canvas.getContext('2d');
 const rr=(x,y,w,h,r)=>{
  c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);
  c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);
  c.arcTo(x,y,x+w,y,r);c.closePath();
 };

 // Fondo carbón sólido con iluminación ambiental discreta, sin imágenes ni texturas.
 c.fillStyle=T.bg;c.fillRect(0,0,W,H);
 const ambient=c.createRadialGradient(W*.78,90,20,W*.78,90,720);
 ambient.addColorStop(0,'rgba(205,178,138,.045)');
 ambient.addColorStop(.42,'rgba(205,178,138,.012)');
 ambient.addColorStop(1,'rgba(205,178,138,0)');
 c.fillStyle=ambient;c.fillRect(0,0,W,H);
 const lowerLight=c.createRadialGradient(W*.18,H*.82,10,W*.18,H*.82,560);
 lowerLight.addColorStop(0,'rgba(255,255,255,.018)');
 lowerLight.addColorStop(1,'rgba(255,255,255,0)');
 c.fillStyle=lowerLight;c.fillRect(0,0,W,H);

 // Superficie principal elevada mediante sombra exterior y borde fino.
 const cx=30,cy=30,cw=W-60,ch=H-60;
 c.save();c.shadowColor='rgba(0,0,0,.88)';c.shadowBlur=58;c.shadowOffsetY=22;
 const card=c.createLinearGradient(cx,cy,cx,cy+ch);
 card.addColorStop(0,'#1b1b1b');card.addColorStop(.48,'#151515');card.addColorStop(1,'#101010');
 rr(cx,cy,cw,ch,22);c.fillStyle=card;c.fill();c.restore();
 rr(cx,cy,cw,ch,22);c.strokeStyle='rgba(205,178,138,.20)';c.lineWidth=1.5;c.stroke();

 // Cabecera de marca: logo real si está disponible.
 let logoW=0;
 if(logo.naturalWidth){
  const logoH=82;logoW=logoH*logo.naturalWidth/logo.naturalHeight;
  c.save();c.shadowColor='rgba(0,0,0,.35)';c.shadowBlur=14;c.shadowOffsetY=4;
  c.drawImage(logo,pad,70,logoW,logoH);c.restore();
  logoW+=24;
 }
 c.textAlign='left';c.textBaseline='alphabetic';
 c.fillStyle=T.acc;c.font='700 15px '+SANS;c.letterSpacing='3px';
 c.fillText('360 SHOWROOM  ·  PROPUESTA COMERCIAL',pad+logoW,111);
 c.letterSpacing='0px';
 c.fillStyle=T.ink;c.font='400 58px '+SERIF;
 c.fillText('Resumen de tu showroom',pad,222);
 c.fillStyle=T.muted;c.font='400 22px '+SANS;
 c.fillText('Configuración y presupuesto personalizado',pad,266);

 // Datos del cliente en una superficie secundaria sutil.
 c.save();c.shadowColor='rgba(0,0,0,.52)';c.shadowBlur=26;c.shadowOffsetY=10;
 rr(pad,296,W-2*pad,82,13);c.fillStyle='#111111';c.fill();c.restore();
 rr(pad,296,W-2*pad,82,13);c.strokeStyle='rgba(205,178,138,.17)';c.lineWidth=1;c.stroke();
 c.fillStyle=T.gold;c.font='400 25px '+SERIF;c.textAlign='left';c.fillText(name,pad+22,330);
 c.fillStyle=T.muted;c.font='400 16px '+SANS;c.fillText(email,pad+22,355);
 c.textAlign='right';c.fillStyle='#918777';c.font='500 14px '+SANS;
 c.fillText(new Intl.DateTimeFormat('es-ES',{day:'2-digit',month:'long',year:'numeric'}).format(new Date()),right-22,345);

 // Separador editorial.
 c.strokeStyle='rgba(205,178,138,.45)';c.lineWidth=1.5;
 c.beginPath();c.moveTo(pad,397);c.lineTo(right,397);c.stroke();

 // Desglose: filas contenidas en una superficie continua, sin bandas negras exteriores.
 let y=rowsStart;
 prep.forEach((r,i)=>{
  const n=Math.max(r.L.length,r.V.length),rh=n*lineH+rowPad;
  if(i%2===0){
   c.save();c.shadowColor='rgba(0,0,0,.48)';c.shadowBlur=16;c.shadowOffsetY=5;
   rr(pad-12,y,W-2*pad+24,rh-3,9);c.fillStyle='rgba(255,255,255,.025)';c.fill();c.restore();
  }
  const baseline=y+Math.max(18,(rh-n*lineH)/2)+fontSize;
  c.textAlign='left';c.fillStyle=T.muted;c.font=`400 ${fontSize}px ${SANS}`;
  r.L.forEach((t,k)=>c.fillText(t,pad,baseline+k*lineH));
  c.textAlign='right';c.fillStyle=T.ink;c.font=`700 ${fontSize}px ${SANS}`;
  r.V.forEach((t,k)=>c.fillText(t,right,baseline+k*lineH));
  c.strokeStyle='rgba(205,178,138,.13)';c.lineWidth=1;
  c.beginPath();c.moveTo(pad,y+rh-2);c.lineTo(right,y+rh-2);c.stroke();
  y+=rh;
 });

 // Bloque de total con relieve, luz interior y acento champagne discreto.
 const totalYFinal=Math.min(Math.max(y+28,totalY),H-ctaH-ctaGap-totalH-90);
 const mid=totalYFinal+totalH/2;
 c.save();c.shadowColor='rgba(0,0,0,.76)';c.shadowBlur=34;c.shadowOffsetY=12;
 const totalGrad=c.createLinearGradient(pad,totalYFinal,right,totalYFinal+totalH);
 totalGrad.addColorStop(0,'#201e19');totalGrad.addColorStop(.55,'#191816');totalGrad.addColorStop(1,'#121212');
 rr(pad-12,totalYFinal,W-2*pad+24,totalH,15);c.fillStyle=totalGrad;c.fill();c.restore();
 rr(pad-12,totalYFinal,W-2*pad+24,totalH,15);
 c.strokeStyle='rgba(205,178,138,.48)';c.lineWidth=1.5;c.stroke();
 c.textAlign='left';c.fillStyle=T.ink;c.font='400 42px '+SERIF;
 c.fillText('Total estimado',pad+10,mid+14);
 c.textAlign='right';c.fillStyle=T.gold;c.font='400 54px '+SERIF;
 c.fillText($('orderTotal').textContent,right-10,mid+17);

 // Acciones clicables, con la misma estética oscura de la web.
 const bw=420,gap=28,lx=(W-(bw*2+gap))/2;
 const waMsg=`Hola, soy ${name}. Vi mi cotización de showroom en 360Preventa (total estimado ${$('orderTotal').textContent}) y quiero hablar con un asesor.`;
 const links=[
  {x:lx,url:'https://360preventa.com'},
  {x:lx+bw+gap,url:'https://wa.me/573226834084?text='+encodeURIComponent(waMsg)}
 ];
 const cta=(x,label)=>{
  c.save();c.shadowColor='rgba(0,0,0,.72)';c.shadowBlur=24;c.shadowOffsetY=9;
  const g=c.createLinearGradient(x,ctaY,x,ctaY+ctaH);
  g.addColorStop(0,'#1b1b1b');g.addColorStop(1,'#0b0b0b');
  rr(x,ctaY,bw,ctaH,13);c.fillStyle=g;c.fill();c.restore();
  rr(x,ctaY,bw,ctaH,13);c.strokeStyle='rgba(205,178,138,.56)';c.lineWidth=1.5;c.stroke();
  c.fillStyle='#eee8dd';c.font='700 17px '+SANS;c.textAlign='center';c.textBaseline='middle';
  c.fillText(label,x+bw/2,ctaY+ctaH/2+1);c.textBaseline='alphabetic';
 };
 cta(links[0].x,'VER DEMO');cta(links[1].x,'CONTACTAR ASESOR');
 canvas._links=links.map(l=>({x:l.x,y:ctaY,w:bw,h:ctaH,url:l.url}));

 c.fillStyle='#8f887d';c.font='400 13px '+SANS;c.textAlign='center';
 c.fillText('360PREVENTA.COM  ·  SHOWROOM INMOBILIARIO',W/2,H-76);
 return canvas;
}
function downloadBlob(blob,filename){
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),4000);
}
async function exportSummaryImage(){
 const name=$('customerName').value.trim();
 if(!name){$('confirmStatus').textContent='Por favor, ingresa tu nombre antes de descargar.';$('customerName').focus();return;}
 const canvas=await buildSummaryCanvas();
 canvas.toBlob(blob=>{
  if(!blob){$('confirmStatus').textContent='No se pudo generar el PNG.';return;}
  downloadBlob(blob,`Showroom_Cotizacion_${safeFileName()}.png`);
 },'image/png');
}
function createSinglePagePdf(jpegDataUrl,canvas){
 // Una sola página A4 con escala uniforme (nunca se estira). Los botones se convierten en enlaces clicables.
 const pageW=595.28,pageH=841.89,pxW=canvas.width,pxH=Math.round(pxW*pageH/pageW);
 const sc=Math.min(1,pxH/canvas.height),dw=canvas.width*sc,dh=canvas.height*sc,ox=(pxW-dw)/2,k=pageW/pxW;
 const slice=document.createElement('canvas');slice.width=pxW;slice.height=pxH;
 const ctx=slice.getContext('2d');
 ctx.fillStyle='#0d0d0d';ctx.fillRect(0,0,pxW,pxH);
 ctx.imageSmoothingQuality='high';ctx.drawImage(canvas,ox,0,dw,dh);
 const data=slice.toDataURL('image/jpeg',.96).split(',')[1],binary=atob(data),bytes=new Uint8Array(binary.length);
 for(let j=0;j<binary.length;j++)bytes[j]=binary.charCodeAt(j);
 const f=n=>n.toFixed(2),esc=u=>u.replace(/[()\\]/g,'\\$&');
 const links=(canvas._links||[]).map(l=>({r:[f((ox+l.x*sc)*k),f(pageH-(l.y+l.h)*sc*k),f((ox+(l.x+l.w)*sc)*k),f(pageH-l.y*sc*k)],url:l.url}));
 const enc=new TextEncoder(),chunks=[],offsets=[0];let length=0;
 const addBytes=b=>{chunks.push(b);length+=b.length;},addText=t=>addBytes(enc.encode(t));
 const content=`q\n${pageW} 0 0 ${pageH} 0 0 cm\n/Im0 Do\nQ`;
 const annots=links.length?` /Annots [${links.map((_,i)=>(6+i)+' 0 R').join(' ')}]`:'';
 addText('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
 offsets[1]=length;addText('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
 offsets[2]=length;addText('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
 offsets[3]=length;addText(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R${annots} >>\nendobj\n`);
 offsets[4]=length;addText(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${pxW} /Height ${pxH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n`);addBytes(bytes);addText('\nendstream\nendobj\n');
 offsets[5]=length;addText(`5 0 obj\n<< /Length ${enc.encode(content).length} >>\nstream\n${content}\nendstream\nendobj\n`);
 links.forEach((l,i)=>{offsets[6+i]=length;addText(`${6+i} 0 obj\n<< /Type /Annot /Subtype /Link /Rect [${l.r.join(' ')}] /Border [0 0 0] /A << /S /URI /URI (${esc(l.url)}) >> >>\nendobj\n`);});
 const total=6+links.length,xref=length;addText(`xref\n0 ${total}\n0000000000 65535 f \n`);
 for(let i=1;i<total;i++)addText(String(offsets[i]).padStart(10,'0')+' 00000 n \n');
 addText(`trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
 return new Blob(chunks,{type:'application/pdf'});
}

$('shareQuote').addEventListener('click',()=>{
 $('shareFormats').classList.toggle('hidden');
 $('confirmStatus').textContent='Elige si quieres compartir la cotización en PDF o como imagen.';
});
async function shareQuoteFile(format){
 const name=$('customerName').value.trim();
 if(!name){$('confirmStatus').textContent='Por favor, ingresa tu nombre antes de compartir.';$('customerName').focus();return;}
 $('exportCustomerName').textContent=name;
 try{
  const canvas=await buildSummaryCanvas(format==='pdf');
  let blob,filename,mime;
  if(format==='pdf'){
   const jpeg=canvas.toDataURL('image/jpeg',0.96);
   blob=createSinglePagePdf(jpeg,canvas);
   filename=`Showroom_Cotizacion_${safeFileName()}.pdf`;
   mime='application/pdf';
  }else{
   blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
   if(!blob)throw new Error('No se pudo generar la imagen.');
   filename=`Showroom_Cotizacion_${safeFileName()}.png`;
   mime='image/png';
  }
  const file=new File([blob],filename,{type:mime});
  if(navigator.share && (!navigator.canShare || navigator.canShare({files:[file]}))){
   await navigator.share({files:[file],title:'Cotización 360Preventa',text:'Te comparto la cotización de Showroom 360Preventa.'});
   $('confirmStatus').textContent='Selecciona WhatsApp o Gmail en el menú de compartir.';
  }else{
   $('confirmStatus').textContent='Este navegador no permite adjuntar archivos desde aquí. Descarga el archivo y adjúntalo en WhatsApp o Gmail.';
   downloadBlob(blob,filename);
  }
 }catch(err){
  if(err.name!=='AbortError')$('confirmStatus').textContent='No se pudo abrir el menú de compartir. Puedes descargar el archivo y adjuntarlo en WhatsApp o Gmail.';
 }
}
$('sharePdf').addEventListener('click',()=>shareQuoteFile('pdf'));
$('shareImage').addEventListener('click',()=>shareQuoteFile('image'));


function activeQuotePayload(){
 const ctx=window.__paddleOrderPayCtx||{};
 let total=Number(ctx.totalEuros);
 if(!Number.isFinite(total)||total<=0){
  const raw=String($('orderTotal')?.textContent||'').replace(/[^0-9,.-]/g,'').replace(/\./g,'').replace(',','.');
  total=Number(raw)||0;
 }
 const label=ctx.proyectoLabel||'Showroom 360Preventa';
 const snapshot=ctx.quoteSnapshot||{total,draft:typeof collectQuoteDraft==='function'?collectQuoteDraft():null};
 const testEl=$('quoteIsTest');
 return{
  customerName:$('customerName')?.value.trim()||'',
  customerEmail:$('customerEmail')?.value.trim()||'',
  customerPhone:$('customerPhone')?.value.trim()||'',
  customerCountry:$('customerCountry')?.value||'',
  companyName:$('customerCompany')?.value.trim()||'',
  vatId:$('customerVat')?.value.trim()||'',
  totalEuros:total,
  proyectoLabel:label,
  quoteSnapshot:snapshot,
  source:location.pathname.indexOf('cotizador')>=0||location.pathname.indexOf('cotizar')>=0?'cotizador':'panel',
  isTest:!!(testEl&&testEl.checked)
 };
}
async function persistDownloadedQuote(){
 if(!window.PreventaQuotes||typeof PreventaQuotes.saveQuote!=='function')return null;
 const payload=activeQuotePayload();
 if(!payload.customerName||!payload.customerEmail||!(payload.totalEuros>0))return null;
 return PreventaQuotes.saveQuote(payload);
}
$('downloadPdf').addEventListener('click',async()=>{
 const name=$('customerName').value.trim();
 const email=$('customerEmail').value.trim();
 if(!name){$('confirmStatus').textContent='Por favor, ingresa tu nombre antes de descargar.';$('customerName').focus();return;}
 if(!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
  $('confirmStatus').textContent='Ingresa un correo electrónico válido para descargar la cotización.';
  $('customerEmail').focus();return;
 }
 try{
  $('downloadPdf').disabled=true;
  $('downloadPdf').textContent='Generando PDF…';
  $('confirmStatus').textContent='Generando PDF…';
  const canvas=await buildSummaryCanvas(true);
  const jpeg=canvas.toDataURL('image/jpeg',0.96);
  const pdf=createSinglePagePdf(jpeg,canvas);
  downloadBlob(pdf,`Showroom_Cotizacion_${safeFileName()}.pdf`);
  try{
   await persistDownloadedQuote();
   $('confirmStatus').textContent='PDF listo. La cotización quedó guardada.';
  }catch(saveErr){
   console.warn('No se pudo guardar la cotización:',saveErr);
   const detail=(saveErr&&(saveErr.message||saveErr.details))||'revisa conexión';
   $('confirmStatus').textContent='PDF generado. No se pudo guardar: '+detail;
  }
 }catch(error){
  console.error('Error al generar el PDF:',error);
  $('confirmStatus').textContent='No se pudo generar el PDF. Inténtalo de nuevo.';
 }finally{
  $('downloadPdf').disabled=false;
  $('downloadPdf').textContent=$('downloadPdf').classList.contains('final-quote-download')?'DESCARGAR PDF':'DESCARGAR COTIZACIÓN';
 }
});


const packageCatalog={
 apartment:{title:'Showroom Completo Apartamento',subtitle:'Un showroom integral para presentar y comercializar el apartamento.',note:'Incluye todos los espacios interiores existentes del apartamento, sin límite de habitaciones ni ambientes, dentro de los metros cuadrados contratados.'},
 studio:{title:'Showroom Completo Apartestudio',subtitle:'Una presentación integral de la vivienda compacta.',note:'Incluye todos los espacios interiores existentes del apartestudio, sin límite de habitaciones ni ambientes, dentro de los metros cuadrados contratados.'},
 coliving:{title:'Showroom Completo Co-living',subtitle:'Una solución integral para mostrar habitaciones y zonas compartidas.',note:'Incluye todas las habitaciones y zonas interiores del co-living, sin límite de cantidad, dentro de los metros cuadrados contratados.'}
};

let activePackage='apartment';
const BASE_SHOWROOM_INTRO='La estructura digital para presentar tu inmueble.';
const BASE_SHOWROOM_ITEMS=[["Enlace y portada", "Acceso único con imagen personalizada."], ["Ficha del inmueble", "Descripción e información técnica."], ["Ubicación exterior", "Se integra con fotografías, Google Maps o Street View. No incluye modelado 3D de fachadas ni diseño arquitectónico desde cero."], ["Contacto WhatsApp", "Acceso directo para consultas."], ["Experiencia visual", "Animaciones, transiciones y navegación adaptable."], ["Mini brochure PDF", "Vertical y horizontal, optimizado para móvil, iPad y computador."], ["Alojamiento", "6 meses de publicación incluidos."], ["Menú personalizable", "Sección con enlaces e información relevante de la empresa, el proyecto, el inmueble y cualquier contenido adicional que se necesite agregar."]];
function baseShowroomHTML(){
 return `<p class="accordion-intro">${BASE_SHOWROOM_INTRO}</p><div class="base-compact-grid">${BASE_SHOWROOM_ITEMS.map(([t,d])=>`<button type="button" class="base-include-item" aria-expanded="false"><b>${t}</b><small>${d}</small></button>`).join('')}</div>`;
}
if($('manualBaseContent'))$('manualBaseContent').innerHTML=baseShowroomHTML();
document.addEventListener('click',(e)=>{
 const item=e.target.closest('.base-include-item');
 if(!item)return;
 const open=item.classList.toggle('is-open');
 item.setAttribute('aria-expanded',open?'true':'false');
});


function packageAreaValue(id='packageArea'){return Math.max(1,Math.round(Number($(id)?.value))||100);}
function packageExtraFloors(id='packageExtraFloors'){return Math.max(0,Math.floor(Number($(id)?.value)||0));}
function packageSinglePrice(area,extraFloors=0){
 const extra=Math.max(0,area-100),floorCost=extraFloors*PRICE_FLOOR;
 return {extra,floorCost,price:PACKAGE_BASE+extra*PRICE_AREA_M2+floorCost};
}
function packageAreaPrice(area){return packageSinglePrice(area,packageExtraFloors());}
function packageTotalPrice(){
 const main=packageSinglePrice(packageAreaValue(),packageExtraFloors());
 const resources=[...document.querySelectorAll('.package-addon:checked')].map(el=>({label:el.dataset.label||el.id,cost:Number(el.dataset.cost)||0}));
 const resourcesTotal=resources.reduce((sum,item)=>sum+item.cost,0);
 if(!$('packageAddSimilar')?.checked)return {main,similar:null,discount:0,resources,resourcesTotal,total:main.price+resourcesTotal};
 const similarFloors=Math.max(0,Math.min(20,Number($('packageSimilarFloors')?.value)||0));
 const similar=packageSinglePrice(packageAreaValue('packageSimilarArea'),similarFloors);
 const discount=similar.price*.5;
 return {main,similar,discount,resources,resourcesTotal,total:main.price+similar.price-discount+resourcesTotal};
}
function renderPackage(key){
 activePackage=key;
 document.querySelectorAll('.package-type').forEach(b=>b.classList.toggle('active',b.dataset.package===key));
 const p=packageCatalog[key];
 $('packageDetails').innerHTML=`
  <div class="package-detail-head simple-package-head">
   <div>
    <div class="eyebrow">SHOWROOM COMPLETO · ${key==='apartment'?'APARTAMENTO':key==='studio'?'APART ESTUDIO':'CO-LIVING'}</div>
    <h3>${p.title}</h3>
   </div>
   <div class="package-detail-price">
    <strong id="packageLivePrice">2.190 €</strong>
    <small>PRECIO DEL PAQUETE</small>
    <small>100 m² incluidos · +8 €/m² adicional</small>
   </div>
  </div>

  <p class="quote-flow-tip quote-steps-hint">Completa cada apartado en orden. Puedes volver a abrir cualquier paso para editarlo.</p>
  <div class="package-accordion-list">
  <details class="package-accordion package-includes-accordion" id="packageStep1">
    <summary>
     <span class="accordion-index">01</span>
     <span class="accordion-title">¿Qué contiene tu paquete?</span>
     <span class="accordion-meta">Todo incluido</span>
     <span class="accordion-plus" aria-hidden="true">+</span>
    </summary>
    <div class="accordion-content">
     <section class="package-includes-direct">
   <div class="eyebrow">SHOWROOM COMPLETO · TODO INCLUIDO</div>
   <h4>¿Qué contiene tu paquete?</h4>
   <div class="package-include-row">
    <div><b>Todos los espacios interiores</b><small>Salón, comedor, cocina, dormitorios, baños, estudios, pasillos, vestidores, lavandería, terrazas, sala de TV / cine, sala de juegos, bar / vinoteca, bodega, biblioteca, gimnasio privado, sauna / jacuzzi y demás ambientes existentes.</small></div>
    <span>Según m²</span>
   </div>
   <div class="package-include-row">
    <div><b>1 planta 3D interactiva</b><small>Para explorar la distribución del inmueble.</small></div>
    <span>Incluida</span>
   </div>
   <div class="package-include-row">
    <div><b>Reel Ads promocional</b><small>Vídeo breve para promocionar el inmueble.</small></div>
    <span>Incluido</span>
   </div>
   <div class="package-include-row">
    <div><b>Pack de imágenes verticales</b><small>Listas para compartir y utilizar en comunicación comercial.</small></div>
    <span>Incluido</span>
   </div>
   <details class="package-extra-terms">
    <summary>Ver condiciones y servicios adicionales</summary>
    <p>La cantidad de habitaciones y ambientes interiores no tiene límite dentro de los metros cuadrados contratados. A partir de 100 m² se añaden 8 € por cada m² adicional.</p>
    <p>Plantas 3D adicionales y otros recursos —vídeo cinematográfico, ficha comercial, catálogo, formulario, CRM y landing page— se contratan por separado. No incluye modelado 3D de fachadas.</p>
   </details>
  </section>
     <div class="actions"><button type="button" class="btn primary" data-package-next="packageStep2">Continuar</button></div>
    </div>
   </details>

   <details class="package-accordion" id="packageStep2">
    <summary>
     <span class="accordion-index">02</span>
     <span class="accordion-title">Base del showroom</span>
     <span class="accordion-meta">Incluida</span>
     <span class="accordion-plus" aria-hidden="true">+</span>
    </summary>
    <div class="accordion-content">
     ${baseShowroomHTML()}
     <div class="actions"><button type="button" class="btn primary" data-package-next="packageStep3">Continuar</button></div>
    </div>
   </details>

   <details class="package-accordion" id="packageStep3">
    <summary>
     <span class="accordion-index">03</span>
     <span class="accordion-title">Superficie del inmueble</span>
     <span class="accordion-meta">100 m² incluidos</span>
     <span class="accordion-plus" aria-hidden="true">+</span>
    </summary>
    <div class="accordion-content area-accordion-content">
     <div>
      <p class="accordion-intro">Indica manualmente la superficie construida total: suma los m² reales de todas las plantas del inmueble.</p>
      <p class="accordion-note">Todos los espacios interiores existentes quedan incluidos dentro de la superficie contratada, sin límite de habitaciones ni ambientes.</p>
     </div>
     <div class="area-panel-control">
      <div class="area-input-wrap"><input id="packageArea" type="number" min="1" step="1" value="100" aria-label="Superficie total en metros cuadrados"><span>m²</span></div>
      <small>Hasta 100 m² incluidos · Cada m² adicional: 8 €.</small>
     </div>
     <div class="actions"><button type="button" class="btn primary" data-package-next="packageFloorsAccordion">Continuar</button></div>
    </div>
   </details>

  <details class="package-accordion package-multi-property clean-floor-accordion" id="packageFloorsAccordion">
   <summary>
    <span class="accordion-index">04</span>
    <span class="accordion-title">Plantas 3D adicionales</span>
    <span class="accordion-meta">Opcional</span>
    <span class="accordion-plus" aria-hidden="true">+</span>
   </summary>
   <div class="multi-property-body clean-floor-body plant-config-body">
    <p class="accordion-intro">Configura cuántas plantas del inmueble necesitan representación 3D. La superficie de todas las plantas debe estar incluida en el apartado anterior.</p>
    <div class="plant-config-grid plant-config-complete">
     <div class="plant-included-card">
      <div class="plant-card-top"><span>Plantas incluidas</span><span class="plant-status">INCLUIDA</span></div>
      <strong class="plant-main-value">1 planta 3D</strong>
      <small>Incluida en Showroom Completo</small>
     </div>
     <div class="plant-selector-card">
      <label for="packageExtraFloors">¿Cuántas plantas adicionales necesitas?</label>
      <small>245 € por planta adicional</small>
      <div class="clean-stepper">
       <button type="button" id="packageExtraFloorsMinus" aria-label="Quitar una planta">−</button>
       <input id="packageExtraFloors" type="number" min="0" max="20" step="1" value="0" aria-label="Número de plantas adicionales">
       <button type="button" id="packageExtraFloorsPlus" aria-label="Añadir una planta">＋</button>
      </div>
     </div>
    </div>
    <div class="plant-summary-card">
     <h4>Resumen de plantas</h4>
     <div class="plant-summary-line"><span>Plantas incluidas</span><strong>1</strong></div>
     <div class="plant-summary-line"><span>Plantas adicionales</span><strong id="packageAdditionalCount">0</strong></div>
     <div class="plant-summary-total"><span>Total de plantas 3D</span><strong id="packageTotalPlantCount">1</strong></div>
     <div class="plant-summary-cost"><span>Coste adicional</span><strong id="packageFloorCostSummary">0,00 €</strong></div>
    </div>
    <div class="actions"><button type="button" class="btn primary" data-package-next="packageSimilarProperty">Continuar</button></div>
   </div>
  </details>
  <details class="package-accordion package-multi-property clean-similar-accordion" id="packageSimilarProperty">
   <summary>
    <span class="accordion-index">05</span>
    <span class="accordion-title">Añadir otro showroom similar</span>
    <span class="clean-discount">−50 %</span>
    <span class="accordion-plus" aria-hidden="true">+</span>
   </summary>
   <div class="multi-property-body clean-similar-body">
    <p class="accordion-intro">Si tienes otras tipologías de inmueble en el mismo edificio, agrégalas aquí.</p>
    <label class="choice clean-similar-toggle"><input id="packageAddSimilar" type="checkbox"><span><b>Incluir segundo showroom</b></span></label>
    <div class="similar-fields-grid" id="packageSimilarFields" hidden aria-hidden="true">
     <div class="field similar-type-field"><label for="packageSimilarType">Tipo de inmueble del segundo showroom</label><select id="packageSimilarType" class="similar-property-type"><option value="Apartamento">Apartamento</option><option value="Apartestudio">Apartestudio</option><option value="Co-living">Co-living</option></select></div>
     <div class="field"><label for="packageSimilarArea">Superficie del segundo inmueble (m²)</label><input id="packageSimilarArea" type="number" min="1" step="1" value="100"></div>
     <div class="field"><label for="packageSimilarFloors">Plantas 3D adicionales</label><input id="packageSimilarFloors" type="number" min="0" max="20" step="1" value="0"></div>
     <div class="similar-info-card"><b>1 planta 3D incluida</b><small>Incluida para el segundo showroom. Si necesitas más, puedes añadir plantas adicionales.</small></div>
     <div class="similar-info-card"><b>Recursos compartidos</b><small>Los recursos adicionales contratados se aplican a ambos inmuebles, sin coste extra.</small></div>
    </div>
    <div class="similar-price-summary" id="packageSimilarSummary" hidden aria-hidden="true"><span>Segundo showroom · 50 % de descuento · 1 planta 3D incluida · recursos compartidos</span><strong>0 €</strong></div>
    <div class="actions"><button type="button" class="btn primary" data-package-next="packageResourcesAccordion">Continuar</button></div>
   </div>
  </details>

  <details class="package-accordion package-resources-accordion" id="packageResourcesAccordion">
   <summary>
    <span class="accordion-index">06</span>
    <span class="accordion-title">Recursos adicionales</span>
    <span class="accordion-meta">Incluidos + opcionales</span>
    <span class="accordion-plus" aria-hidden="true">+</span>
   </summary>
   <div class="accordion-content">
    <p class="accordion-intro">Estos dos recursos ya forman parte de Showroom Completo. Están seleccionados y bloqueados. Puedes añadir voluntariamente cualquiera de los demás servicios.</p>
    <div class="grid package-resource-grid">
     <div class="choice package-resource-card package-resource-included">
       <input type="checkbox" id="packageReelIncluded" checked disabled>
       <label for="packageReelIncluded"><b>Reel Ads <span class="resource-status-inline">INCLUIDO</span></b><small>Vídeo promocional breve para anunciar el inmueble.</small></label>
      </div>
      <div class="choice package-resource-card package-resource-included">
       <input type="checkbox" id="packageImagesIncluded" checked disabled>
       <label for="packageImagesIncluded"><b>Imágenes verticales <span class="resource-status-inline">INCLUIDO</span></b><small>Pack de imágenes optimizadas para redes y comunicación comercial.</small></label>
      </div>
      <div class="choice package-resource-card">
      <input type="checkbox" class="package-addon" id="packageCinematicVideo" data-cost="390" data-label="Vídeo cinematográfico">
      <label for="packageCinematicVideo"><b>Vídeo cinematográfico</b><small>Vídeo horizontal 16:9 para presentaciones presenciales y pantallas grandes, con narrativa visual y edición · 390 €</small></label>
     </div>
     <div class="choice package-resource-card">
      <input type="checkbox" class="package-addon" id="packageCommercialSheet" data-cost="245" data-label="Ficha comercial individual">
      <label for="packageCommercialSheet"><b>Ficha comercial individual</b><small>Ficha de una vivienda con imágenes, plano, superficie y datos clave · 245 €</small></label>
     </div>
     <div class="choice package-resource-card">
      <input type="checkbox" class="package-addon" id="packageUnitCatalog" data-cost="220" data-label="Catálogo de unidades">
      <label for="packageUnitCatalog"><b>Catálogo de unidades</b><small>Documento digital con varias viviendas, sus planos y características · 220 €</small></label>
     </div>
     <div class="choice package-resource-card package-coming-soon">
      <input type="checkbox" id="packageLeadForm" disabled>
      <label for="packageLeadForm"><b>Formulario de captación de interesados</b><small>Formulario integrado para recopilar datos de posibles clientes.</small></label>
     </div>
     <div class="choice package-resource-card package-coming-soon">
      <input type="checkbox" id="packageCrmIntegration" disabled>
      <label for="packageCrmIntegration"><b>Integración con CRM</b><small>Conecta los contactos con una herramienta para gestionar seguimiento y oportunidades.</small></label>
     </div>
     <div class="choice package-resource-card package-coming-soon">
      <input type="checkbox" id="packageLandingPage" disabled>
      <label for="packageLandingPage"><b>Landing page personalizada</b><small>Página web exclusiva para presentar el proyecto, sus viviendas y vías de contacto.</small></label>
     </div>
    </div>
    <div class="actions"><button type="button" class="btn primary" data-package-next="packageFinalAccordion">Continuar</button></div>
   </div>
  </details>

  <details class="package-accordion package-final-accordion" id="packageFinalAccordion">
   <summary>
    <span class="accordion-index">07</span>
    <span class="accordion-title">Presupuesto final</span>
    <span class="accordion-meta">Desglose actualizado</span>
    <span class="accordion-plus" aria-hidden="true">+</span>
   </summary>
   <div class="accordion-content">
    <div class="breakdown"><h3>Desglose del proyecto</h3><div id="packageQuoteRows"></div><div class="price-line total-line"><span>Total estimado</span><strong id="packageGrandTotal">2.190 €</strong></div><small class="price-vat-note">${PRICE_VAT_NOTE}</small><p class="desc" id="packageDiscountExplanation" style="margin:12px 0 0"></p></div>
   </div>
  </details>
  </div>

  <section class="package-savings-compact" id="packageSavingsComparison"></section>
  <section class="showroom-visual-delivery" aria-label="Experiencia Showroom en todos tus dispositivos">
   <div class="showroom-visual-heading">
    <span class="eyebrow">UNA EXPERIENCIA COMPLETA</span>
    <h4>Así se presenta tu inmueble.</h4>
    <p>Un showroom interactivo, listo para compartir desde cualquier dispositivo.</p>
   </div>
   <button type="button" class="showroom-image-open" id="showroomImageOpen" aria-label="Ampliar imagen del showroom">
   <img class="showroom-preview" src="assets/showroom-preview.webp" alt="Showroom inmobiliario interactivo en portátil, tablet y celular, con tour 360, planta 3D, imágenes, vídeo Ads, brochure y ficha del inmueble" loading="lazy">
    <span class="showroom-image-hint">VER IMAGEN COMPLETA <span aria-hidden="true">↗</span></span>
   </button>
  </section>`;
 ['packageArea','packageExtraFloors','packageSimilarArea','packageSimilarFloors','packageSimilarType'].forEach(id=>{const el=$(id);if(el)el.addEventListener('input',updatePackagePrice);});
 const floorInput=$('packageExtraFloors');
 $('packageExtraFloorsMinus').addEventListener('click',()=>{floorInput.value=Math.max(0,(Number(floorInput.value)||0)-1);floorInput.dispatchEvent(new Event('input',{bubbles:true}));});
 $('packageExtraFloorsPlus').addEventListener('click',()=>{floorInput.value=Math.min(20,(Number(floorInput.value)||0)+1);floorInput.dispatchEvent(new Event('input',{bubbles:true}));});
 $('packageAddSimilar').addEventListener('change',updatePackagePrice);
 document.querySelectorAll('.package-addon').forEach(el=>el.addEventListener('change',updatePackagePrice));
 updatePackagePrice();
 $('packageSelectedNote').textContent='';
}
// Navegación guiada exclusiva de Showroom Completo: un paso abierto a la vez.
document.addEventListener('click',function(e){
 const button=e.target.closest('#packageDetails [data-package-next]');
 if(!button)return;
 const current=button.closest('details.package-accordion');
 if(!current||!$('packageDetails')?.contains(current))return;
 const steps=quoteStepList(current);
 const idx=steps.indexOf(current);
 const next=idx>=0?steps[idx+1]:document.getElementById(button.dataset.packageNext);
 if(!next)return;
 revealNextStep(next,current);
});

function updatePackagePrice(){
 const q=packageTotalPrice(),area=packageAreaValue(),total=q.total;
 $('packageLivePrice').textContent=money(total);
 if(!$('packageChooser').classList.contains('hidden')){
  $('stickyPrice').textContent=money(total);
  $('hunterLiveCommission').textContent=money(hunterCommission(total));
 }
 const areaLabel=$('packageTotalAreaLabel');if(areaLabel)areaLabel.textContent=area+' m²';
 const similarFields=$('packageSimilarFields');if(similarFields){similarFields.hidden=!q.similar;similarFields.setAttribute('aria-hidden',String(!q.similar));}
 const similarSummary=$('packageSimilarSummary');
 if(similarSummary){similarSummary.hidden=!q.similar;if(q.similar)similarSummary.querySelector('strong').textContent=money(q.similar.price-q.discount);}
 const extraFloors=packageExtraFloors();
 if($('packageAdditionalCount'))$('packageAdditionalCount').textContent=String(extraFloors);
 if($('packageTotalPlantCount'))$('packageTotalPlantCount').textContent=String(1+extraFloors);
 if($('packageFloorCostSummary'))$('packageFloorCostSummary').textContent=money(q.main.floorCost);
 const similarText=q.similar?` · Segundo showroom: ${money(q.similar.price)} − 50 % (${money(q.discount)} de descuento)`:'';
 const resourcesText=q.resourcesTotal?` · Recursos opcionales: ${money(q.resourcesTotal)}`:'';
 $('packageSelectedNote').textContent=`${area} m² totales · ${extraFloors} planta(s) 3D${q.main.extra?` · ${q.main.extra} m² adicionales`:''}${similarText}${resourcesText} · ${money(total)} total.`;
 const manualSpaces=PRICE_MAIN*4+PRICE_SECONDARY*4;
 const includedIndividually=PRICE_REEL+PRICE_VERTICAL; // Reel Ads + imágenes verticales
 const individualExtras=areaExtra(area)+(extraFloors*PRICE_FLOOR)+q.resourcesTotal;
 const packageManualDelta=(PRICE_BASE+PRICE_FLOOR+manualSpaces+includedIndividually)-PACKAGE_BASE;
 const similarIndividual=q.similar?(q.similar.price+packageManualDelta):0;
 const manualEquivalent=PRICE_BASE+PRICE_FLOOR+manualSpaces+includedIndividually+individualExtras+similarIndividual; // base + 1 planta 3D + recursos incluidos
 const packageWithExtras=q.total;
 const saving=manualEquivalent-packageWithExtras;
 const savingsLabel=saving>=0?'Ahorro':'Diferencia';
 $('packageSavingsComparison').innerHTML=`<div class="saving-compact"><div class="saving-compact-title">Ventaja del paquete</div><div class="saving-compact-values"><div class="saving-compact-item"><small>Por separado</small><strong>${money(manualEquivalent)}</strong></div><div class="saving-compact-item saving-package-price"><small>Showroom Completo</small><strong>${money(packageWithExtras)}</strong></div><div class="saving-compact-item saving-amount"><small>${savingsLabel}</small><strong>${money(Math.abs(saving))}</strong></div></div></div>`;
 // Presupuesto final del paquete (mismo formato que el desglose del flujo personalizado)
 const pq=$('packageQuoteRows');
 if(pq){
  const pk=packageCatalog[activePackage],baseP=q.main.price-q.main.extra*PRICE_AREA_M2-q.main.floorCost;
  const pRows=[['Tipología',pk.title.replace('Showroom Completo ','')],['Showroom completo · hasta 100 m²',money(baseP)]];
  if(q.main.extra)pRows.push([`Superficie adicional · ${q.main.extra} m² × ${PRICE_AREA_M2} €`,money(q.main.extra*PRICE_AREA_M2)]);
  if(extraFloors>0)pRows.push([`Plantas 3D adicionales · ${extraFloors} × ${PRICE_FLOOR} €`,money(q.main.floorCost)]);
  q.resources.forEach(item=>pRows.push([item.label,money(item.cost)]));
  pq.innerHTML=pRows.map(([a,b])=>`<div class="price-line"><span>${a}</span><strong>${b}</strong></div>`).join('')
   +`<div class="price-line"><span>Subtotal del primer inmueble</span><strong>${money(q.main.price+q.resourcesTotal)}</strong></div>`;
  if(q.similar)pq.innerHTML+=`<div class="property-block"><h4>Segundo showroom · ${$('packageSimilarType').value}</h4><div class="price-line"><span>Tipo de inmueble</span><strong>${$('packageSimilarType').value}</strong></div><div class="price-line"><span>Superficie</span><strong>${packageAreaValue('packageSimilarArea')} m²</strong></div><div class="price-line"><span>Planta 3D incluida</span><strong>1</strong></div>${q.similar.floorCost?`<div class="price-line"><span>Plantas 3D adicionales</span><strong>${Math.max(0,Number($('packageSimilarFloors').value)||0)} · ${money(q.similar.floorCost)}</strong></div>`:''}<div class="price-line"><span>Recursos adicionales</span><strong>Compartidos · sin coste extra</strong></div><div class="price-line"><span>Descuento aplicado</span><strong>50 %</strong></div><div class="price-line"><span>Importe segundo inmueble</span><strong>${money(q.similar.price-q.discount)}</strong></div></div>`;
  $('packageGrandTotal').textContent=money(q.total);
  $('packageDiscountExplanation').textContent=q.similar?'El 50 % se aplica a la configuración reutilizada del segundo inmueble. Los recursos adicionales se comparten entre ambos inmuebles.':'';
 }
}

function showConfiguratorScreen(screen){
 const path=$('pathChooser');
 const packageView=$('packageChooser');
 const manualView=$('manualConfigurator');
 const upsell=$('manualUpsell');
 const draft=readQuoteDraft();

 // Ocultar primero todas las pantallas para evitar que se solapen.
 path.classList.add('hidden');
 packageView.classList.add('hidden');
 manualView.classList.add('hidden');
 if(upsell) upsell.classList.add('hidden');

 if(screen==='paths'){
  path.classList.remove('hidden');
  $('stickyPrice').textContent=money(0);
  $('hunterLiveCommission').textContent=money(0);
  $('packageSelectedNote').textContent='';
 }else if(screen==='package'){
  packageView.classList.remove('hidden');
  let key='apartment';
  try{ if(draft&&draft.package&&draft.package.activePackage) key=draft.package.activePackage; else if(activePackage) key=activePackage; }catch(e){}
  // No regenerar el HTML si ya hay configuración en curso (atrás → volver a entrar).
  if(!$('packageDetails').innerHTML.trim()){
   renderPackage(key);
   applyPackageDraft(draft);
  }else{
   try{ document.querySelectorAll('.package-type').forEach(b=>b.classList.toggle('active',b.dataset.package===activePackage)); }catch(e){}
   applyPackageDraft(draft);
   updatePackagePrice();
  }
  collapseAllQuoteSteps(packageView);
 }else if(screen==='manual'){
  manualView.classList.remove('hidden');
  if(upsell) upsell.classList.remove('hidden');
  applyManualDraft(draft);
  collapseAllQuoteSteps(manualView);
  $('packageSelectedNote').textContent='';
  update();
  const liveQuote=$('manualLiveQuote');
  if(liveQuote){
   liveQuote.style.display='block';
   $('manualLiveTotal').textContent=money(current().total);
  }
 }
 window.scrollTo({top:0,behavior:'auto'});
 saveQuoteDraftSoon();
}

$('manualPath').addEventListener('click',()=>showConfiguratorScreen('manual'));
$('manualBackToStart')?.addEventListener('click',()=>showConfiguratorScreen('paths'));
$('manualBackBottom')?.addEventListener('click',()=>showConfiguratorScreen('paths'));
$('packagePath')?.addEventListener('click',()=>showConfiguratorScreen('package'));
$('backToPaths')?.addEventListener('click',()=>showConfiguratorScreen('paths'));
$('packageBack')?.addEventListener('click',()=>showConfiguratorScreen('paths'));

document.querySelectorAll('.package-type').forEach(b=>b.addEventListener('click',()=>{
 renderPackage(b.dataset.package);
 collapseAllQuoteSteps($('packageChooser')||document);
 saveQuoteDraftSoon();
}));
document.addEventListener('input',e=>{
 if(e.target.closest&&e.target.closest('#manualConfigurator,#packageDetails,#packageChooser')) saveQuoteDraftSoon();
},true);
document.addEventListener('change',e=>{
 if(e.target.closest&&e.target.closest('#manualConfigurator,#packageDetails,#packageChooser')) saveQuoteDraftSoon();
},true);
document.addEventListener('toggle',e=>{
 if(e.target&&e.target.closest&&e.target.closest('#manualConfigurator,#packageDetails')) saveQuoteDraftSoon();
},true);
$('packageSelect').addEventListener('click',()=>{
 restoreOrderModal();
 const p=packageCatalog[activePackage],area=packageAreaValue(),q=packageTotalPrice();
 const rows=[['Paquete',p.title],['Superficie total del inmueble',area+' m²'],['Base completa del showroom','Incluida'],['Todos los espacios interiores existentes','Incluidos sin límite'],['Plantas 3D del inmueble',(1+packageExtraFloors())+' planta(s) · '+money(q.main.floorCost)+' en plantas adicionales'],['Reel Ads promocional','Incluido'],['Pack de imágenes verticales','Incluido']];
 if(q.main.extra)rows.push([`Superficie adicional · ${q.main.extra} m² × ${PRICE_AREA_M2} €`,money(q.main.extra*PRICE_AREA_M2)]);
 q.resources.forEach(item=>rows.push([item.label,money(item.cost)]));
 if(q.similar){
  rows.push(['Segundo showroom · '+packageAreaValue('packageSimilarArea')+' m²',money(q.similar.price)]);
  rows.push(['Planta 3D del segundo showroom','1 planta incluida']);
  if(q.similar.extra)rows.push(['Superficie adicional del segundo showroom',money(q.similar.extra*PRICE_AREA_M2)]);
  rows.push(['Descuento segundo showroom · 50 %','− '+money(q.discount)]);
  rows.push(['Recursos adicionales','Compartidos con ambos inmuebles · sin coste extra']);
 }
 $('orderTitle').textContent='Resumen del paquete';
 $('orderSummary').innerHTML=rows.map(([a,b])=>`<div class="order-detail-row"><span>${a}</span><strong>${b}</strong></div>`).join('');
 $('orderTotal').textContent=money(q.total);$('confirmStatus').textContent='';
 $('exportCustomerName').textContent=$('customerName').value.trim();
 try{
  window.PanelPaddle?.mountInOrderModal?.(q.total,{
   customerName:$('customerName').value.trim(),
   customerEmail:$('customerEmail')?.value.trim()||'',
   proyectoLabel:p.title,
   quoteSnapshot:{mode:'package',package:activePackage,total:q.total,area}
  });
 }catch(ePay){}
 $('orderModal').classList.remove('hidden');
 try{$('orderPaySchedule')?.scrollIntoView?.({block:'nearest',behavior:'smooth'});}catch(eScroll){}
});

update();updateHunter();

const demoProjects=[
 {id:1,name:'Miralago',client:'Inmobiliaria Miralago',owner:'Diseño',status:'En producción',amount:4190,progress:65,area:'148 m²'},
 {id:2,name:'Apartamento Centro',client:'Laura Gómez',owner:'Diseño',status:'En revisión',amount:2190,progress:88,area:'92 m²'},
 {id:3,name:'Co-living Norte',client:'Grupo Norte',owner:'Marketing',status:'Pendiente',amount:3250,progress:15,area:'180 m²'}
];
let demoTasks=[
 {id:1,title:'Ajustar materiales del salón',project:'Miralago',owner:'Diseño',priority:'Alta',due:'2026-11-15',status:'En curso'},
 {id:2,title:'Preparar brochure vertical',project:'Apartamento Centro',owner:'Marketing',priority:'Media',due:'2026-11-16',status:'Pendiente'},
 {id:3,title:'Validar planos de referencia',project:'Co-living Norte',owner:'Diseño',priority:'Alta',due:'2026-11-14',status:'Pendiente'},
 {id:4,title:'Enviar revisión al cliente',project:'Miralago',owner:'Diseño',priority:'Baja',due:'2026-11-18',status:'Completada'}
];
let showArchivedTasks=false;
try{const saved=JSON.parse(localStorage.getItem('boxiesTasksState')||'null');if(Array.isArray(saved))demoTasks=saved;}catch(e){}
function saveTasksState(){try{localStorage.setItem('boxiesTasksState',JSON.stringify(demoTasks));}catch(e){}}
const demoMoney=n=>'€ '+Number(n).toLocaleString('es-ES');
const projectRows=()=>demoProjects.map(p=>`<tr><td><button class="project-open" data-project="${p.id}">${p.name}</button></td><td>${p.client}</td><td>${p.owner}</td><td><span class="status-pill">${p.status}</span></td><td>${demoMoney(p.amount)}</td><td><div class="progress-track"><span style="width:${p.progress}%"></span></div><small>${p.progress}%</small></td></tr>`).join('');
const portalPages={
 payments:{title:'Pagos',intro:'Cotizaciones (pipeline) y Contabilidad (ingresos reales).',body:`<div id="panelPaymentsRoot" class="panel-payments" data-payments-root="1"><div class="portal-note">Cargando…</div></div>`},
 contracts:{title:'Contratos',intro:'Prepara contratos desde los datos del proyecto para evitar introducir la información dos veces.',body:`<div class="portal-note">Flujo previsto: seleccionar proyecto → completar datos fiscales faltantes → generar documento desde plantilla → revisión → firma.</div><div class="portal-form"><label>Proyecto<select><option>Seleccionar proyecto…</option><option>Miralago</option><option>Apartamento Centro</option><option>Co-living Norte</option></select></label><label>Plantilla<select><option>Contrato de servicios</option><option>Acuerdo de confidencialidad</option></select></label><label>Razón social<input placeholder="Se completará desde el proyecto"></label><label>Documento fiscal<input placeholder="NIF / CIF / NIT"></label></div><button class="btn primary" data-demo="contracts">Preparar contrato</button><p class="desc">La generación automática requiere cargar la plantilla contractual aprobada.</p>`},
 database:{title:'Base de datos',intro:'',body:`<div id="panelDatabaseRoot" class="panel-database" data-database-root="1"></div>`},
 tasks:{title:'Tareas',intro:'El tablero es común para coordinar el equipo. Cada integrante puede filtrar sus asignaciones; los permisos finales se aplicarán por rol.',body:`<div class="portal-toolbar"><button class="btn primary" id="newTaskBtn">＋ Nueva tarea</button><button class="btn" id="toggleArchivedTasks" type="button">Ver archivadas</button><select id="taskOwner"><option value="">Todos los responsables</option><option>Diseño</option><option>Marketing</option><option>Hunter</option></select><select id="taskProject"><option value="">Todos los proyectos</option><option>Miralago</option><option>Apartamento Centro</option><option>Co-living Norte</option></select><select id="taskPriority"><option value="">Todas las prioridades</option><option>Alta</option><option>Media</option><option>Baja</option></select><input id="taskDue" type="date" aria-label="Filtrar por fecha límite"></div><div id="taskCreateForm" class="portal-files-panel portal-hidden"><div class="portal-form"><label>Tarea<input id="newTaskTitle" placeholder="Descripción de la tarea"></label><label>Proyecto<select id="newTaskProject"><option>Miralago</option><option>Apartamento Centro</option><option>Co-living Norte</option></select></label><label>Responsable<select id="newTaskOwner"><option>Diseño</option><option>Marketing</option><option>Hunter</option></select></label><label>Prioridad<select id="newTaskPriority"><option>Media</option><option>Alta</option><option>Baja</option></select></label><label>Fecha límite<input id="newTaskDate" type="date"></label></div><button class="btn primary" id="saveTaskBtn">Guardar tarea (demo)</button></div><div class="kanban" id="taskBoard"></div><div class="portal-note">Las tareas se muestran a nivel de equipo. El filtro “responsable” permite consultar la carga individual. En producción, cada persona verá y actualizará sus tareas según sus permisos.</div>`},
 hunt:{title:'Hunt',intro:'Centro de captación y crecimiento comercial.',body:`<div class="profile-accordion-list">
 <details class="profile-accordion"><summary><span>Ads</span><span class="accordion-chevron">＋</span></summary><div class="profile-accordion-content"><div class="portal-dashboard-kpis"><div class="portal-kpi"><small>Plataformas</small><strong>Google + Meta</strong><span class="kpi-trend">Conexión pendiente</span></div><div class="portal-kpi"><small>Campañas activas</small><strong>—</strong><span class="kpi-trend">Esperando conexión</span></div><div class="portal-kpi"><small>Inversión</small><strong>—</strong><span class="kpi-trend">Sin datos sincronizados</span></div><div class="portal-kpi"><small>Leads</small><strong>—</strong><span class="kpi-trend">Sin datos sincronizados</span></div></div><h3>Plataformas publicitarias</h3><div class="portal-list"><div class="portal-list-item"><b>Google Ads</b><span class="status-pill">Pendiente de conectar API</span></div><div class="portal-list-item"><b>Meta Ads · Facebook e Instagram</b><span class="status-pill">Pendiente de conectar API</span></div></div><h3>Contenido Ads</h3><p class="desc">Carpeta para almacenar y compartir los vídeos, creatividades y materiales que se prepararán para los anuncios.</p><div class="portal-files-panel"><div class="file-folder"><b>▰ Contenido Ads</b><span class="muted">Drive compartido · vídeos · imágenes · copys</span></div><label class="field">Enlace de la carpeta de Google Drive<input id="adsDriveUrl" type="url" placeholder="Pega aquí el enlace de la carpeta"></label><div style="display:flex;gap:9px;flex-wrap:wrap"><button class="btn" id="saveAdsDrive" type="button">Guardar enlace</button><button class="btn primary" id="openAdsDrive" type="button">Abrir Contenido Ads ↗</button></div><small class="muted" id="adsDriveStatus">El enlace se guarda localmente por ahora. La integración con Drive queda pendiente.</small></div>
</div></details>
 <details class="profile-accordion"><summary><span>CRM</span><span class="accordion-chevron">＋</span></summary><div class="profile-accordion-content"><p class="desc">Gestión de prospectos y oportunidades comerciales. Esta estructura es inicial; los registros se conectarán a la base de datos cuando se integre Supabase.</p><div class="portal-dashboard-kpis"><div class="portal-kpi"><small>Leads nuevos</small><strong>—</strong></div><div class="portal-kpi"><small>En seguimiento</small><strong>—</strong></div><div class="portal-kpi"><small>Oportunidades</small><strong>—</strong></div><div class="portal-kpi"><small>Convertidos</small><strong>—</strong></div></div><div class="portal-toolbar"><input type="search" id="crmSearch" placeholder="Buscar prospecto o empresa…"><button class="btn primary" type="button" data-demo="crm">＋ Nuevo lead</button></div><div class="portal-table-wrap"><table class="portal-table"><thead><tr><th>Prospecto</th><th>Empresa</th><th>Estado</th><th>Responsable</th><th>Próxima acción</th></tr></thead><tbody><tr><td colspan="5" class="muted">Todavía no hay leads registrados.</td></tr></tbody></table></div></div></details>
 <details class="profile-accordion"><summary><span>Reportes</span><span class="accordion-chevron">＋</span></summary><div class="profile-accordion-content"><p class="desc">Indicadores de captación, conversión y rendimiento comercial.</p><div class="portal-dashboard-kpis"><div class="portal-kpi"><small>Inversión publicitaria</small><strong>—</strong><span class="kpi-trend">Sin conexión</span></div><div class="portal-kpi"><small>Leads generados</small><strong>—</strong><span class="kpi-trend">Sin conexión</span></div><div class="portal-kpi"><small>Proyectos vendidos</small><strong>—</strong><span class="kpi-trend">Sin datos sincronizados</span></div><div class="portal-kpi"><small>Conversión</small><strong>—</strong><span class="kpi-trend">Sin datos sincronizados</span></div></div><div class="portal-note">Los reportes se habilitarán al conectar Google Ads, Meta Ads, el CRM y los proyectos con Supabase.</div></div></details>
 </div>`},
 reports:{title:'Reportes',intro:'Panel general de actividad de BOXIES. Los indicadores deben alimentarse de los registros de cada módulo, sin cifras de demostración.',body:`<div class="portal-note">Vista preparada para consolidar los datos de BOXIES. La sincronización real entre usuarios y dispositivos requiere conectar Supabase Database y Realtime; esta versión no inventa ni simula cifras.</div><div class="portal-dashboard-kpis"><div class="portal-kpi"><small>Cotizaciones descargadas</small><strong>—</strong><span class="kpi-trend">Origen: Cotizar</span></div><div class="portal-kpi"><small>Pagos realizados</small><strong>—</strong><span class="kpi-trend">Origen: Pagos</span></div><div class="portal-kpi"><small>Comisiones generadas</small><strong>—</strong><span class="kpi-trend">Origen: Ventas y Mi perfil</span></div><div class="portal-kpi"><small>Tareas completadas</small><strong>—</strong><span class="kpi-trend">Origen: Tareas</span></div><div class="portal-kpi"><small>Proyectos activos</small><strong>—</strong><span class="kpi-trend">Origen: Proyectos</span></div><div class="portal-kpi"><small>Ventas cerradas</small><strong>—</strong><span class="kpi-trend">Origen: Hunt / Proyectos</span></div></div><h3>Actividad por área</h3><div class="portal-list"><div class="portal-list-item"><b>Cotizaciones</b><span>Creación · descarga · aceptación</span></div><div class="portal-list-item"><b>Finanzas</b><span>Ingresos · pagos pendientes · comisiones</span></div><div class="portal-list-item"><b>Proyectos</b><span>Nuevos · activos · entregados</span></div><div class="portal-list-item"><b>Equipo</b><span>Tareas · actividad · productividad</span></div><div class="portal-list-item"><b>Comercial</b><span>Prospectos · conversiones · ventas</span></div><div class="portal-list-item"><b>Publicidad</b><span>Campañas · inversión · leads</span></div></div><h3>Filtros de consulta</h3><div class="portal-toolbar"><select aria-label="Periodo del reporte"><option>Todo el tiempo</option><option>Este mes</option><option>Últimos 30 días</option><option>Este año</option></select><select aria-label="Área del reporte"><option>Todas las áreas</option><option>Comercial</option><option>Finanzas</option><option>Proyectos</option><option>Equipo</option><option>Publicidad</option></select></div><p class="desc">Cada indicador deberá abrir su listado de registros de origen y actualizarse cuando cambie la información correspondiente.</p>`},
 calendar:{title:'Calendario',intro:'Agenda central de BOXIES para coordinar entregas, reuniones, pagos, tareas e hitos de proyectos.',body:`<div class="portal-toolbar"><button class="btn primary" type="button" id="calendarAddEvent">＋ Nuevo evento</button><select aria-label="Filtrar calendario"><option>Todos los eventos</option><option>Proyectos</option><option>Pagos</option><option>Tareas</option><option>Reuniones</option></select></div><div class="portal-note">El calendario está preparado como módulo de planificación. Para compartir eventos y sincronizarlos en tiempo real entre Guille y Toby, debe conectarse a la base de datos común de Supabase.</div><div id="boxiesCalendarEvents" class="portal-list"><div class="portal-list-item"><b>Entregas de proyectos</b><span>Se mostrarán aquí desde Proyectos</span></div><div class="portal-list-item"><b>Fechas de pagos</b><span>Se mostrarán aquí desde Pagos</span></div><div class="portal-list-item"><b>Fechas límite de tareas</b><span>Se mostrarán aquí desde Tareas</span></div><div class="portal-list-item"><b>Reuniones y compromisos</b><span>Eventos del equipo</span></div></div><dialog id="calendarEventDialog" style="background:#151515;color:#eee;border:1px solid #555;border-radius:14px;padding:22px;max-width:420px;width:calc(100% - 32px)"><form method="dialog" id="calendarEventForm"><h3>Nuevo evento</h3><label class="field">Nombre<input name="title" required placeholder="Ej. Reunión con cliente"></label><label class="field">Fecha y hora<input name="date" type="datetime-local" required></label><label class="field">Tipo<select name="type"><option>Reunión</option><option>Entrega</option><option>Pago</option><option>Tarea</option><option>Otro</option></select></label><div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px"><button class="btn" value="cancel">Cancelar</button><button class="btn primary" id="calendarSaveEvent" value="default">Guardar</button></div></form></dialog>`},
 library:{title:'Biblioteca',intro:'Repositorio de recursos compartidos del equipo.',body:`<div class="portal-note">Espacio central para organizar materiales de trabajo. La biblioteca comienza como estructura visual; la carga y sincronización de archivos compartidos requiere integración con Drive y Supabase.</div><div class="portal-grid library-grid"><div class="portal-card"><span class="picon">▧</span><b>Plantillas</b><small>Documentos, contratos, presupuestos y formatos reutilizables.</small></div><div class="portal-card"><span class="picon">▦</span><b>Recursos gráficos</b><small>Logotipos, tipografías, imágenes y elementos de marca.</small></div><div class="portal-card"><span class="picon">▣</span><b>Referencias</b><small>Inspiración visual, moodboards y referencias de diseño.</small></div><div class="portal-card"><span class="picon">▤</span><b>Material comercial</b><small>Presentaciones, brochures y piezas para clientes.</small></div><div class="portal-card"><span class="picon">▰</span><b>Contenido</b><small>Vídeos, creatividades y recursos para redes y campañas.</small></div><div class="portal-card"><span class="picon">↗</span><b>Carpeta compartida</b><small>Enlace general de Google Drive pendiente de configurar.</small></div></div><div class="portal-files-panel"><label class="field">Enlace de la biblioteca compartida<input id="libraryDriveUrl" type="url" placeholder="Pega aquí el enlace de Google Drive"></label><div style="display:flex;gap:9px;flex-wrap:wrap"><button class="btn" id="saveLibraryDrive" type="button">Guardar enlace</button><button class="btn primary" id="openLibraryDrive" type="button">Abrir biblioteca ↗</button></div><small class="muted" id="libraryDriveStatus">El enlace se guarda localmente por ahora.</small></div>`},
 ads:{title:'Ads',intro:'Centro de campañas y contenido publicitario de 360Preventa.',body:`<div class="portal-dashboard-kpis"><div class="portal-kpi"><small>Plataformas</small><strong>Google + Meta</strong><span class="kpi-trend">Conexión pendiente</span></div><div class="portal-kpi"><small>Campañas activas</small><strong>—</strong><span class="kpi-trend">Esperando conexión</span></div><div class="portal-kpi"><small>Inversión</small><strong>—</strong><span class="kpi-trend">Sin datos sincronizados</span></div><div class="portal-kpi"><small>Leads</small><strong>—</strong><span class="kpi-trend">Sin datos sincronizados</span></div></div><h3>Plataformas publicitarias</h3><div class="portal-list"><div class="portal-list-item"><b>Google Ads</b><span class="status-pill">Pendiente de conectar API</span></div><div class="portal-list-item"><b>Meta Ads · Facebook e Instagram</b><span class="status-pill">Pendiente de conectar API</span></div></div><h3>Contenido Ads</h3><p class="desc">Carpeta para almacenar y compartir los vídeos, creatividades y materiales que se prepararán para los anuncios.</p><div class="portal-files-panel"><div class="file-folder"><b>▰ Contenido Ads</b><span class="muted">Drive compartido · vídeos · imágenes · copys</span></div><label class="field">Enlace de la carpeta de Google Drive<input id="adsDriveUrl" type="url" placeholder="Pega aquí el enlace de la carpeta"></label><div style="display:flex;gap:9px;flex-wrap:wrap"><button class="btn" id="saveAdsDrive" type="button">Guardar enlace</button><button class="btn primary" id="openAdsDrive" type="button">Abrir Contenido Ads ↗</button></div><small class="muted" id="adsDriveStatus">El enlace se guarda localmente por ahora. La integración con Drive queda pendiente.</small></div><div class="portal-note">Pendiente: conectar Google Ads API, Meta Marketing API y Supabase para mostrar métricas actualizadas y permisos por usuario.</div>`},
 chat:{title:'Chat del equipo',intro:'Espacio interno para conversar y compartir información de trabajo.',body:`<div class="portal-note">Chat de demostración local. Para que los usuarios conectados conversen entre distintos dispositivos en tiempo real, debemos sincronizarlo con Supabase Realtime y aplicar permisos por usuario.</div><div class="portal-files-panel"><div class="portal-toolbar"><label style="flex:1">Tu nombre<input id="chatDisplayName" placeholder="Nombre del usuario"></label><span class="status-pill">Modo local</span></div><div id="teamChatMessages" class="team-chat-messages" aria-live="polite"></div><form id="teamChatForm" class="team-chat-form"><textarea id="teamChatInput" rows="2" placeholder="Escribe un mensaje para el equipo…" required></textarea><button class="btn primary" type="submit">Enviar</button></form><small class="muted">Los mensajes de esta versión se guardan únicamente en este navegador. Los archivos adjuntos y el chat entre usuarios requieren Supabase.</small></div>`}
};
// Calendario: eventos locales de esta sesión/navegador; sincronización compartida pendiente de Supabase.
document.addEventListener('click',function(ev){
 const add=ev.target.closest('#calendarAddEvent');
 if(add){const dlg=document.getElementById('calendarEventDialog');if(dlg)dlg.showModal();}
 const save=ev.target.closest('#calendarSaveEvent');
 if(save){const form=document.getElementById('calendarEventForm');const host=document.getElementById('boxiesCalendarEvents');if(form&&host){const fd=new FormData(form);const title=String(fd.get('title')||'').trim();const date=String(fd.get('date')||'');const type=String(fd.get('type')||'Otro');if(title&&date){const row=document.createElement('div');row.className='portal-list-item';const b=document.createElement('b');b.textContent=title;const span=document.createElement('span');span.textContent=type+' · '+new Date(date).toLocaleString();row.append(b,span);host.prepend(row);try{const key='boxiesCalendarLocalEvents';const arr=JSON.parse(localStorage.getItem(key)||'[]');arr.push({title,date,type,createdAt:new Date().toISOString()});localStorage.setItem(key,JSON.stringify(arr));}catch(e){}}}}
});

function profileSalesData(){
 return demoProjects.map(p=>({
  ...p,
  commission:Math.max(HUNTER_MIN_MONTHLY,p.amount*HUNTER_RATE),
  quoteRows:[
   ['Tipo de inmueble','Showroom inmobiliario'],
   ['Superficie',p.area],
   ['Proyecto',p.name],
   ['Cliente',p.client],
   ['Servicio contratado','Configuración y visualización del showroom'],
   ['Estado del pedido',p.status],
   ['Importe contratado',demoMoney(p.amount)]
  ]
 }));
}
function renderProfileSales(){
 const host=$('profileSalesList');if(!host)return;
 const sales=profileSalesData();
 host.innerHTML=sales.map(s=>`<button type="button" class="portal-list-item sale-row" data-sale="${s.id}" style="width:100%;text-align:left;background:transparent;color:inherit;border:0;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px 0"><span style="display:grid;gap:5px"><b>${s.client}</b><small class="muted">${s.name} · ${demoMoney(s.amount)}</small></span><span style="display:grid;gap:5px;text-align:right"><b>${demoMoney(s.commission)}</b><small class="muted">Comisión ganada · Ver pedido ↗</small></span></button>`).join('')||'<p class="desc">Todavía no hay ventas registradas.</p>';
}

document.addEventListener('input',e=>{
 if(e.target?.id==='profileDisplayName'){
  try{localStorage.setItem('boxiesProfileName',e.target.value.trim());}catch(err){}
 }
});
document.addEventListener('change',e=>{
 const host=document.querySelector('#hunter .hunter-profile-access');
 const photoInput=e.target?.closest?.('#hunter .hunter-profile-access #profilePhotoInput');
 if(photoInput&&photoInput.files&&photoInput.files[0]){
  const file=photoInput.files[0];if(!file.type.startsWith('image/'))return;
  const reader=new FileReader();
  reader.onload=()=>{
   const preview=host?.querySelector('#profilePhotoPreview');
   const placeholder=host?.querySelector('#profilePhotoPlaceholder');
   const status=host?.querySelector('#profilePhotoStatus');
   if(preview){preview.src=reader.result;preview.classList.remove('portal-hidden');}
   placeholder?.classList.add('portal-hidden');
   try{localStorage.setItem('boxiesProfilePhoto',reader.result);if(status)status.textContent='Foto guardada localmente. Pendiente de sincronizar con Supabase.';}
   catch(err){if(status)status.textContent='Imagen cargada en esta sesión. No se pudo guardar localmente.';}
  };
  reader.readAsDataURL(file);
 }
 const goal=e.target?.closest?.('#hunter .hunter-profile-access #profileGoalSelect');
 if(goal){
  const n=Number(goal.value)||5,closed=hunterClosedSalesCount(),pct=Math.min(100,Math.round(closed/n*100)),remaining=Math.max(0,n-closed);
  try{localStorage.setItem('boxiesHunterGoal',String(n));}catch(err){}
  renderHunterGoalFooter();
  const text=host?.querySelector('#profileGoalText');
  if(text)text.textContent=`${closed} de ${n} proyectos · ${pct}% de la meta · ${remaining?`faltan ${remaining} proyectos`:'meta alcanzada'}`;
 }
});
document.addEventListener('click',e=>{
 const sale=e.target?.closest?.('#hunter .hunter-profile-access [data-sale]');
 if(sale)openSaleOrder(sale.dataset.sale);
});

function openSaleOrder(id){
 const sale=profileSalesData().find(s=>s.id===Number(id));if(!sale)return;
 $('orderTitle').textContent='Resumen del pedido';
 const lead=$('orderModal')?.querySelector('.order-dialog-lead');
 if(lead)lead.textContent='Detalle del pedido';
 const fields=$('orderModal')?.querySelector('.order-client-fields');
 if(fields)fields.style.display='none';
 $('exportCustomerName').textContent=sale.client;
 const fold=$('orderModal')?.querySelector('.order-summary-fold');
 if(fold)fold.open=true;
 const payHost=$('orderPaySchedule');if(payHost){payHost.hidden=true;payHost.style.display='none';}
 ['orderPayDeposit','orderPayBalance'].forEach(id=>{const el=$(id);if(el)el.style.display='none';});
 $('orderSummary').innerHTML=sale.quoteRows.map(([a,b])=>`<div class="order-detail-row"><span>${a}</span><strong>${b}</strong></div>`).join('');
 $('orderSummary').innerHTML+=`<div class="price-line"><span>Comisión generada · 8 %</span><strong>${demoMoney(sale.commission)}</strong></div>`;
 $('orderTotal').textContent=demoMoney(sale.amount);
 ['downloadImage','downloadPdf','shareQuote','quoteToProject','shareFormats'].forEach(id=>{const el=$(id);if(el)el.style.display='none';});
 const wa=$('orderModal')?.querySelector('.summary-actions .final-quote-whatsapp');if(wa)wa.style.display='none';
 $('confirmStatus').textContent='Registro demostrativo.';
 $('orderModal').classList.remove('hidden');
}
function restoreOrderModal(){
 $('orderTitle').textContent='Tu cotización';
 const lead=$('orderModal')?.querySelector('.order-dialog-lead');
 if(lead)lead.textContent='Datos del cliente';
 const fields=$('orderModal')?.querySelector('.order-client-fields');
 if(fields)fields.style.display='';
 const fold=$('orderModal')?.querySelector('.order-summary-fold');
 if(fold)fold.open=false;
 if($('downloadPdf')){$('downloadPdf').style.display='';$('downloadPdf').textContent='Descargar PDF';}
 const wa=$('orderModal')?.querySelector('.summary-actions .final-quote-whatsapp');if(wa)wa.style.display='';
 ['downloadImage','shareQuote','quoteToProject','shareFormats'].forEach(id=>{const el=$(id);if(el)el.style.display='';});
 const payHost=$('orderPaySchedule');
 if(payHost){payHost.hidden=false;payHost.style.display='';}
 const payStatus=$('orderPayStatus');if(payStatus)payStatus.textContent='';
 const dep=$('orderPayDeposit'),bal=$('orderPayBalance');
 if(dep){dep.style.display='';dep.disabled=false;dep.textContent='Contratar · pagar anticipo';}
 if(bal){bal.style.display='none';bal.hidden=true;bal.disabled=true;}
}
function portalShowHome(){
 $('portalHome').classList.remove('portal-hidden');$('portalSubpage').classList.add('portal-hidden');
 // En el inicio del panel no hay atrás: solo se sale con «Salir» del menú.
 $('portalBack').classList.add('portal-hidden');
 document.body.classList.add('portal-mode');$('portal').classList.remove('portal-hidden');window.scrollTo(0,0);
}
function hunterGoalSettings(){
 let goal=5;try{goal=Number(localStorage.getItem('boxiesHunterGoal')||5)}catch(e){}
 if(![5,8,10].includes(goal))goal=5;return goal;
}
function hunterClosedSalesCount(){
 // Solo cuenta ventas explícitamente marcadas como cerradas/ganadas; no usa proyectos demo abiertos.
 let extra=[];try{extra=JSON.parse(localStorage.getItem('boxiesClosedSales')||'[]')}catch(e){}
 const closedFromProjects=(Array.isArray(demoProjects)?demoProjects:[]).filter(p=>/cerrad|ganad|entregad/i.test(String(p.status||''))).length;
 return Math.max(0,closedFromProjects+(Array.isArray(extra)?extra.length:0));
}
function hunterBonusForGoal(goal){return goal>=10?320:goal>=8?220:goal>=5?170:70}
function renderHunterGoalFooter(){
 const goal=hunterGoalSettings(),closed=hunterClosedSalesCount(),pct=Math.min(100,Math.round(closed/goal*100));
 const fill=document.getElementById('hunterGoalFill'),track=document.getElementById('hunterGoalTrack');
 if(fill)fill.style.width=pct+'%';if(track){track.style.setProperty('--goal-step',(100/goal)+'%');track.setAttribute('aria-valuemax',String(goal));track.setAttribute('aria-valuenow',String(Math.min(closed,goal)));}
 const caption=document.getElementById('hunterGoalCaption');if(caption)caption.textContent=`Meta · ${goal} proyectos · ${Math.min(closed,goal)}/${goal}`;
 const bonus=document.getElementById('hunterGoalBonus');if(bonus)bonus.innerHTML=`<small>Bono meta</small>+${hunterBonusForGoal(goal)} €`;
}

function initHunterProfile(){
 const host=document.querySelector('#hunter .hunter-profile-access');
 if(!host)return;
 renderProfileSales();
 const profileName=host.querySelector('#profileDisplayName');
 if(profileName){try{profileName.value=localStorage.getItem('boxiesProfileName')||'';}catch(e){}}
 const photoPreview=host.querySelector('#profilePhotoPreview');
 const photoPlaceholder=host.querySelector('#profilePhotoPlaceholder');
 try{
  const savedPhoto=localStorage.getItem('boxiesProfilePhoto');
  if(savedPhoto&&photoPreview){photoPreview.src=savedPhoto;photoPreview.classList.remove('portal-hidden');photoPlaceholder?.classList.add('portal-hidden');}
 }catch(e){}
 const goalSelect=host.querySelector('#profileGoalSelect');
 if(goalSelect){
  try{goalSelect.value=String(hunterGoalSettings());}catch(e){}
  const updateProfileGoal=()=>{
   const goal=Number(goalSelect.value)||5,closed=hunterClosedSalesCount();
   const pct=Math.min(100,Math.round(closed/goal*100)),remaining=Math.max(0,goal-closed);
   try{localStorage.setItem('boxiesHunterGoal',String(goal));}catch(e){}
   renderHunterGoalFooter();
   const progress=host.querySelector('#profileGoalProgress');
   const text=host.querySelector('#profileGoalText');
   if(progress)progress.style.width=pct+'%';
   if(text)text.textContent=`${closed} de ${goal} proyectos · ${pct}% de la meta · ${remaining?`faltan ${remaining} proyectos`:'meta alcanzada'}`;
  };
  goalSelect.onchange=updateProfileGoal;
  updateProfileGoal();
 }
}

function openEmbeddedQuote(){
 $('manualUpsell').classList.add('hidden');
 $('manualConfigurator').classList.add('hidden');
 $('packageChooser').classList.add('hidden');
 $('pathChooser').classList.remove('hidden');
 $('stickyPrice').textContent=money(0);
 $('hunterLiveCommission').textContent=money(0);
 $('portal').classList.add('portal-hidden');
 document.body.classList.remove('portal-mode');
 $('portalBack').classList.remove('portal-hidden');
 window.scrollTo(0,0);
 // Tras fullscreen (iframe) o recarga: recuperar la cotización en curso.
 requestAnimationFrame(()=>{ restoreQuoteSession(); });
}

function portalOpenPage(key){
 if(portalModuleLocked(key)){
  showPortalLockedToast(key==='database'?'Solo admin puede abrir Base de datos':'Acceso bloqueado temporalmente');
  return;
 }
 if(key==='payments' && !window.boxiesPaymentsUnlocked){
  // Admins entran sin clave; hunters necesitan OTP del chat.
  const rol=(document.body.dataset.panelRole||sessionStorage.getItem('boxiesPanelRole')||'').toLowerCase();
  if(rol==='admin'||rol==='super_admin'||window.BoxiesTeamChat?.isAdmin?.()){
    window.boxiesPaymentsUnlocked=true;
  }else{
    $('paymentsGateBackdrop').classList.remove('portal-hidden');
    $('paymentsDynamicKey').value='';$('paymentsGateError').textContent='';
    setTimeout(()=>$('paymentsDynamicKey').focus(),30);
    return;
  }
 }
 if(key==='quote'){
  // Cotizador privado: con FS activo va por shell iframe (no location.href).
  try{
   sessionStorage.setItem('boxiesTeamSession','1');
   var rol=(document.body.dataset.panelRole||sessionStorage.getItem('boxiesPanelRole')||'').trim();
   if(rol) sessionStorage.setItem('boxiesPanelRole',rol);
  }catch(e){}
  var quoteUrl='/cotizar?modo=interno';
  try{
   if(window.BoxiesFullscreen&&typeof window.BoxiesFullscreen.navigate==='function'){
    window.BoxiesFullscreen.navigate(quoteUrl);
    return;
   }
  }catch(errNav){}
  window.location.href=quoteUrl;
  return;
 }
 const p=portalPages[key];if(!p)return;
 $('portalHome').classList.add('portal-hidden');$('portalSubpage').classList.remove('portal-hidden');$('portalBack').classList.remove('portal-hidden');
 $('portalSubpage').dataset.module=key;
 const introHtml=p.intro?`<p class="portal-sub">${p.intro}</p>`:'';
 $('portalSubpage').innerHTML=`<div class="eyebrow">360PREVENTA · MÓDULO</div><h2>${p.title}</h2>${introHtml}${p.body}`;
 if(key==='tasks')renderTasks();
 if(key==='payments'){
  try{ window.PanelPaddle?.mount?.($('portalSubpage')); }catch(ePay){
   try{ window.PanelPayments?.mount?.($('portalSubpage')); }catch(e2){ console.warn('[Pagos]', ePay||e2); }
  }
 }
 if(key==='database'){
  try{ window.PanelDatabase?.mount?.($('portalSubpage')); }catch(eDb){ console.warn('[Base de datos]', eDb); }
 }
 if(key==='hunt'){const input=document.getElementById('adsDriveUrl');try{input.value=localStorage.getItem('boxiesAdsDriveUrl')||'';}catch(e){}}
 if(key==='library'){const input=document.getElementById('libraryDriveUrl');try{input.value=localStorage.getItem('boxiesLibraryDriveUrl')||'';}catch(e){}}
 if(key==='profile'){
  renderProfileSales();
  const profileName=document.getElementById('profileDisplayName');
  if(profileName){try{profileName.value=localStorage.getItem('boxiesProfileName')||'';}catch(e){}}
  const photoPreview=document.getElementById('profilePhotoPreview'), photoPlaceholder=document.getElementById('profilePhotoPlaceholder');
  try{const savedPhoto=localStorage.getItem('boxiesProfilePhoto');if(savedPhoto&&photoPreview){photoPreview.src=savedPhoto;photoPreview.classList.remove('portal-hidden');photoPlaceholder?.classList.add('portal-hidden');}}catch(e){}
  const goalSelect=document.getElementById('profileGoalSelect');
  const updateProfileGoal=()=>{
   const goal=Number(goalSelect.value)||5, closed=hunterClosedSalesCount(), pct=Math.min(100,Math.round(closed/goal*100)), remaining=Math.max(0,goal-closed);
   try{localStorage.setItem('boxiesHunterGoal',String(goal))}catch(e){}
   renderHunterGoalFooter();
   if(document.getElementById('profileGoalLabel'))document.getElementById('profileGoalLabel').textContent=goal+' proyectos';
   document.getElementById('profileGoalProgress').style.width=pct+'%';
   document.getElementById('profileGoalText').textContent=`${closed} de ${goal} proyectos · ${pct}% de la meta · ${remaining?`faltan ${remaining} proyectos`:'meta alcanzada'}`;
  };
  try{goalSelect.value=String(hunterGoalSettings())}catch(e){}
  goalSelect.addEventListener('change',updateProfileGoal);updateProfileGoal();
 }
 window.scrollTo(0,0);
}
document.querySelectorAll('[data-page]').forEach(b=>b.addEventListener('click',()=>portalOpenPage(b.dataset.page)));
renderHunterGoalFooter();
window.addEventListener('storage',e=>{if(e.key==='boxiesHunterGoal'||e.key==='boxiesClosedSales')renderHunterGoalFooter();});
document.getElementById('paymentsGateForm').addEventListener('submit',async e=>{
 e.preventDefault();
 const keyEl=document.getElementById('paymentsDynamicKey');
 const errEl=document.getElementById('paymentsGateError');
 const key=(keyEl?.value||'').trim();
 const submitBtn=e.target.querySelector('button[type="submit"]');
 if(!key){if(errEl)errEl.textContent='Introduce la clave dinámica.';return;}
 try{
  if(submitBtn)submitBtn.disabled=true;
  if(errEl)errEl.textContent='Verificando…';
  let ok=false;
  if(window.BoxiesTeamChat&&typeof window.BoxiesTeamChat.verifyOtp==='function'){
   ok=await window.BoxiesTeamChat.verifyOtp(key);
  }
  if(!ok){
   if(errEl)errEl.textContent='Clave incorrecta o caducada. Pide una nueva en el chat.';
   keyEl?.select?.();
   return;
  }
  window.boxiesPaymentsUnlocked=true;
  try{sessionStorage.setItem('boxiesPaymentsUnlocked','1');}catch(err){}
  document.getElementById('paymentsGateBackdrop').classList.add('portal-hidden');
  portalOpenPage('payments');
 }catch(err){
  if(errEl)errEl.textContent=err.message||'No se pudo verificar la clave.';
 }finally{
  if(submitBtn)submitBtn.disabled=false;
 }
});
document.getElementById('requestPaymentsKey').addEventListener('click',async ()=>{
 const errEl=document.getElementById('paymentsGateError');
 if(window.BoxiesTeamChat&&typeof window.BoxiesTeamChat.requestPaymentsKey==='function'){
  if(errEl)errEl.textContent='Enviando solicitud al chat…';
  await window.BoxiesTeamChat.requestPaymentsKey();
  return;
 }
 if(errEl)errEl.textContent='El chat aún no está listo. Recarga e inténtalo de nuevo.';
});
try{if(sessionStorage.getItem('boxiesPaymentsUnlocked')==='1')window.boxiesPaymentsUnlocked=true;}catch(e){}

// Exportación de resúmenes de Pagos por año, mes, proyecto o todos los movimientos.
function paymentsExportRows(){
 const rows=[];
 document.querySelectorAll('.payments-year').forEach(yearEl=>{
  const year=(yearEl.querySelector(':scope > summary span')?.textContent||'').split('·')[0].trim();
  yearEl.querySelectorAll('.payments-month').forEach(monthEl=>{
   const month=(monthEl.querySelector(':scope > summary span')?.textContent||'').trim();
   monthEl.querySelectorAll('tbody tr').forEach(tr=>{
    const cells=[...tr.querySelectorAll('td')].map(td=>td.innerText.trim());
    if(cells.length>=4) rows.push({year,month,project:cells[0],concept:cells[1],status:cells[2],amount:cells[3]});
   });
  });
 });
 return rows;
}
function refreshPaymentsExportFilter(){
 const scope=document.getElementById('paymentsExportScope'),wrap=document.getElementById('paymentsExportFilterWrap'),filter=document.getElementById('paymentsExportFilter');
 if(!scope||!wrap||!filter)return;
 const type=scope.value;wrap.classList.toggle('portal-hidden',type==='all');
 let values=[];const rows=paymentsExportRows();
 if(type==='year') values=[...new Set(rows.map(r=>r.year))];
 if(type==='month') values=[...new Set(rows.map(r=>r.month))];
 if(type==='project') values=[...new Set(rows.map(r=>r.project))];
 filter.innerHTML=values.map(v=>`<option value="${v.replace(/&/g,'&amp;').replace(/"/g,'&quot;')}">${v}</option>`).join('');
}
// Los controles de Pagos se insertan dinámicamente al abrir el módulo.
// Delegamos los eventos en document para que funcionen aunque el HTML se cree después.
document.addEventListener('click',e=>{
 const openBtn=e.target.closest('#openPaymentsExport');
 if(openBtn){
  const backdrop=document.getElementById('paymentsExportBackdrop');
  if(backdrop){backdrop.classList.remove('portal-hidden');refreshPaymentsExportFilter();}
  return;
 }
 const cancelBtn=e.target.closest('#cancelPaymentsExport');
 if(cancelBtn){document.getElementById('paymentsExportBackdrop')?.classList.add('portal-hidden');return;}
 const confirmBtn=e.target.closest('#confirmPaymentsExport');
 if(confirmBtn){
  const scopeEl=document.getElementById('paymentsExportScope');
  const filterEl=document.getElementById('paymentsExportFilter');
  if(!scopeEl||!filterEl){alert('No se pudo cargar el selector del informe.');return;}
  const scope=scopeEl.value,filter=filterEl.value;
  let rows=paymentsExportRows(),title='Resumen completo de pagos';
  if(scope==='year'){rows=rows.filter(r=>r.year===filter);title='Resumen de pagos · '+filter;}
  if(scope==='month'){rows=rows.filter(r=>r.month===filter);title='Resumen de pagos · '+filter;}
  if(scope==='project'){rows=rows.filter(r=>r.project===filter);title='Resumen del proyecto · '+filter;}
  if(!rows.length){alert('No hay movimientos para descargar en esta selección.');return;}
  const win=window.open('','_blank');
  if(!win){alert('El navegador bloqueó la ventana del informe. Permite las ventanas emergentes para generar el PDF.');return;}
  win.document.open();win.document.write(paymentReportHtml(rows,title));win.document.close();
  win.onload=()=>win.print();
  setTimeout(()=>{try{win.focus();win.print();}catch(err){}},700);
  document.getElementById('paymentsExportBackdrop')?.classList.add('portal-hidden');
  return;
 }
 const backdrop=e.target.closest('#paymentsExportBackdrop');
 if(backdrop&&e.target===backdrop)backdrop.classList.add('portal-hidden');
});
document.addEventListener('change',e=>{if(e.target?.id==='paymentsExportScope')refreshPaymentsExportFilter();});
function paymentAmountNumber(value){
 const n=String(value||'').replace(/[^0-9,.-]/g,'').replace(/\.(?=.*\.)/g,'').replace(',','.');
 const parsed=Number(n);return Number.isFinite(parsed)?parsed:0;
}
function paymentReportHtml(rows,title){
 const total=rows.reduce((s,r)=>s+paymentAmountNumber(r.amount),0);
 const paid=rows.filter(r=>/cobrad|pagad|recibido/i.test(r.status)).reduce((s,r)=>s+paymentAmountNumber(r.amount),0);
 const pending=total-paid;
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=v=>'€ '+v.toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2});
 const body=rows.map(r=>`<tr><td>${esc(r.year)}</td><td>${esc(r.month)}</td><td>${esc(r.project)}</td><td>${esc(r.concept)}</td><td>${esc(r.status)}</td><td class="amount">${esc(r.amount)}</td></tr>`).join('');
 return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(title)} · BOXIES</title><link href="https://fonts.googleapis.com/css2?family=Italiana&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
</head><body><main class="sheet"><header class="top"><div class="brand">360 <b>PREVENTA</b> · BOXIES</div><div class="eyebrow">Informe de pagos</div><h1 class="title">${esc(title)}</h1><div class="sub">Generado el ${new Date().toLocaleDateString('es-ES')} · ${rows.length} movimientos</div></header><section class="cards"><div class="card"><span>Total generado</span><strong>${money(total)}</strong></div><div class="card"><span>Cobrado / pagado</span><strong>${money(paid)}</strong></div><div class="card"><span>Pendiente estimado</span><strong>${money(pending)}</strong></div></section><h2 class="section">Detalle de movimientos</h2>${rows.length?`<table><thead><tr><th>Año</th><th>Mes</th><th>Proyecto</th><th>Concepto</th><th>Estado</th><th>Importe</th></tr></thead><tbody>${body}</tbody></table>`:'<div class="empty">No hay movimientos para este periodo.</div>'}<footer class="foot"><span>BOXIES · Panel de gestión</span><span>Documento generado desde los registros visibles de Pagos</span></footer></main>





</body></html>`;
}

$('portalBack').addEventListener('click',(e)=>{
 // En cotizador el boot.js maneja el atrás (capture). Aquí solo panel.
 if(document.body.classList.contains('cotizador-app')||document.body.dataset.app==='cotizador')return;
 e.preventDefault();
 // Hunter → inicio del panel
 if(document.body.classList.contains('hunter-mode')){
  document.body.classList.remove('hunter-mode');
  if($('hunter'))$('hunter').style.display='none';
  portalShowHome();
  return;
 }
 // Solo en secciones internas: volver al inicio del panel
 if($('portalSubpage')&&!$('portalSubpage').classList.contains('portal-hidden')){
  portalShowHome();
 }
});
$('portalSubpage').addEventListener('click',e=>{
 const b=e.target.closest('[data-demo]');if(!b)return;
 const messages={payments:'Formulario preparado como demostración. Para cobrar de verdad hay que integrar una pasarela.',contracts:'Formulario de contrato preparado. Falta incorporar tu plantilla y el motor de generación.',projects:'La creación y persistencia de proyectos requiere conectar la base de datos.',tasks:'La creación de tareas requiere conectar la base de datos.',drive:'Para activar Drive necesitamos configurar Google Cloud, OAuth 2.0 y la API de Drive.',drive:'Para activar Drive necesitamos configurar Google Cloud, OAuth 2.0 y la API de Drive.'};
 alert(messages[b.dataset.demo]||'Función pendiente de conexión.');
});
// Interacciones locales de demostración para los módulos de gestión.
function renderTasks(){
 const owner=$('taskOwner')?.value||'',project=$('taskProject')?.value||'',priority=$('taskPriority')?.value||'',due=$('taskDue')?.value||'';
 const filtered=demoTasks.filter(t=>!!t.archived===showArchivedTasks&&(!owner||t.owner===owner)&&(!project||t.project===project)&&(!priority||t.priority===priority)&&(!due||t.due===due));
 const cols=['Pendiente','En curso','Completada'];
 $('toggleArchivedTasks').textContent=showArchivedTasks?'← Volver a tareas':'Ver archivadas';
 if(showArchivedTasks){$('taskBoard').innerHTML=`<div class="kanban-col" style="grid-column:1/-1"><h3>Tareas archivadas <span class="muted">${filtered.length}</span></h3>${filtered.map(t=>`<div class="task-card"><b>${t.title}</b><small>${t.project} · ${t.owner}</small><small>Prioridad: ${t.priority} · Límite: ${t.due} · Estado: ${t.status}</small><div class="task-actions"><button class="btn" data-task-restore="${t.id}" type="button">Recuperar</button><button class="btn" data-task-delete="${t.id}" type="button">Eliminar definitivamente</button></div></div>`).join('')||'<p class="desc">No hay tareas archivadas.</p>'}</div>`;return;}
 $('taskBoard').innerHTML=cols.map(status=>`<div class="kanban-col"><h3>${status} <span class="muted">${filtered.filter(t=>t.status===status).length}</span></h3>${filtered.filter(t=>t.status===status).map(t=>`<div class="task-card"><b>${t.title}</b><small>${t.project} · ${t.owner}</small><small>Prioridad: ${t.priority} · Límite: ${t.due}</small><select data-task-status="${t.id}"><option ${t.status===status?'selected':''}>${status}</option>${cols.filter(x=>x!==status).map(x=>`<option>${x}</option>`).join('')}</select><div class="task-actions"><button class="btn" data-task-archive="${t.id}" type="button">Archivar</button></div></div>`).join('')||'<p class="desc">Sin tareas en esta columna.</p>'}</div>`).join('');
}
// Eliminación definitiva robusta de tareas archivadas.
// Se ejecuta en fase de captura para que ningún otro manejador interfiera.
$('portalSubpage').addEventListener('click',function(e){
 const button=e.target.closest('button[data-task-delete]');
 if(!button)return;
 e.preventDefault();
 e.stopPropagation();
 e.stopImmediatePropagation();
 if(!showArchivedTasks){alert('Abre primero la vista de tareas archivadas.');return;}
 const id=String(button.getAttribute('data-task-delete'));
 const index=demoTasks.findIndex(t=>String(t.id)===id && t.archived===true);
 if(index<0){alert('No se encontró la tarea archivada. Actualiza la lista e inténtalo de nuevo.');return;}
 const taskName=demoTasks[index].title||'esta tarea';
 if(!window.confirm(`¿Estás seguro de que deseas eliminar definitivamente “${taskName}”?\n\nLa ficha se borrará y no podrá recuperarse.`))return;
 demoTasks.splice(index,1);
 saveTasksState();
 renderTasks();
},true);

function showProject(id){
 const p=demoProjects.find(x=>x.id===Number(id));if(!p||!$('projectDetail'))return;
 $('projectDetail').innerHTML=`<div class="project-detail-head"><div><div class="eyebrow">EXPEDIENTE · ${p.id.toString().padStart(3,'0')}</div><h3>${p.name}</h3><p class="desc">${p.client} · ${p.area} · Responsable: ${p.owner}</p></div><span class="status-pill">${p.status}</span></div><div class="portal-dashboard-kpis"><div class="portal-kpi"><small>Importe contratado</small><strong>${demoMoney(p.amount)}</strong></div><div class="portal-kpi"><small>Avance</small><strong>${p.progress}%</strong></div><div class="portal-kpi"><small>Estado</small><strong style="font:18px Manrope">${p.status}</strong></div></div><h3>Archivos del proyecto · Google Drive</h3><div class="portal-list"><div class="file-folder"><b>01 · Cotizaciones y contratos</b><span class="muted">PDF · documentos</span></div><div class="file-folder"><b>02 · Planos y referencias</b><span class="muted">SKP · PDF · imágenes</span></div><div class="file-folder"><b>03 · Producción</b><span class="muted">Modelos · renders</span></div><div class="file-folder"><b>04 · Entregables</b><span class="muted">Finales · brochure</span></div></div><button class="btn" data-demo="drive">Explorar carpeta en Drive</button><h3>Tareas vinculadas</h3><div class="portal-list">${demoTasks.filter(t=>t.project===p.name).map(t=>`<div class="portal-list-item"><b>${t.title}</b><span>${t.status} · ${t.owner}</span></div>`).join('')||'<p class="desc">No hay tareas vinculadas en esta demo.</p>'}</div>`;
}
$('portalSubpage').addEventListener('input',e=>{
 if(e.target.id==='profileDisplayName'){try{localStorage.setItem('boxiesProfileName',e.target.value.trim());}catch(err){}}
  if(e.target.id==='projectFilter'||e.target.id==='projectStatus'){
  const q=($('projectFilter')?.value||'').toLowerCase(),st=$('projectStatus')?.value||'';
  $('projectTableBody').innerHTML=demoProjects.filter(p=>(!q||`${p.name} ${p.client}`.toLowerCase().includes(q))&&(!st||p.status===st)).map(p=>`<tr><td><button class="project-open" data-project="${p.id}">${p.name}</button></td><td>${p.client}</td><td>${p.owner}</td><td><span class="status-pill">${p.status}</span></td><td>${demoMoney(p.amount)}</td><td><div class="progress-track"><span style="width:${p.progress}%"></span></div><small>${p.progress}%</small></td></tr>`).join('')||'<tr><td colspan="6">No se encontraron proyectos.</td></tr>';
 }
});
$('portalSubpage').addEventListener('change',e=>{
 const photoInput=e.target.closest('#profilePhotoInput');
 if(photoInput&&photoInput.files&&photoInput.files[0]){const file=photoInput.files[0];if(!file.type.startsWith('image/'))return;const reader=new FileReader();reader.onload=()=>{const preview=$('profilePhotoPreview'),placeholder=$('profilePhotoPlaceholder'),status=$('profilePhotoStatus');if(preview){preview.src=reader.result;preview.classList.remove('portal-hidden');}placeholder?.classList.add('portal-hidden');try{localStorage.setItem('boxiesProfilePhoto',reader.result);if(status)status.textContent='Foto guardada localmente. Pendiente de sincronizar con Supabase.';}catch(err){if(status)status.textContent='Imagen cargada en esta sesión. No se pudo guardar localmente.';}};reader.readAsDataURL(file);return;}
 if(e.target.matches('[data-task-status]')){const t=demoTasks.find(x=>x.id===Number(e.target.dataset.taskStatus));if(t){t.status=e.target.value;saveTasksState();renderTasks();}}
 if(['taskOwner','taskProject','taskPriority','taskDue'].includes(e.target.id))renderTasks();
});
$('portalSubpage').addEventListener('click',e=>{
 if(e.target.id==='saveLibraryDrive'){const url=document.getElementById('libraryDriveUrl')?.value.trim()||'';if(url&&!/^https:\/\//i.test(url)){alert('Introduce un enlace HTTPS válido de Google Drive.');return;}try{localStorage.setItem('boxiesLibraryDriveUrl',url);}catch(err){}const st=document.getElementById('libraryDriveStatus');if(st)st.textContent=url?'Enlace guardado localmente.':'Enlace eliminado.';return;}
 if(e.target.id==='openLibraryDrive'){const url=document.getElementById('libraryDriveUrl')?.value.trim()||localStorage.getItem('boxiesLibraryDriveUrl')||'';if(url&&/^https:\/\//i.test(url))window.open(url,'_blank','noopener');else alert('Primero pega y guarda el enlace de la biblioteca.');return;}
 if(e.target.id==='saveAdsDrive'){const url=document.getElementById('adsDriveUrl')?.value.trim()||'';if(url&&!/^https:\/\//i.test(url)){alert('Introduce un enlace HTTPS válido de Google Drive.');return;}try{localStorage.setItem('boxiesAdsDriveUrl',url);}catch(err){}const st=document.getElementById('adsDriveStatus');if(st)st.textContent=url?'Enlace guardado localmente. Pendiente de sincronización con Drive.':'Enlace eliminado.';return;}
 if(e.target.id==='openAdsDrive'){const url=document.getElementById('adsDriveUrl')?.value.trim()||localStorage.getItem('boxiesAdsDriveUrl')||'';if(url&&/^https:\/\//i.test(url))window.open(url,'_blank','noopener');else alert('Primero pega y guarda el enlace de la carpeta Contenido Ads.');return;}
 const sale=e.target.closest('[data-sale]');if(sale){openSaleOrder(sale.dataset.sale);return;}
 const project=e.target.closest('[data-project]');if(project){showProject(project.dataset.project);return;}
 if(e.target.id==='newTaskBtn'){$('taskCreateForm').classList.toggle('portal-hidden');return;}
 if(e.target.id==='toggleArchivedTasks'){showArchivedTasks=!showArchivedTasks;renderTasks();return;}
 const archive=e.target.closest('[data-task-archive]');if(archive){const t=demoTasks.find(x=>x.id===Number(archive.dataset.taskArchive));if(t){t.archived=true;saveTasksState();renderTasks();}return;}
 const restore=e.target.closest('[data-task-restore]');if(restore){const t=demoTasks.find(x=>x.id===Number(restore.dataset.taskRestore));if(t){t.archived=false;saveTasksState();renderTasks();}return;}
 const del=e.target.closest('[data-task-delete]');if(del){if(!showArchivedTasks)return;const id=Number(del.dataset.taskDelete);const task=demoTasks.find(x=>x.id===id);if(!task||!task.archived)return;if(confirm('¿Estás seguro de que deseas eliminar esta tarea definitivamente? Esta acción no se puede deshacer.')){demoTasks=demoTasks.filter(x=>x.id!==id);saveTasksState();renderTasks();}return;}
 if(e.target.id==='saveTaskBtn'){
  const title=$('newTaskTitle').value.trim();if(!title){alert('Escribe el nombre de la tarea.');return;}
  demoTasks.push({id:Date.now(),title,project:$('newTaskProject').value,owner:$('newTaskOwner').value,priority:$('newTaskPriority').value,due:$('newTaskDate').value||'Sin fecha',status:'Pendiente'});
  $('newTaskTitle').value='';$('taskCreateForm').classList.add('portal-hidden');saveTasksState();renderTasks();alert('Tarea añadida a la demostración local. No se ha guardado en una base de datos.');
 }
});
let activeChatThread='team';
window.setActiveChatThread=function(thread){activeChatThread=String(thread||'team');};
window.clearActiveLocalChat=function(){
 if(!String(activeChatThread||'').startsWith('dm:'))return;
 const keep=readTeamChat().filter(m=>chatThreadForMessage(m)!==activeChatThread);
 try{localStorage.setItem('boxiesTeamChat',JSON.stringify(keep));}catch(e){}
 renderTeamChat();
};
const DEFAULT_CHAT_MEMBERS=['Guille (Admin)','Toby (Hunter)'];
function readChatMembers(){try{localStorage.setItem('boxiesChatMembers',JSON.stringify(DEFAULT_CHAT_MEMBERS));}catch(e){}return DEFAULT_CHAT_MEMBERS;}
function readTeamChat(){try{return JSON.parse(localStorage.getItem('boxiesTeamChat')||'[]');}catch(e){return [];}}
function currentChatName(){let n='';try{n=localStorage.getItem('boxiesProfileName')||localStorage.getItem('profileName')||'';}catch(e){}n=String(n).trim();if(/toby/i.test(n))return 'Toby (Hunter)';return 'Guille (Admin)';}
function chatThreadForMessage(m){return m.thread||'team';}
function directThread(a,b){return 'dm:'+([a,b].sort().join('|'));}
function chatUnreadForThread(thread){const me=currentChatName();let seen={};try{seen=JSON.parse(localStorage.getItem('boxiesChatSeen')||'{}');}catch(e){}const last=Number(seen[thread]||0);return readTeamChat().filter(m=>chatThreadForMessage(m)===thread&&m.name!==me&&Number(m.id)>last).length;}
function updateChatBadge(){if(window.BoxiesTeamChat&&typeof window.BoxiesTeamChat.updateBadge==='function'){window.BoxiesTeamChat.updateBadge();return;}const me=currentChatName();let seen={};try{seen=JSON.parse(localStorage.getItem('boxiesChatSeen')||'{}');}catch(e){}const unread=readTeamChat().filter(m=>m.name!==me&&Number(m.id)>Number(seen[chatThreadForMessage(m)]||0)).length;const badge=document.getElementById('chatUnreadBadge');if(badge){badge.textContent=unread>99?'99+':String(unread);badge.style.display=unread?'block':'none';}const team=document.getElementById('teamChatUnread');if(team){const n=chatUnreadForThread('team');team.textContent=n;team.style.display=n?'inline-block':'none';}}
function markChatThreadRead(thread){let seen={};try{seen=JSON.parse(localStorage.getItem('boxiesChatSeen')||'{}');}catch(e){}const msgs=readTeamChat().filter(m=>chatThreadForMessage(m)===thread);seen[thread]=msgs.reduce((n,m)=>Math.max(n,Number(m.id)||0),Number(seen[thread]||0));try{localStorage.setItem('boxiesChatSeen',JSON.stringify(seen));}catch(e){}}
function escapeChatHtml(v){return String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function renderTeamChat(){const box=document.getElementById('teamChatMessages');if(!box)return;if(activeChatThread==='team'&&window.BoxiesTeamChat){if(typeof window.BoxiesTeamChat.openTeamView==='function')window.BoxiesTeamChat.openTeamView();if(typeof window.BoxiesTeamChat.reload==='function')window.BoxiesTeamChat.reload();return;}if(activeChatThread==='clave'&&window.BoxiesTeamChat&&typeof window.BoxiesTeamChat.openClaveView==='function'){window.BoxiesTeamChat.openClaveView();return;}const messages=readTeamChat().filter(m=>chatThreadForMessage(m)===activeChatThread);box.innerHTML=messages.map(m=>`<div class="team-chat-message"><strong>${escapeChatHtml(m.name||'Equipo')}</strong><p>${escapeChatHtml(m.text||'')}</p><time>${new Date(m.time).toLocaleString('es-ES')}</time></div>`).join('')||'<p class="desc">Todavía no hay mensajes en esta conversación.</p>';box.scrollTop=box.scrollHeight;const title=document.getElementById('chatPopupTitle');if(title){if(activeChatThread==='team')title.textContent='Equipo';else if(activeChatThread==='clave')title.textContent='Clave dinámica';else{const names=activeChatThread.slice(3).split('|');title.textContent=names.find(n=>n!==currentChatName())||'Chat privado';}}const input=document.getElementById('teamChatInput');if(input)input.placeholder=activeChatThread==='team'?'Escribe un mensaje para el equipo…':activeChatThread==='clave'?'Mensajes de Clave dinámica…':'Escribe un mensaje privado…';if(activeChatThread.startsWith('dm:')&&window.BoxiesTeamChat&&typeof window.BoxiesTeamChat.openDmMode==='function')window.BoxiesTeamChat.openDmMode();updateChatBadge();}
function openChatThread(thread){activeChatThread=thread;markChatThreadRead(thread);renderTeamChat();}
function renderChatMemberList(){const list=document.getElementById('chatMemberList');if(!list)return;const me=currentChatName();const members=readChatMembers().filter(n=>n!==me).map(n=>`<button type="button" class="chat-member-option" data-chat-member="${escapeChatHtml(n)}">${escapeChatHtml(n)}</button>`).join('');list.innerHTML=`<button type="button" class="chat-member-option" data-chat-clave="1">Clave dinámica</button>`+(members||'<p class="desc">No hay otros miembros del equipo.</p>');list.querySelector('[data-chat-clave]')?.addEventListener('click',()=>{document.getElementById('chatRecipientPanel').classList.add('portal-hidden');document.getElementById('chatDirectTab').classList.remove('active');document.getElementById('chatTeamTab').classList.remove('active');document.getElementById('teamChatInput').disabled=false;activeChatThread='clave';if(window.BoxiesTeamChat&&typeof window.BoxiesTeamChat.openClaveView==='function')window.BoxiesTeamChat.openClaveView();else openChatThread('clave');});list.querySelectorAll('[data-chat-member]').forEach(btn=>btn.addEventListener('click',()=>{const thread=directThread(currentChatName(),btn.dataset.chatMember);document.getElementById('chatRecipientPanel').classList.add('portal-hidden');document.getElementById('chatDirectTab').classList.add('active');document.getElementById('chatTeamTab').classList.remove('active');document.getElementById('teamChatInput').disabled=false;openChatThread(thread);}));if(window.BoxiesTeamChat&&typeof window.BoxiesTeamChat.refreshMemberList==='function')window.BoxiesTeamChat.refreshMemberList();}
function initTeamChat(){renderChatMemberList();openChatThread('team');document.getElementById('chatTeamTab')?.classList.add('active');document.getElementById('chatDirectTab')?.classList.remove('active');document.getElementById('chatRecipientPanel')?.classList.add('portal-hidden');document.getElementById('teamChatInput').disabled=false;}
document.getElementById('teamChatFloat').addEventListener('click',()=>{const popup=document.getElementById('teamChatPopup');popup.classList.toggle('portal-hidden');if(!popup.classList.contains('portal-hidden')){initTeamChat();setTimeout(()=>document.getElementById('teamChatInput')?.focus(),40);if(window.BoxiesTeamChat&&typeof window.BoxiesTeamChat.markRead==='function')window.BoxiesTeamChat.markRead('team');}});
document.getElementById('teamChatPopupClose').addEventListener('click',()=>document.getElementById('teamChatPopup').classList.add('portal-hidden'));
document.addEventListener('keydown',e=>{if(e.key==='Escape')document.getElementById('teamChatPopup')?.classList.add('portal-hidden');});
document.getElementById('chatTeamTab').addEventListener('click',()=>{document.getElementById('chatRecipientPanel').classList.add('portal-hidden');document.getElementById('chatTeamTab').classList.add('active');document.getElementById('chatDirectTab').classList.remove('active');document.getElementById('teamChatInput').disabled=false;openChatThread('team');});
document.getElementById('chatDirectTab').addEventListener('click',()=>{const panel=document.getElementById('chatRecipientPanel');panel.classList.toggle('portal-hidden');document.getElementById('chatDirectTab').classList.toggle('active',!panel.classList.contains('portal-hidden'));document.getElementById('chatTeamTab').classList.remove('active');renderChatMemberList();if(window.BoxiesTeamChat&&typeof window.BoxiesTeamChat.updateBadge==='function')window.BoxiesTeamChat.updateBadge();});
document.addEventListener('submit',e=>{if(e.target?.id!=='teamChatForm')return;if(window.BoxiesTeamChat&&(activeChatThread==='team'||activeChatThread==='clave'))return;e.preventDefault();const input=document.getElementById('teamChatInput'),text=input.value.trim();if(!text)return;const messages=readTeamChat();messages.push({id:Date.now(),name:currentChatName(),text,time:new Date().toISOString(),thread:activeChatThread});try{localStorage.setItem('boxiesTeamChat',JSON.stringify(messages));}catch(err){alert('No se pudo guardar el mensaje en este navegador.');return;}input.value='';renderTeamChat();});
window.addEventListener('storage',e=>{if(e.key==='boxiesTeamChat'||e.key==='boxiesChatSeen'){renderTeamChat();}});
const globalSearch=$('globalSearch');
function runGlobalSearch(value){
 const q=value.trim().toLowerCase();if(!q)return;
 const project=demoProjects.find(p=>`${p.name} ${p.client}`.toLowerCase().includes(q));
 const task=demoTasks.find(t=>`${t.title} ${t.project} ${t.owner}`.toLowerCase().includes(q));
 if(project){portalOpenPage('database');setTimeout(()=>showProject(project.id),0);}
 else if(task){portalOpenPage('tasks');setTimeout(()=>{renderTasks();$('taskProject').value=task.project;renderTasks();},0);}
 else alert('No se encontraron coincidencias en los datos de demostración.');
}
if(globalSearch)globalSearch.addEventListener('keydown',e=>{if(e.key==='Enter')runGlobalSearch(globalSearch.value)});
function runProjectSearch(value){
 const q=value.trim().toLowerCase();if(!q)return;
 const project=demoProjects.find(p=>`${p.name} ${p.client}`.toLowerCase().includes(q));
 if(project){portalOpenPage('database');setTimeout(()=>showProject(project.id),0);}
 else alert('No se encontró ningún proyecto con ese nombre en los datos de demostración.');
}
$('portalHome').addEventListener('keydown',e=>{if(e.target.id==='dashboardSearch'&&e.key==='Enter')runProjectSearch(e.target.value)});
function enterWorkspace(){
 $('loginScreen').classList.add('portal-hidden');$('portal').classList.remove('portal-hidden');
 document.body.classList.add('portal-mode','workspace-authenticated');
 document.body.classList.remove('auth-checking');
 try{sessionStorage.setItem('boxiesTeamSession','1');}catch(e){}
 portalShowHome();
 if(window.BoxiesGlobalNav?.refresh) window.BoxiesGlobalNav.refresh();
}
window.enterWorkspace=enterWorkspace;
function leaveWorkspaceUi(){
 $('portal')?.classList.add('portal-hidden');
 $('portalSubpage')?.classList.add('portal-hidden');
 $('portalHome')?.classList.remove('portal-hidden');
 $('hunter')?.classList.add('portal-hidden');
 $('loginScreen')?.classList.remove('portal-hidden');
 document.body.classList.remove('workspace-authenticated','nav-panel-authed','auth-checking');
 try{
  delete document.body.dataset.panelRole;
  sessionStorage.removeItem('boxiesPanelRole');
  sessionStorage.removeItem('boxiesTeamSession');
  sessionStorage.removeItem('boxiesPaymentsUnlocked');
  window.boxiesPaymentsUnlocked=false;
 }catch(e){}
 $('teamChatPopup')?.classList.add('portal-hidden');
 $('portalBack')?.classList.add('portal-hidden');
 if($('loginPassword'))$('loginPassword').value='';
 if($('loginError'))$('loginError').textContent='';
 document.body.classList.add('portal-mode');
 if(window.BoxiesGlobalNav?.refresh) window.BoxiesGlobalNav.refresh();
 window.scrollTo(0,0);
 try{ $('loginEmail')?.focus?.(); }catch(e){}
}
window.leaveWorkspaceUi=leaveWorkspaceUi;
/* Login/logout reales: panel-auth.js (Supabase). Evitar flash de login si ya hay sesión de equipo. */
if($('loginForm'))$('loginForm').noValidate=false;
(function bootPanelUiGate(){
  var team=false;
  try{ team=sessionStorage.getItem('boxiesTeamSession')==='1'; }catch(e){}
  if(team){
    $('loginScreen')?.classList.add('portal-hidden');
    $('portal')?.classList.remove('portal-hidden');
    document.body.classList.add('portal-mode','workspace-authenticated','auth-checking');
  }else{
    $('loginScreen')?.classList.remove('portal-hidden');
    $('portal')?.classList.add('portal-hidden');
  }
})();


const globalFullscreenBtn=document.getElementById('globalFullscreenBtn');
const fullscreenExpandIcon='<path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5"/>';
const fullscreenShrinkIcon='<path d="M8 3v5H3M16 3v5h5M21 16h-5v5M3 16h5v5"/>';
function syncGlobalFullscreenControl(){
 if(!globalFullscreenBtn)return;
 const active=!!(window.BoxiesFullscreen?.isActive?.()||document.fullscreenElement);
 globalFullscreenBtn.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true">'+(active?fullscreenShrinkIcon:fullscreenExpandIcon)+'</svg>';
 globalFullscreenBtn.setAttribute('aria-label',active?'Salir de pantalla completa':'Activar pantalla completa');
 globalFullscreenBtn.title=active?'Salir de pantalla completa':'Pantalla completa';
}
globalFullscreenBtn?.addEventListener('click',async()=>{
 try{
  if(window.BoxiesFullscreen?.toggle) await window.BoxiesFullscreen.toggle();
  else if(!document.fullscreenElement){
   if(document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
  }else if(document.exitFullscreen){await document.exitFullscreen();}
 }catch(error){
  if(globalFullscreenBtn) globalFullscreenBtn.title='Pantalla completa no disponible en este navegador';
 }
 syncGlobalFullscreenControl();
});
document.addEventListener('fullscreenchange',syncGlobalFullscreenControl);
document.addEventListener('boxies:fullscreen',syncGlobalFullscreenControl);
syncGlobalFullscreenControl();

/* Deep-links desde /cotizador/?modo=interno (fuente única; motor aún embebido aquí). */
(function bootCotizadorBridge(){
  try{
    var abrir=new URLSearchParams(location.search).get('abrir');
    if(!abrir)return;
    if(abrir==='cotizar'){
      openEmbeddedQuote();
    }else if(abrir==='pagos'){
      window.boxiesPaymentsUnlocked=true;
      portalOpenPage('payments');
    }else if(abrir==='hunter'){
      showPortalLockedToast('Acceso bloqueado temporalmente');
    }
  }catch(e){}
})();
