/* Envoi AUTOMATIQUE de la position du livreur (mode Supabase simulé, puis mode démo).
   Délais raccourcis pour le test : envoi de sécurité toutes les 8 s au lieu de 2 min. */
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
const D=__dirname+'/';
const BASE='http://localhost:8765/index.html';const URL=BASE+'?mode=supabase';
let pass=0,fail=0;const ok=(n,c,i='')=>{c?pass++:fail++;console.log((c?'OK   ':'ÉCHEC')+' '+n+(i?' — '+String(i).slice(0,220):''))};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const LAT=0.3801,LNG=9.4452;
(async()=>{
const b=await chromium.launch();const errs=[];
const realCfg=fs.readFileSync(path.join(__dirname,'..','js','config.js'),'utf8');
const cfg=realCfg.replace("supabaseAnonKey: ''","supabaseAnonKey: 'sb_publishable_TEST'")
 .replace(/gpsIntervalMs: \d+/,'gpsIntervalMs: 8000').replace(/gpsMinGapMs: \d+/,'gpsMinGapMs: 1500').replace(/livePollMs: \d+/,'livePollMs: 2000');
const fast=realCfg.replace(/gpsIntervalMs: \d+/,'gpsIntervalMs: 8000').replace(/gpsMinGapMs: \d+/,'gpsMinGapMs: 1500');
/* Hors connexion simulé pour UN onglet (le livreur) : navigator.onLine + événements offline/online */
const net=(pg,on)=>pg.evaluate(on=>{window.__OFF=!on;if(!window.__netPatched){window.__netPatched=1;Object.defineProperty(Navigator.prototype,'onLine',{configurable:true,get(){return!window.__OFF}})}window.dispatchEvent(new Event(on?'online':'offline'))},on);
const track=pg=>{pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|ERR_|tile/.test(m.text()))errs.push(m.text())})};

/* =================== Mode Supabase simulé =================== */
const ctx=await b.newContext({viewport:{width:1300,height:850},permissions:['geolocation'],geolocation:{latitude:LAT,longitude:LNG,accuracy:9}});
await ctx.route('**/js/config.js',r=>r.fulfill({contentType:'application/javascript',body:cfg}));
await ctx.route('**/vendor/supabase.js',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(D+'mock-supabase.js','utf8')}));
const pD=await ctx.newPage();track(pD);
await pD.goto(URL);await pD.evaluate(()=>localStorage.clear());await pD.reload();await pD.waitForTimeout(500);
await pD.evaluate(()=>{__MOCKDB.drivers.find(d=>d.id==='d-1').is_on_duty=false;localStorage.setItem('__mockdb',JSON.stringify(__MOCKDB))});await pD.reload();await pD.waitForTimeout(500);
await pD.fill('#lg1','rodrigue@test.ga');await pD.fill('#lg2','secret');await pD.click('#lgGo');await pD.waitForTimeout(1200);
const pM=await ctx.newPage();track(pM);
await pM.addInitScript(()=>{try{localStorage.removeItem('__mocksession')}catch(e){}});
await pM.goto(URL);await pM.waitForTimeout(500);await pM.fill('#lg1','manager@test.ga');await pM.fill('#lg2','secret');await pM.click('#lgGo');await pM.waitForTimeout(1000);
await pM.evaluate(()=>{location.hash='carte';window.__sansRechargement=1});await pM.waitForTimeout(900);
const rows=()=>pD.evaluate(()=>__MOCKDB.driver_locations.filter(r=>r.driver_id==='d-1'));
const mgrPos=()=>pM.evaluate(()=>{const l=LV('d-1');const g=l.pos?toLL(l.pos.x,l.pos.y):null;const m=LMK['d-1'];return{lat:g&&g.lat,mk:m?m.getLatLng().lat:null,duty:l.statut,same:window.__sansRechargement===1}});
const near=(a,b2)=>a!=null&&Math.abs(a-b2)<2e-5;

