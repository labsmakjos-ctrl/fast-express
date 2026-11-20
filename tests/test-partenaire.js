/* Espace partenaire : mode démo + mode Supabase simulé (faux Supabase, aucune donnée réelle).
   Vérifie : données du partenaire uniquement, création + lien + WhatsApp manuel, code de remise jamais
   affiché, suivi en direct par track_parcel (sans lecture de driver_locations), historique, relevés
   CSV / impression, fiche entreprise, et non-régression des espaces manager / livreur. */
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
const D=__dirname+'/';
const BASE='http://localhost:8765/index.html';const SB=BASE+'?mode=supabase';
let pass=0,fail=0;const ok=(n,c,i='')=>{c?pass++:fail++;console.log((c?'OK   ':'ÉCHEC')+' '+n+(i?' — '+String(i).slice(0,220):''))};
(async()=>{
const b=await chromium.launch();const errs=[];
const realCfg=fs.readFileSync(path.join(__dirname,'..','js','config.js'),'utf8');
if(!/mode: 'demo'/.test(realCfg))throw new Error('config.js : le site doit rester en démo par défaut');
if(!/deliveryRpc: null/.test(realCfg)||!/deliveryCodeRpc: null/.test(realCfg))throw new Error('config.js : deliveryRpc / deliveryCodeRpc doivent rester à null');
const cfg=realCfg.replace(/supabaseAnonKey: '[^']*'/,"supabaseAnonKey: 'sb_publishable_TEST'").replace(/publicRefreshMs: \d+/,'publicRefreshMs: 3000');
const mock=fs.readFileSync(D+'mock-supabase.js','utf8');
const track=pg=>{pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|ERR_|tile/.test(m.text()))errs.push(m.text())})};
async function ctxWith(db,opts={}){const c=await b.newContext(Object.assign({viewport:{width:1300,height:850},acceptDownloads:true},opts));
 await c.route('**/js/config.js',r=>r.fulfill({contentType:'application/javascript',body:cfg}));
 await c.route('**/vendor/supabase.js',r=>r.fulfill({contentType:'application/javascript',body:mock}));
 await c.route(/basemaps\.cartocdn|openstreetmap|arcgisonline/,r=>r.fulfill({status:204,body:''}));
 if(db)await c.addInitScript(j=>{if(!sessionStorage.getItem('__dbset')){localStorage.setItem('__mockdb',j);sessionStorage.setItem('__dbset','1')}},JSON.stringify(db));
 await c.addInitScript(()=>{window.__OPENED=[];const o=window.open;window.open=function(u,...r){window.__OPENED.push(String(u||''));if(/^https:\/\/wa\.me\//.test(String(u)))return null;return o.call(window,u,...r)}});
 return c}
const view=pg=>pg.$eval('#view',e=>e.textContent);

/* ====================== MODE DÉMO ====================== */
const cd=await ctxWith(null);const p=await cd.newPage();track(p);
await p.goto(BASE);await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(500);
await p.click('[data-u="gabon.tech.store@fastexpress.demo"]');await p.click('#lgGo');await p.waitForTimeout(500);
ok('Démo : partenaire → tableau de bord',await p.evaluate(()=>cur==='partenaire'&&AUTH.role==='partner'));
ok('Menu partenaire (6 pages), sans page « Suivi client » ni pages du manager',await p.evaluate(()=>[...document.querySelectorAll('#nav a')].map(a=>a.dataset.v).join(','))==='partenaire,colis,psuivi,phisto,preleves,pentreprise');
const k=await p.evaluate(()=>{const m=S.colis.filter(c=>c.partnerId===AUTH.partnerId);const n=l=>m.filter(c=>l.includes(c.statut)).length;const v=id=>document.querySelector('#'+id+' .v').textContent.replace(/\s/g,'');
 return{ok:v('pkTotal')===String(m.length)&&v('pkAttente')===String(n(['en_attente','attribue','recupere']))&&v('pkRoute')===String(n(['en_cours']))&&v('pkLivres')===String(n(['livre']))&&v('pkAnnules')===String(n(['annule']))&&v('pkReportes')===String(n(['reporte'])),
  others:S.colis.filter(c=>c.partnerId!==AUTH.partnerId).length,total:S.colis.length,shown:v('pkTotal')}});
ok('Indicateurs = colis du partenaire uniquement (7 indicateurs)',k.ok&&k.others>0&&await p.$$eval('.kpis.pkpis .kpi',x=>x.length)===7,JSON.stringify(k));
ok('Tableau de bord : derniers colis créés, activité récente, livraisons terminées',/Derniers colis créés/.test(await view(p))&&/Activité récente/.test(await view(p))&&/Dernières livraisons terminées/.test(await view(p)));
ok('Mention honnête : WhatsApp non automatique',/ne sont pas envoyés automatiquement/.test(await view(p)));
for(const [sel,dest] of [['[data-pgo="colis"]','colis'],['[data-pgo="psuivi"]','psuivi'],['[data-pgo="phisto"]','phisto']]){await p.evaluate(()=>location.hash='partenaire');await p.waitForTimeout(150);await p.click('.pqa '+sel);await p.waitForTimeout(250);
 ok('Bouton rapide → '+dest,await p.evaluate(()=>cur)===dest)}
// création : réservée au manager
ok('Partenaire : aucun bouton « Nouveau colis » (en-tête, tableau de bord, Mes colis)',await p.evaluate(()=>document.querySelector('#newBtn').hidden&&!document.querySelector('#pNew')));
await p.evaluate(()=>location.hash='colis');await p.waitForTimeout(200);
ok('Partenaire : pas de bouton de création dans « Mes colis »',await p.evaluate(()=>!document.querySelector('#cNew')&&document.querySelector('#newBtn').hidden));
await p.evaluate(()=>newColisModal());await p.waitForTimeout(150);
ok('Partenaire : formulaire de création inaccessible (même appelé directement)',await p.evaluate(()=>!document.querySelector('#modal').classList.contains('on')&&!document.querySelector('#modal').classList.contains('on')));
const nBefore=await p.evaluate(()=>myParcels().length);
await p.evaluate(()=>logout());await p.waitForTimeout(300);
await p.click('[data-u="manager@fastexpress.demo"]');await p.click('#lgGo');await p.waitForTimeout(500);
await p.click('#newBtn');await p.waitForTimeout(200);
ok('Manager : choix du partenaire dans le formulaire',await p.evaluate(()=>!!document.querySelector('#nc1')&&[...document.querySelectorAll('#nc1 option')].some(o=>o.textContent==='Gabon Tech Store')));
await p.selectOption('#nc1',{label:'Gabon Tech Store'});
await p.fill('#nc3','Sandrine Moussavou');await p.fill('#nc4','066 12 34 56');
if(await p.$('#nc12'))await p.fill('#nc12','0.4115, 9.4335');
await p.fill('#nc6','Face à la station Total');
await p.click('#ncSave');await p.waitForTimeout(500);
const created=await p.evaluate(()=>{const c=S.colis.find(x=>x.dest.nom==='Sandrine Moussavou');return c&&{code:c.code,partnerId:c.partnerId,exp:c.exp.nom,otp:c.otp,token:c.token}});
ok('Manager : colis créé et associé au partenaire choisi',created&&created.exp==='Gabon Tech Store'&&/^FE-/.test(created.code),JSON.stringify(created));
await p.evaluate(()=>{closeAll();logout()});await p.waitForTimeout(300);
await p.click('[data-u="gabon.tech.store@fastexpress.demo"]');await p.click('#lgGo');await p.waitForTimeout(500);
ok('Partenaire : le colis créé par le manager apparaît dans son espace',await p.evaluate(c=>myParcels().length&&CO(c).partnerId===AUTH.partnerId&&document.querySelector('#pkTotal .v').textContent.trim()===String(myParcels().length),created.code)&&await p.evaluate(()=>myParcels().length)===nBefore+1);
await p.evaluate(c=>openColis(c),created.code);await p.waitForTimeout(300);
const dr=await p.evaluate(()=>{const d=document.querySelector('#drawer');return{t:d.textContent,share:!!d.querySelector('#drWaShare'),otpBox:!!d.querySelector('#drOtpBox')}});
ok('Fiche : destinataire, repère, n°, date de création, historique, lien, partage WhatsApp',dr.share&&dr.t.includes('Sandrine Moussavou')&&dr.t.includes('Face à la station Total')&&dr.t.includes(created.code)&&/Enregistré par FAST EXPRESS pour Gabon Tech Store/.test(dr.t)&&/Historique du colis/.test(dr.t)&&/Copier le lien pour le client/.test(dr.t)&&/Aperçu de la page client/.test(dr.t)&&/sert uniquement à informer votre client/.test(dr.t));
ok('Fiche partenaire : aucun code de remise (ni bloc, ni valeur)',!dr.otpBox&&!/Code de remise/.test(dr.t)&&!dr.t.includes(created.otp));
await p.click('#drWaShare');await p.waitForTimeout(100);
const wa=await p.evaluate(()=>window.__OPENED.at(-1));
ok('WhatsApp : lien wa.me vers le destinataire (+241) avec le lien de suivi',/^https:\/\/wa\.me\/241066123456\?text=/.test(wa)&&decodeURIComponent(wa).includes('suivi='+created.token)&&decodeURIComponent(wa).includes(created.code),wa);
ok('WhatsApp : le message ne contient pas le code de remise',!decodeURIComponent(wa).includes(' '+created.otp));
await p.evaluate(()=>closeAll());
// Mes colis : recherche
await p.evaluate(()=>location.hash='colis');await p.waitForTimeout(200);
ok('Mes colis : le nouveau colis est listé',(await view(p)).includes(created.code));
// suivi en direct : un colis du partenaire en livraison, position fraîche puis trop ancienne
await p.evaluate(()=>{const c=S.colis.find(x=>x.partnerId===AUTH.partnerId&&x.code!==S.colis[0].code)||S.colis[0];const l=S.livreurs[0];l.statut='disponible';c.livreurId=l.id;c.statut='en_cours';c.hist.push({t:Date.now(),s:'en_cours',note:'test'});l.posAt=Date.now()-60000;window.__PSC=c.code;save()});
await p.evaluate(()=>location.hash='psuivi');await p.waitForTimeout(600);
const ps=await p.evaluate(()=>({mk:Object.keys(PSV.mk),t:document.querySelector('#psList').textContent,code:window.__PSC}));
ok('Suivi en direct (démo) : marqueur pour le colis en livraison',ps.mk.includes(ps.code)&&/Dernière position GPS : \d\d:\d\d/.test(ps.t),JSON.stringify(ps.mk));
ok('Suivi en direct : aucune demande de lien de suivi au partenaire',!/lien de suivi reçu|Ouvrez le lien/i.test(await view(p))&&!(await p.$('[data-pspub]')));
await p.evaluate(()=>PSV.map.setView([0.2,9.2],10,{animate:false}));
await p.click(`[data-psc="${ps.code}"] .small`);await p.waitForTimeout(700);
ok('Suivi en direct : cliquer sur un colis centre la carte sur son livreur',await p.evaluate(c=>{const m=PSV.mk[c],z=PSV.map;return PSV.sel===c&&z.getZoom()===16&&z.getCenter().distanceTo(m.getLatLng())<5},ps.code));
await p.click(`[data-psshare="${ps.code}"]`);await p.waitForTimeout(100);
ok('Suivi en direct : « Partager au client » ouvre WhatsApp avec le lien de suivi',await p.evaluate(c=>{const u=decodeURIComponent(window.__OPENED.at(-1)||'');return/^https:\/\/wa\.me\//.test(u)&&u.includes('suivi='+CO(c).token)},ps.code));
await p.evaluate(()=>{S.livreurs[0].posAt=Date.now()-30*60000;psPaint()});await p.waitForTimeout(100);
const ps2=await p.evaluate(()=>({mk:Object.keys(PSV.mk),t:document.querySelector('#psList').textContent}));
ok('Suivi en direct : position trop ancienne → « Position indisponible », marqueur retiré',!ps2.mk.includes(ps.code)&&/Position indisponible/.test(await p.$eval(`[data-psc="${ps.code}"]`,e=>e.textContent)));
await p.evaluate(()=>location.hash='suivi');await p.waitForTimeout(250);
ok('Ancien favori #suivi → « Suivi en direct » (pas la page client)',await p.evaluate(()=>cur==='psuivi'));
// historique
await p.evaluate(()=>{const m=S.colis.filter(c=>c.partnerId===AUTH.partnerId);const c=m.find(x=>['en_attente','attribue','recupere'].includes(x.statut)&&x.code!==window.__PSC);if(c){c.statut='annule';c.motif='Annulé par le partenaire';c.hist.push({t:Date.now(),s:'annule',note:''})}save()});
await p.evaluate(()=>{PH={q:'',s:'tous',p:'tout'};location.hash='phisto'});await p.waitForTimeout(300);
const h=await p.evaluate(()=>{const m=S.colis.filter(c=>c.partnerId===AUTH.partnerId&&['livre','annule','reporte','echec'].includes(c.statut));return{exp:m.length,rows:document.querySelectorAll('#view tbody tr').length,other:[...document.querySelectorAll('#view tbody tr')].some(r=>CO(r.dataset.c).partnerId!==AUTH.partnerId)}});
ok('Historique : colis terminés du partenaire seulement',h.exp>0&&h.rows===h.exp&&!h.other,JSON.stringify(h));
await p.click('#phS [data-s="annule"]');await p.waitForTimeout(150);
ok('Historique : filtre par statut',await p.evaluate(()=>[...document.querySelectorAll('#view tbody tr')].every(r=>CO(r.dataset.c).statut==='annule')&&document.querySelectorAll('#view tbody tr').length>=1));
await p.click('#phS [data-s="tous"]');await p.fill('#phQ','zzzz-introuvable');await p.waitForTimeout(150);
ok('Historique : recherche (aucun résultat → message)',/Aucun colis terminé/.test(await view(p)));
await p.fill('#phQ','');await p.waitForTimeout(100);
await p.click('#view tbody tr');await p.waitForTimeout(200);
ok('Historique : une ligne ouvre la fiche du colis',await p.evaluate(()=>!!openCode&&document.querySelector('#drawer').textContent.includes(openCode)));
await p.evaluate(()=>closeAll());
// relevés
await p.evaluate(()=>location.hash='preleves');await p.waitForTimeout(300);
await p.click('[data-pr="30j"]');await p.waitForTimeout(200);
const rl=await p.evaluate(()=>{const r=prData();const v=id=>document.querySelector('#'+id+' .v').textContent.replace(/\s/g,'');return{r:r.st,crees:v('prCrees'),livres:v('prLivres'),rows:document.querySelectorAll('#view tbody tr').length,cod:!!document.querySelector('#prCod')}});
ok('Relevés : compteurs cohérents avec le détail',rl.crees===String(rl.r.crees)&&rl.livres===String(rl.r.livres)&&rl.rows===rl.r.crees&&rl.r.crees===rl.r.livres+rl.r.nonlivres+rl.r.annules+rl.r.reportes+rl.r.encours,JSON.stringify(rl));
const [dl]=await Promise.all([p.waitForEvent('download'),p.click('#prCsv')]);
const csv=fs.readFileSync(await dl.path(),'utf8');
ok('Relevés : export CSV (BOM, séparateur ;, en-têtes, une ligne par colis)',csv.charCodeAt(0)===0xfeff&&/^\ufeffN° de suivi;Date de création;Destinataire/.test(csv)&&csv.split('\r\n').length===rl.rows+1&&/\.csv$/.test(dl.suggestedFilename()),dl.suggestedFilename());
ok('Relevés : le CSV ne contient aucun code de remise',await p.evaluate(t=>!prData().list.some(c=>c.otp&&t.split('\r\n').slice(1).some(l=>l.split(';').includes(c.otp))),csv));
const [pop]=await Promise.all([cd.waitForEvent('page'),p.click('#prPdf')]);await pop.waitForLoadState();
ok('Relevés : version imprimable / PDF ouverte',/Relevé des envois/.test(await pop.textContent('body'))&&/Gabon Tech Store/.test(await pop.textContent('body')));await pop.close();
await p.fill('#prFrom','2030-01-01');await p.dispatchEvent('#prFrom','change');await p.waitForTimeout(150);
ok('Relevés : période invalide → message clair',/date de début antérieure/.test(await view(p)));
// mon entreprise
await p.evaluate(()=>location.hash='pentreprise');await p.waitForTimeout(250);
await p.click('#peEdit');await p.waitForTimeout(100);
ok('Mon entreprise : nom non modifiable par le partenaire',await p.evaluate(()=>{const i=document.querySelector('#peForm input[disabled]');return!!i&&i.value==='Gabon Tech Store'}));
await p.fill('#pePhone','12');await p.click('#peSave');await p.waitForTimeout(100);
ok('Mon entreprise : téléphone invalide refusé',/numéro de téléphone valide/.test(await p.$eval('#peErr',e=>e.textContent)));
await p.fill('#pePhone','+241 077 55 44 33');await p.fill('#peAddr','Boulevard Triomphal, Libreville');await p.click('#peSave');await p.waitForTimeout(200);
ok('Mon entreprise : enregistré (démo)',await p.evaluate(()=>{const P=PA(AUTH.partnerId);return P.contact_phone==='+241 077 55 44 33'&&P.address==='Boulevard Triomphal, Libreville'&&/077 55 44 33/.test(document.querySelector('#view').textContent)}));
// non-régression : manager et livreur
await p.evaluate(()=>logout());await p.waitForTimeout(400);
await p.click('[data-u="aurelie@fastexpress.demo"]').catch(()=>{});
if(!(await p.evaluate(()=>AUTH)))await p.evaluate(()=>{const u=S.users.find(x=>x.role==='manager');document.querySelector(`[data-u="${u.email}"]`).click()});
await p.click('#lgGo');await p.waitForTimeout(500);
const mg=await p.evaluate(()=>({role:AUTH.role,cur,nav:[...document.querySelectorAll('#nav a')].map(a=>a.dataset.v)}));
ok('Manager : son espace inchangé (pas de pages partenaire)',mg.role==='manager'&&mg.cur==='tableau'&&!mg.nav.some(v=>['psuivi','phisto','preleves','pentreprise'].includes(v))&&mg.nav.includes('carte'),JSON.stringify(mg));
await p.evaluate(()=>openColis(S.colis.find(c=>c.statut==='en_cours'||c.statut==='attribue').code));await p.waitForTimeout(200);
ok('Manager : la fiche montre toujours le code de remise',await p.evaluate(()=>!!document.querySelector('#drOtpBox')));
await p.evaluate(()=>{closeAll();location.hash='partenaire'});await p.waitForTimeout(200);
ok('Manager : page partenaire non accessible directement',await p.evaluate(()=>cur!=='partenaire'||AUTH.role!=='manager'));
await cd.close();

/* ====================== MODE SUPABASE SIMULÉ ====================== */
const c0=await ctxWith(null);const p0=await c0.newPage();await p0.goto(SB);await p0.waitForTimeout(500);
const db=await p0.evaluate(()=>JSON.parse(JSON.stringify(__MOCKDB)));await c0.close();
const now=Date.now(),iso=t=>new Date(t).toISOString();
const TK='1b4e28ba-2fa1-4d2a-883f-0016d3cca427',TK2='6fa459ea-ee8a-4ca4-894e-db77e160355e';
db.drivers.find(d=>d.id==='d-1').is_on_duty=true;db.drivers.find(d=>d.id==='d-2').is_on_duty=true;
Object.assign(db.parcels.find(r=>r.id==='a2'),{status:'in_transit',driver_id:'d-1',partner_id:'p-1',tracking_token:TK,created_at:iso(now-36e5)});
db.parcels.push({id:'a6',tracking_number:'FE-26-20006',tracking_token:TK2,confirmation_code:'6666',client_name:'Yannick Ella',client_phone:'+241 066 00 00 06',delivery_address:'Carrefour Léon Mba',status:'in_transit',driver_id:'d-2',partner_id:'p-1',delivery_lat:0.40,delivery_lng:9.45,proof_photo_url:null,postponed_date:null,created_at:iso(now-72e5)});
db.parcels.push({id:'a7',tracking_number:'FE-26-20007',tracking_token:'2c1b5f2e-1111-4222-8333-444455556666',confirmation_code:'7777',client_name:'Autre Client',client_phone:'+241 066 00 00 07',delivery_address:'Ailleurs',status:'in_transit',driver_id:'d-1',partner_id:'p-0',delivery_lat:0.40,delivery_lng:9.45,proof_photo_url:null,postponed_date:null,created_at:iso(now-72e5)});
db.driver_locations=[{id:1,driver_id:'d-1',lat:0.379,lng:9.444,accuracy:10,speed:null,heading:null,battery_level:80,is_charging:false,recorded_at:iso(now-12e4),created_at:iso(now-12e4)},
 {id:2,driver_id:'d-2',lat:0.401,lng:9.451,accuracy:12,speed:null,heading:null,battery_level:70,is_charging:false,recorded_at:iso(now-40*6e4),created_at:iso(now-40*6e4)}];
db.parcels.forEach(r=>{if(!r.created_at)r.created_at=iso(now-864e5)});
const cs=await ctxWith(db);const q=await cs.newPage();track(q);
await q.goto(SB);await q.waitForTimeout(500);
await q.fill('#lg1','gts@test.ga');await q.fill('#lg2','secret');await q.click('#lgGo');await q.waitForTimeout(1200);
ok('Supabase : partenaire connecté, tableau de bord',await q.evaluate(()=>AUTH.role==='partner'&&cur==='partenaire'&&!!document.querySelector('#pkTotal')));
ok('Supabase : indicateurs limités au partenaire (colis d\'un autre partenaire exclus)',await q.evaluate(()=>{const n=S.colis.filter(c=>c.partnerId==='p-1').length;return document.querySelector('#pkTotal .v').textContent.trim()===String(n)&&!document.querySelector('#view').textContent.includes('FE-26-20007')}));
ok('Supabase : aucun code de remise dans les pages du partenaire',await q.evaluate(()=>{const t=document.body.textContent;return!['1111','2222','3333','4444','5555','6666'].some(x=>new RegExp('\\b'+x+'\\b').test(t))}));
// fiche : prénom du livreur via track_parcel
await q.evaluate(()=>openColis('FE-26-20002'));await q.waitForTimeout(700);
const drvT=await q.evaluate(()=>({t:document.querySelector('#drDrv')?.textContent||'',otp:!!document.querySelector('#drOtpBox'),all:document.querySelector('#drawer').textContent}));
ok('Supabase : fiche → livreur (prénom) lu par track_parcel, sans accès à drivers',/^Livreur : Rodrigue · Moto$/.test(drvT.t.trim()),drvT.t);
ok('Supabase : fiche sans code de remise',!drvT.otp&&!/\b2222\b/.test(drvT.all));
await q.evaluate(()=>closeAll());
// suivi en direct
const selBefore=await q.evaluate(()=>(window.__MOCKSEL||[]).filter(x=>x.t==='driver_locations'||x.t==='drivers').length);
const rpcBefore=await q.evaluate(()=>(window.__MOCKRPC||[]).length);
await q.evaluate(()=>location.hash='psuivi');await q.waitForTimeout(1200);
const sv=await q.evaluate(()=>({mk:Object.keys(PSV.mk),t:document.querySelector('#psList').textContent,info:document.querySelector('#psInfo').textContent}));
ok('Supabase : tous les colis du partenaire en livraison listés automatiquement, sans lien',/FE-26-20002/.test(sv.t)&&/FE-26-20006/.test(sv.t)&&!/lien de suivi reçu|Ouvrez le lien/i.test(await view(q)));
ok('Supabase : marqueur pour le colis avec position récente (track_parcel)',sv.mk.length===1&&sv.mk[0]==='FE-26-20002'&&/Dernière position GPS : \d\d:\d\d/.test(sv.t),JSON.stringify(sv.mk));
ok('Supabase : position trop ancienne → « Position indisponible » (aucune position inventée)',/Position indisponible/.test(await q.$eval('[data-psc="FE-26-20006"]',e=>e.textContent))&&!sv.mk.includes('FE-26-20006'));
ok('Supabase : liste avec numéro, destinataire, statut et heure GPS',await q.$eval('[data-psc="FE-26-20002"]',e=>/FE-26-20002/.test(e.textContent)&&/En livraison|En cours/i.test(e.textContent)&&e.textContent.includes(CO('FE-26-20002').dest.nom)&&/\d\d:\d\d/.test(e.textContent)));
await q.click('[data-psc="FE-26-20006"] .small');await q.waitForTimeout(200);
ok('Supabase : colis sans position sélectionné → message, carte non déplacée vers une position inventée',await q.evaluate(()=>!PSV.mk['FE-26-20006']&&/Position indisponible pour ce colis/.test(document.querySelector('#toasts')?.textContent||document.body.textContent)));
ok('Supabase : colis d\'un autre partenaire absent de la carte',!/FE-26-20007/.test(sv.t));
ok('Supabase : aucune lecture de drivers / driver_locations par la carte',await q.evaluate(()=>(window.__MOCKSEL||[]).filter(x=>x.t==='driver_locations'||x.t==='drivers').length)===selBefore);
const rpcs=await q.evaluate(n=>(window.__MOCKRPC||[]).slice(n),rpcBefore);
ok('Supabase : la carte n\'appelle que track_parcel (avec le jeton interne, sans action du partenaire)',rpcs.length>=2&&rpcs.every(r=>(r.fn||r.name||r[0]||r)==='track_parcel'||JSON.stringify(r).includes('track_parcel')),JSON.stringify(rpcs).slice(0,200));
ok('Supabase : heure d\'actualisation affichée',/actualisé à \d\d:\d\d/.test(sv.info),sv.info);
// actualisation automatique (publicRefreshMs = 3 s pour le test) : position déplacée
await q.evaluate(t=>{const d=__MOCKDB.driver_locations.find(x=>x.driver_id==='d-1');d.lat=0.385;d.recorded_at=d.created_at=new Date().toISOString()},null);
await q.waitForTimeout(4200);
ok('Supabase : actualisation automatique de la position',await q.evaluate(()=>{const m=PSV.mk['FE-26-20002'];return!!m&&Math.abs(m.getLatLng().lat-0.385)<1e-4}));
// un colis du partenaire part en livraison pendant que la page est ouverte (temps réel coupé) → apparaît seul
await q.evaluate(()=>{window.__PG_DOWN=true;Object.assign(__MOCKDB.parcels.find(r=>r.id==='a1'),{status:'in_transit',driver_id:'d-1',tracking_token:'3f2a1b0c-9d8e-4f7a-8b6c-5d4e3f2a1b0c'})});
await q.waitForTimeout(4500);
ok('Supabase : nouveau colis en livraison ajouté automatiquement à la liste et à la carte',await q.evaluate(()=>!!document.querySelector('[data-psc="FE-26-20001"]')&&!!PSV.mk['FE-26-20001']&&CO('FE-26-20001').statut==='en_cours'));
// statuts à jour sur le tableau de bord (relecture toutes les 2 min ; 3 s pour le test)
await q.evaluate(()=>location.hash='partenaire');await q.waitForTimeout(300);
const livr0=await q.$eval('#pkLivres .v',e=>+e.textContent.trim());
await q.evaluate(()=>Object.assign(__MOCKDB.parcels.find(r=>r.id==='a6'),{status:'delivered',delivered_at:new Date().toISOString()}));
await q.waitForTimeout(4500);
ok('Supabase : tableau de bord mis à jour automatiquement (statut livré relu)',await q.$eval('#pkLivres .v',e=>+e.textContent.trim())===livr0+1&&await q.evaluate(()=>CO('FE-26-20006').statut==='livre'));
await q.evaluate(()=>location.hash='colis');await q.waitForTimeout(300);
ok('Supabase : « Mes colis » affiche les statuts actuels',await q.evaluate(()=>{const r=[...document.querySelectorAll('#view tr[data-c]')];const g=c=>r.find(x=>x.dataset.c===c);return!!g('FE-26-20006')&&/Livré/.test(g('FE-26-20006').textContent)&&/livraison|En cours/i.test(g('FE-26-20001').textContent)}));
await q.evaluate(()=>{window.__PG_DOWN=false});
// création : impossible pour le partenaire, même par requête directe
await q.evaluate(()=>location.hash='partenaire');await q.waitForTimeout(200);
ok('Supabase : partenaire sans bouton ni formulaire de création',await q.evaluate(()=>document.querySelector('#newBtn').hidden&&!document.querySelector('#pNew')&&(newColisModal(),!document.querySelector('#modal').classList.contains('on'))));
const direct=await q.evaluate(async()=>{const sb=window.supabase.createClient(FE_CONFIG.supabaseUrl,FE_CONFIG.supabaseAnonKey);
 const r=await sb.from('parcels').insert({tracking_number:'FE-PIRATE-1',tracking_token:'5b1c2d3e-4f5a-4b6c-8d7e-9f0a1b2c3d4e',client_name:'Pirate',client_phone:'',delivery_address:'x',status:'pending',partner_id:'p-1'});
 let app='';try{await window.FEDB.run('createParcel',{code:'FE-PIRATE-2',token:'6c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f',dest:{nom:'Pirate',tel:''},adresse:'x',x:0,y:0,partnerId:'p-1',hist:[]})}catch(e){app=e.message}
 return{err:r.error&&r.error.message,app,rows:__MOCKDB.parcels.filter(x=>/PIRATE/.test(x.tracking_number)).length}});
ok('Supabase : requête directe d\'insertion par le partenaire refusée (RLS)',/row-level security/.test(direct.err||'')&&direct.rows===0,JSON.stringify(direct));
ok('Supabase : l\'application refuse aussi la création côté partenaire',/Seule l'agence FAST EXPRESS/.test(direct.app));
// un colis créé par le manager pour ce partenaire apparaît automatiquement (temps réel coupé : relecture)
await q.evaluate(()=>{window.__PG_DOWN=true;__MOCKDB.parcels.push({id:'m1',tracking_number:'FE-26-30001',tracking_token:'7d3e4f5a-6b7c-4d8e-9f0a-1b2c3d4e5f6a',confirmation_code:'8888',client_name:'Laure Mintsa',client_phone:'+241 066 00 00 08',delivery_address:'Ancien Sobraga',status:'pending',driver_id:null,partner_id:'p-1',delivery_lat:0.41,delivery_lng:9.46,proof_photo_url:null,postponed_date:null,created_at:new Date().toISOString()});
 __MOCKDB.parcels.push({id:'m2',tracking_number:'FE-26-30002',tracking_token:'8e4f5a6b-7c8d-4e9f-8a1b-2c3d4e5f6a7b',confirmation_code:'9999',client_name:'Client Autre',client_phone:'',delivery_address:'x',status:'pending',driver_id:null,partner_id:'p-0',delivery_lat:0.41,delivery_lng:9.46,proof_photo_url:null,postponed_date:null,created_at:new Date().toISOString()})});
await q.waitForTimeout(4500);
ok('Supabase : colis créé par le manager → apparaît automatiquement chez le partenaire',await q.evaluate(()=>!!CO('FE-26-30001')&&/FE-26-30001/.test(document.querySelector('#view').textContent)));
ok('Supabase : le colis d\'un autre partenaire n\'apparaît pas',await q.evaluate(()=>!CO('FE-26-30002')&&!/FE-26-30002/.test(document.body.textContent)));
ok('Supabase : aucun code de remise affiché pour ce nouveau colis',await q.evaluate(()=>!/\b8888\b/.test(document.body.textContent)));
await q.evaluate(()=>{window.__PG_DOWN=false});
// mon entreprise : sans politique RLS partenaire → refus clair ; avec la politique 07 → enregistré
await q.evaluate(()=>{pEdit=false;location.hash='pentreprise'});await q.waitForTimeout(300);
ok('Supabase : adresse non modifiable tant que la colonne n\'existe pas',await q.evaluate(()=>/sera modifiable prochainement/.test(document.querySelector('#view').textContent)));
await q.click('#peEdit');await q.waitForTimeout(100);
ok('Supabase : pas de champ adresse (colonne absente)',await q.evaluate(()=>!document.querySelector('#peAddr')));
await q.fill('#pePhone','+241 062 00 00 00');await q.click('#peSave');await q.waitForTimeout(500);
ok('Supabase : modification refusée par RLS → message clair, rien changé',/non autorisée/.test(await q.$eval('#peErr',e=>e.textContent))&&await q.evaluate(()=>__MOCKDB.partners.find(x=>x.id==='p-1').contact_phone==='+241 074 10 20 30'));
const upd=await q.evaluate(()=>__MOCKLOG.filter(x=>x.t==='partners'&&x.op==='update').at(-1));
ok('Supabase : seules contact_name / contact_phone sont envoyées',upd&&Object.keys(upd.patch).sort().join(',')==='contact_name,contact_phone',JSON.stringify(upd));
await q.evaluate(()=>{window.__PARTNER_UPD_POLICY=true});
await q.click('#peSave');await q.waitForTimeout(500);
ok('Supabase : avec la politique 07 → enregistré dans partners',await q.evaluate(()=>__MOCKDB.partners.find(x=>x.id==='p-1').contact_phone==='+241 062 00 00 00'&&!document.querySelector('#peForm')));
ok('Supabase : la fiche d\'un autre partenaire reste intouchée',await q.evaluate(()=>__MOCKDB.partners.find(x=>x.id==='p-0').contact_phone==='+241 011 44 20 20'));
// relevés + historique en Supabase
await q.evaluate(()=>{PR.from=isoDay(Date.now()-29*864e5);PR.to=isoDay(Date.now());location.hash='preleves'});await q.waitForTimeout(300);
const [dl2]=await Promise.all([q.waitForEvent('download'),q.click('#prCsv')]);const csv2=fs.readFileSync(await dl2.path(),'utf8');
ok('Supabase : export CSV sans code de remise ni montant inventé',!/;(1111|2222|3333|4444|5555|6666)(;|\r|$)/.test(csv2)&&!/Montant/.test(csv2)&&/FE-26-20005/.test(csv2));
await q.evaluate(()=>{PH={q:'',s:'tous',p:'tout'};location.hash='phisto'});await q.waitForTimeout(300);
ok('Supabase : historique (livré, échec, reporté)',await q.evaluate(()=>{const t=document.querySelector('#view').textContent;return/FE-26-20005/.test(t)&&/FE-26-20003/.test(t)&&/FE-26-20004/.test(t)&&!/FE-26-20002/.test(t)}));
// manager Supabase : inchangé
await q.evaluate(()=>logout());await q.waitForTimeout(500);
await q.fill('#lg1','manager@test.ga');await q.fill('#lg2','secret');await q.click('#lgGo');await q.waitForTimeout(1200);
ok('Supabase : manager → tableau de bord habituel',await q.evaluate(()=>AUTH.role==='manager'&&cur==='tableau'));
await q.evaluate(()=>openColis('FE-26-20002'));await q.waitForTimeout(300);
ok('Supabase : manager voit toujours le code de remise',await q.evaluate(()=>/2222/.test(document.querySelector('#drOtpBox')?.textContent||'')));
await q.evaluate(()=>closeAll());
await q.click('#newBtn');await q.waitForTimeout(200);
await q.selectOption('#nc1','p-1');await q.fill('#nc3','Ornella Koumba');await q.fill('#nc4','+241 077 88 99 00');if(await q.$('#nc12'))await q.fill('#nc12','0.4115, 9.4335');await q.fill('#nc6','Résidence Les Palmiers');
await q.click('#ncSave');await q.waitForTimeout(900);
const mins=await q.evaluate(()=>({ins:__MOCKLOG.filter(x=>x.t==='parcels'&&x.op==='insert'&&x.row).at(-1),rls:__MOCKLOG.filter(x=>x.t==='parcels'&&x.rls).length,c:S.colis.find(c=>c.dest.nom==='Ornella Koumba')}));
ok('Supabase : le manager crée un colis associé au partenaire choisi (accepté par la règle 08)',mins.ins&&mins.ins.row.partner_id==='p-1'&&mins.ins.row.client_name==='Ornella Koumba'&&mins.c&&!!mins.c.dbId,JSON.stringify(mins.ins&&mins.ins.row).slice(0,200));
const mcode=mins.c&&mins.c.code;
await q.evaluate(()=>logout());await q.waitForTimeout(500);
await q.fill('#lg1','gts@test.ga');await q.fill('#lg2','secret');await q.click('#lgGo');await q.waitForTimeout(1200);
ok('Supabase : ce colis est dans l\'espace du partenaire (Mes colis)',await q.evaluate(c=>{location.hash='colis';return!!CO(c)&&CO(c).partnerId==='p-1'},mcode)&&(await q.waitForTimeout(300),/Ornella Koumba/.test(await view(q))));
await cs.close();

const real=errs.filter(e=>!/simulated failure/.test(e));ok('Aucune erreur JavaScript (hors panne simulée volontaire)',real.length===0,real.join(' | '));
await b.close();
console.log(`\n${pass} réussis, ${fail} échoués`);process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