ok('Livreur hors service au départ, un seul bouton « Passer en service »',await pD.evaluate(()=>me().statut==='hors_service'&&!!document.querySelector('#dutyOn')));
const n0=(await rows()).length;
await pD.click('#dutyOn');await pD.waitForTimeout(1500);
let r=await rows();
ok('1 clic « Passer en service » : en service, première position RÉELLE enregistrée',await pD.evaluate(()=>__MOCKDB.drivers.find(d=>d.id==='d-1').is_on_duty===true&&GPS.watch!=null)&&r.length===n0+1&&near(r[r.length-1].lat,LAT),JSON.stringify(r[r.length-1]));
ok('Plus aucun bouton « Envoyer » côté livreur',await pD.evaluate(()=>!document.querySelector('#gpsNow')&&![...document.querySelectorAll('#drv button')].some(x=>/envoyer/i.test(x.textContent))&&/transmise automatiquement/.test(document.querySelector('#gpsCard').innerText)));
await ctx.setGeolocation({latitude:LAT+0.001,longitude:LNG,accuracy:9});await wait(2500);
r=await rows();
ok('Déplacement de 110 m → position transmise SANS clic (watchPosition)',r.length===n0+2&&near(r[r.length-1].lat,LAT+0.001),r.length-n0);
let m=await mgrPos();
ok('Gestionnaire : nouvelle position reçue, marqueur déplacé sur la carte, sans recharger la page',near(m.lat,LAT+0.001)&&near(m.mk,LAT+0.001)&&m.same,JSON.stringify(m));
await ctx.setGeolocation({latitude:LAT+0.00103,longitude:LNG,accuracy:9});await wait(2500);
ok('Petit mouvement (3 m, bruit GPS) → aucune écriture inutile',(await rows()).length===n0+2);
await wait(6500);
r=await rows();
ok('Immobile : envoi de sécurité automatique après l\'intervalle (position réelle fraîche)',r.length===n0+3&&near(r[r.length-1].lat,LAT+0.00103)&&Date.now()-Date.parse(r[r.length-1].recorded_at)<10000,JSON.stringify(r[r.length-1]));
// ---- perte de connexion ----
await net(pD,false);await pD.waitForTimeout(300);
ok('Hors ligne : état clairement affiché au livreur',await pD.evaluate(()=>!!document.querySelector('#gpsOffline')&&/Pas de connexion Internet/.test(document.querySelector('#gpsCard').innerText)&&/Hors ligne/.test(document.querySelector('#gpsHead').textContent)));
const nOff=(await rows()).length;
await ctx.setGeolocation({latitude:LAT+0.002,longitude:LNG,accuracy:9});await wait(2200);
await ctx.setGeolocation({latitude:LAT+0.003,longitude:LNG,accuracy:9});await wait(2200);
const q=await pD.evaluate(()=>GPS.q.length);
ok('Hors ligne : positions réelles gardées en attente, rien de perdu',(await rows()).length===nOff&&q>=2&&await pD.evaluate(()=>/positions en attente/.test(document.querySelector('#gpsOffline').innerText)),'en attente : '+q);
const req0=await pD.evaluate(()=>(window.__REQ||[]).filter(x=>x.t==='driver_locations').length);
await net(pD,true);await pD.waitForTimeout(1500);
r=await rows();const reqs=await pD.evaluate(()=>(window.__REQ||[]).filter(x=>x.t==='driver_locations'));
ok('Retour de la connexion : reprise automatique, positions en attente envoyées en UNE requête',r.length>=nOff+q&&reqs.length===req0+1&&reqs[reqs.length-1].n>=q&&near(r[r.length-1].lat,LAT+0.003)&&await pD.evaluate(()=>GPS.q.length===0&&!document.querySelector('#gpsOffline')),JSON.stringify(reqs.slice(-2)));
await pM.waitForTimeout(500);m=await mgrPos();
ok('Gestionnaire : dernière position reçue après la reconnexion',near(m.lat,LAT+0.003)&&near(m.mk,LAT+0.003),JSON.stringify(m));
// ---- temps réel des tables coupé : relecture de sécurité ----
await pM.evaluate(()=>{window.__PG_DOWN=true});
await ctx.setGeolocation({latitude:LAT+0.005,longitude:LNG,accuracy:9});await wait(4500);
m=await mgrPos();
ok('Temps réel de driver_locations indisponible → le gestionnaire reçoit quand même (relecture 30 s, ici 2 s)',near(m.lat,LAT+0.005)&&near(m.mk,LAT+0.005)&&m.same,JSON.stringify(m));
await pM.evaluate(()=>{window.__PG_DOWN=false});
// ---- « Demander la position » ----
await pM.evaluate(()=>location.hash='livreurs');await pM.waitForTimeout(700);
await pM.click('[data-req="d-1"]');await pM.waitForTimeout(2500);
const rq=await pM.evaluate(()=>GPSREQ['d-1']);
ok('« Demander la position » fonctionne toujours (Broadcast → reçue, position envoyée)',rq&&rq.received===true&&rq.state==='sent',JSON.stringify(rq));
// ---- fin de service ----
await pD.evaluate(()=>{drvTab='profil';drvDetail=null;R.livreur()});await pD.click('#dutyOff');await pD.waitForTimeout(800);
const nEnd=(await rows()).length;
await ctx.setGeolocation({latitude:LAT+0.008,longitude:LNG,accuracy:9});await wait(9500);
ok('Fin de service : suivi GPS arrêté, is_on_duty = false, plus aucun envoi',await pD.evaluate(()=>GPS.watch==null&&GPS.timer==null&&__MOCKDB.drivers.find(d=>d.id==='d-1').is_on_duty===false)&&(await rows()).length===nEnd);
await pM.waitForTimeout(2500);
ok('Gestionnaire : livreur vu hors service',(await mgrPos()).duty==='hors_service');
// ---- déconnexion pendant le service ----
await pD.evaluate(()=>{drvTab='missions';R.livreur()});await pD.click('#dutyOn');await pD.waitForTimeout(1500);
await pD.evaluate(()=>logout());await pD.waitForTimeout(800);
const nOut=(await rows()).length;
await ctx.setGeolocation({latitude:LAT+0.01,longitude:LNG,accuracy:9});await wait(9500);
ok('Déconnexion : suivi arrêté, is_on_duty = false, plus aucun envoi',await pD.evaluate(()=>GPS.watch==null&&GPS.timer==null&&AUTH===null&&__MOCKDB.drivers.find(d=>d.id==='d-1').is_on_duty===false)&&(await rows()).length===nOut);
const all=await pD.evaluate(()=>(window.__REQ||[]).filter(x=>x.t==='driver_locations').length);
console.log('      écritures driver_locations pendant le test : '+all+' requêtes');
ok('Aucune colonne inconnue envoyée',(await pD.evaluate(()=>__MOCKLOG.filter(x=>x.error))).length===0);
await ctx.close();

/* =================== Mode démo =================== */
const dc=await b.newContext({viewport:{width:1300,height:850},permissions:['geolocation'],geolocation:{latitude:0.3905,longitude:9.4570,accuracy:12}});
await dc.route('**/js/config.js',r=>r.fulfill({contentType:'application/javascript',body:fast}));
const dD=await dc.newPage();const dM=await dc.newPage();track(dD);track(dM);
await dD.goto(BASE);await dD.evaluate(()=>localStorage.clear());await dD.reload();await dD.waitForTimeout(500);
await dD.click('[data-u="davy.obiang@fastexpress.demo"]');await dD.click('#lgGo');await dD.waitForTimeout(1500);
const dId=await dD.evaluate(async()=>{setSim(false);if(onDuty(me()))await goOffDuty(false);return AUTH.driverId});
await dM.addInitScript(()=>{try{localStorage.removeItem('fastexpress-app-session')}catch(e){}});
await dM.goto(BASE);await dM.waitForTimeout(500);await dM.click('[data-u="manager@fastexpress.demo"]');await dM.click('#lgGo');await dM.waitForTimeout(700);
await dM.evaluate(()=>{setSim(false);location.hash='carte';window.__sansRechargement=1});await dM.waitForTimeout(900);
const dPos=()=>dM.evaluate(id=>{const l=LV(id);const g=l.pos?toLL(l.pos.x,l.pos.y):null;const m=LMK[id];return{lat:g&&g.lat,mk:m?m.getLatLng().lat:null,duty:l.statut,same:window.__sansRechargement===1}},dId);
await dD.click('#dutyOn');await dD.waitForTimeout(1500);
ok('Démo : 1 clic « Passer en service », sans bouton « Envoyer »',await dD.evaluate(()=>me().statut==='disponible'&&GPS.watch!=null&&!document.querySelector('#gpsNow')));
await dc.setGeolocation({latitude:0.3925,longitude:9.4570,accuracy:12});await wait(2500);
let dm=await dPos();
ok('Démo : déplacement transmis seul, marqueur déplacé chez le gestionnaire sans recharger',near(dm.lat,0.3925)&&near(dm.mk,0.3925)&&dm.same,JSON.stringify(dm));
await net(dD,false);await dD.waitForTimeout(300);
await dc.setGeolocation({latitude:0.3945,longitude:9.4570,accuracy:12});await wait(2500);
dm=await dPos();
ok('Démo : hors ligne affiché, position gardée en attente (non transmise)',near(dm.lat,0.3925)&&await dD.evaluate(()=>!!document.querySelector('#gpsOffline')&&GPS.q.length>=1),JSON.stringify(dm));
await net(dD,true);await wait(1500);
dm=await dPos();
ok('Démo : reprise automatique au retour de la connexion',near(dm.lat,0.3945)&&near(dm.mk,0.3945)&&await dD.evaluate(()=>GPS.q.length===0),JSON.stringify(dm));
await dD.click('[data-dtab="profil"]');await dD.click('#dutyOff');await dD.waitForTimeout(600);
ok('Démo : fin de service → suivi arrêté',await dD.evaluate(()=>GPS.watch==null&&GPS.timer==null&&me().statut==='hors_service'));
await dc.close();
ok('Aucune erreur JavaScript',errs.length===0,errs.join(' | '));
console.log(`\n${pass} réussis, ${fail} échoués`);
await b.close();
})();
