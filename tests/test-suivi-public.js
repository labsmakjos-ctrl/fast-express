/* Suivi public individuel (mode Supabase simulé) : une page par colis, ouverte par son lien,
   construite UNIQUEMENT avec la réponse de track_parcel. Actualisation raccourcie à 3 s pour le test. */
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
const D=__dirname+'/';const CAP=path.join(__dirname,'captures')+'/';fs.mkdirSync(CAP,{recursive:true});
const BASE='http://localhost:8765/index.html';const SB=BASE+'?mode=supabase';
let pass=0,fail=0;const ok=(n,c,i='')=>{c?pass++:fail++;console.log((c?'OK   ':'ÉCHEC')+' '+n+(i?' — '+String(i).slice(0,220):''))};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const UUIDRE=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
(async()=>{
const b=await chromium.launch();const errs=[];
const realCfg=fs.readFileSync(path.join(__dirname,'..','js','config.js'),'utf8');
if(!/mode: 'demo'/.test(realCfg))throw new Error('config.js : le site doit rester en démo par défaut');
const cfg=realCfg.replace(/supabaseAnonKey: '[^']*'/,"supabaseAnonKey: 'sb_publishable_TEST'").replace(/publicRefreshMs: \d+/,'publicRefreshMs: 3000');
const mock=fs.readFileSync(D+'mock-supabase.js','utf8');
const track=pg=>{pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|ERR_|tile/.test(m.text()))errs.push(m.text())})};
async function ctxWith(db,opts={}){const c=await b.newContext(Object.assign({viewport:{width:1300,height:850}},opts));
 await c.route('**/js/config.js',r=>r.fulfill({contentType:'application/javascript',body:cfg}));
 await c.route('**/vendor/supabase.js',r=>r.fulfill({contentType:'application/javascript',body:mock}));
 await c.route(/tile\.openstreetmap\.org/,r=>r.fulfill({status:204,body:''}));    // pas de réseau externe pendant le test
 if(db)await c.addInitScript(j=>{if(!sessionStorage.getItem('__dbset')){localStorage.setItem('__mockdb',j);sessionStorage.setItem('__dbset','1')}},JSON.stringify(db));
 return c}

/* ---------- Jeu de données de test (dans le faux Supabase uniquement) ---------- */
const c0=await ctxWith(null);const p0=await c0.newPage();await p0.goto(SB);await p0.waitForTimeout(500);
const db=await p0.evaluate(()=>JSON.parse(JSON.stringify(__MOCKDB)));await c0.close();
const now=Date.now(),iso=t=>new Date(t).toISOString();
const T={P1:'1b4e28ba-2fa1-4d2a-883f-0016d3cca427',P2:'6fa459ea-ee8a-4ca4-894e-db77e160355e',P3:'9c858901-8a57-4791-81fe-4c455b099bc9',P4:'0e8a2f1c-7b3d-4f5e-9a6b-1c2d3e4f5a6b',P5:'4d3c2b1a-0f9e-4d8c-b7a6-958473625140',UNK:'00000000-0000-4000-8000-000000000000',TOK:'tok_0123456789abcdef0123456789abcdef'};
db.profiles.push({id:'u-d3',full_name:'Junior Mve',phone:'+241 077 99 88 77',role:'driver'});
db.drivers.push({id:'d-3',profile_id:'u-d3',vehicle_type:'Scooter',vehicle_plate:'HB-1',zone:'Louis',is_on_duty:false,consent_at:iso(now-9e8)});
db.drivers.find(d=>d.id==='d-1').is_on_duty=true;db.drivers.find(d=>d.id==='d-2').is_on_duty=true;
const P=(id,tn,tok,status,drv,partner,extra={})=>Object.assign({id,tracking_number:tn,tracking_token:tok,confirmation_code:'7319',client_name:'Gaëlle Nguema',client_phone:'+241 066 12 34 56',delivery_address:'Derrière la pharmacie Mont-Bouët',status,driver_id:drv,partner_id:partner,delivery_lat:0.4012,delivery_lng:9.4618,proof_photo_url:null,postponed_date:null,created_at:iso(now-3*36e5)},extra);
db.parcels.push(P('q1','FE-261118-NMYZ',T.P1,'in_transit','d-1','p-1'),P('q2','FE-261118-ABCD',T.P2,'picked_up','d-2','p-0',{client_name:'Brice Ndong',client_phone:'+241 074 55 44 33'}),
 P('q3','FE-261118-STAL',T.P3,'in_transit','d-2','p-1'),P('q4','FE-261118-OFFD',T.P4,'in_transit','d-3','p-1'),P('q5','FE-261118-LIVR',T.P5,'delivered','d-1','p-1',{delivered_at:iso(now-36e5)}),
 P('q6','EXP-202610-001',T.TOK,'in_transit','d-1','p-1'));
const E=(pid,status,reason,t)=>({id:'e'+Math.random().toString(36).slice(2,8),parcel_id:pid,author_id:'u-mgr',author_role:'manager',status,reason,lat:0.38,lng:9.44,created_at:iso(t)});
db.parcel_events.push(E('q1','pending','Colis enregistré',now-3*36e5),E('q1','pending','Attribué automatiquement à Rodrigue Ondo : plus proche',now-2.5*36e5),E('q1','picked_up','Colis récupéré à l\'agence',now-2*36e5),E('q1','in_transit','En route',now-36e5),
 E('q2','pending','Colis enregistré',now-3*36e5),E('q2','pending','Attribué manuellement à Prisca Mba',now-2*36e5),E('q2','picked_up','Récupéré',now-18e5),
 E('q5','pending','Colis enregistré',now-5*36e5),E('q5','delivered','Remis au client, code vérifié',now-36e5));
const L=(drv,lat,lng,ago,acc=12)=>({id:'l'+Math.random().toString(36).slice(2,8),driver_id:drv,lat,lng,accuracy:acc,speed:null,heading:null,battery_level:70,is_charging:false,recorded_at:iso(now-ago),created_at:iso(now-ago)});
db.driver_locations.push(L('d-1',0.3700,9.4400,20*6e4),L('d-1',0.3900,9.4500,6e4),L('d-2',0.4100,9.4700,25*6e4),L('d-3',0.4000,9.4600,3e4));

/* ---------- 1. Navigation privée : un lien = une fiche ---------- */
const priv=await ctxWith(db);const pg=await priv.newPage();track(pg);
await pg.goto(SB+'&suivi='+T.P1);await pg.waitForTimeout(1500);
const r1=await pg.evaluate(()=>({MODE,cur,auth:AUTH,solo:document.body.classList.contains('solo'),code:document.querySelector('#pubCode')?.textContent,txt:document.querySelector('#view').innerText,form:!!document.querySelector('#pIn'),ex:document.querySelectorAll('[data-ex]').length,rail:getComputedStyle(document.querySelector('.rail')).display}));
ok('Navigation privée, sans compte : le lien ouvre directement la fiche FE-261118-NMYZ',r1.MODE==='supabase'&&r1.cur==='suivi'&&r1.auth===null&&r1.solo&&r1.code==='FE-261118-NMYZ'&&r1.rail==='none',JSON.stringify({...r1,txt:undefined}));
ok('Aucune saisie demandée : ni formulaire, ni exemples de démonstration',!r1.form&&r1.ex===0&&!/FE-26-1\d{4}/.test(r1.txt));
ok('Données réelles de la fonction : statut, expéditeur, prénom du livreur et véhicule',/Votre colis est en route/.test(r1.txt)&&/Gabon Tech Store/.test(r1.txt)&&/Rodrigue · Moto/.test(r1.txt)&&/Colis récupéré par le livreur/.test(r1.txt)&&/Un livreur FAST EXPRESS a été désigné/.test(r1.txt));
const rpc1=await pg.evaluate(()=>({rpc:(window.__MOCKRPC||[]).map(x=>x.name+':'+x.args.p_token),sel:(window.__MOCKSEL||[]).length}));
ok('Le jeton du lien est envoyé à track_parcel, et aucune table n\'est lue directement',rpc1.rpc.length>=1&&rpc1.rpc.every(x=>x==='track_parcel:'+T.P1)&&rpc1.sel===0,JSON.stringify(rpc1));
const priv1=await pg.evaluate(()=>document.querySelector('#view').innerText+' '+document.querySelector('#view').innerHTML);
ok('Aucune information du client ni code de remise ni nom complet du livreur dans la page',!/Gaëlle|Nguema|066 12 34 56|Derrière la pharmacie|Mont-Bouët|7319|Ondo/.test(priv1));
const m1=await pg.evaluate(()=>({map:!!PUB.map,mk:PUB.mk&&PUB.mk.getLatLng(),note:document.querySelector('#pubMapNote').innerText,dest:document.querySelectorAll('.leaflet-interactive').length,lmk:document.querySelectorAll('.pub-mk').length}));
ok('Carte : marqueur du livreur à sa dernière position récente (pas l\'ancienne)',m1.map&&m1.mk&&Math.abs(m1.mk.lat-0.39)<1e-6&&Math.abs(m1.mk.lng-9.45)<1e-6&&m1.lmk===1&&/Position du livreur à/.test(m1.note),JSON.stringify(m1));
ok('Aucune destination sur la carte (seulement le livreur et son cercle de précision)',m1.dest<=1);
await pg.screenshot({path:CAP+'s1-suivi-public-ordinateur.png'});
// ---- deuxième colis : autre fiche, autres données
await pg.goto(SB+'&suivi='+T.P2);await pg.waitForTimeout(1300);
const r2=await pg.evaluate(()=>({code:document.querySelector('#pubCode')?.textContent,txt:document.querySelector('#view').innerText,mapHidden:document.querySelector('#pubMapCard').hidden,map:!!PUB.map}));
ok('Un autre lien ouvre une autre fiche avec ses propres données (FE-261118-ABCD, Prisca, Comptoir agence)',r2.code==='FE-261118-ABCD'&&/Votre colis a été récupéré/.test(r2.txt)&&/Prisca · Scooter/.test(r2.txt)&&/Comptoir agence/.test(r2.txt)&&!/NMYZ|Rodrigue/.test(r2.txt),r2.code);
ok('Colis pas encore en route : aucune carte ni position',r2.mapHidden&&!r2.map);
// ---- position trop ancienne / livreur hors service / livré
await pg.goto(SB+'&suivi='+T.P3);await pg.waitForTimeout(1300);
const r3=await pg.evaluate(()=>({mk:!!PUB.mk,box:document.querySelector('#pubMap').hidden,note:document.querySelector('#pubMapNote').innerText}));
ok('En route mais dernière position de 25 min : aucun marqueur, message « momentanément indisponible »',!r3.mk&&r3.box&&/momentanément indisponible/.test(r3.note),JSON.stringify(r3));
await pg.goto(SB+'&suivi='+T.P4);await pg.waitForTimeout(1300);
ok('En route mais livreur hors service (position récente) : aucun marqueur',await pg.evaluate(()=>!PUB.mk&&/momentanément indisponible/.test(document.querySelector('#pubMapNote').innerText)));
await pg.goto(SB+'&suivi='+T.P5);await pg.waitForTimeout(1300);
ok('Colis livré : heure réelle de remise affichée, sans carte',await pg.evaluate(()=>/Colis livré/.test(document.querySelector('#pubHero').innerText)&&/Remis le/.test(document.querySelector('#pubHero').innerText)&&document.querySelector('#pubMapCard').hidden));
// ---- liens non valides
for(const [lab,t] of [['UUID inconnu',T.UNK],['jeton « tok_ » (ancien colis de test)',T.TOK],['numéro de suivi seul','FE-261118-NMYZ']]){
 await pg.goto(SB+'&suivi='+encodeURIComponent(t));await pg.waitForTimeout(1100);
 ok('Lien non valide ('+lab+') : message clair, aucune donnée, aucun colis de démonstration',await pg.evaluate(()=>/n'est pas valide/.test(document.querySelector('#view').innerText)&&!document.querySelector('#pubCode')&&!/FE-26-1\d{4}/.test(document.body.innerText)&&MODE==='supabase'))}
// ---- service indisponible
await pg.evaluate(()=>{window.__RPC_DOWN=true;PUB.token=null;R.suivi()});await pg.waitForTimeout(800);
ok('Fonction injoignable : « Suivi momentanément indisponible », rien d\'inventé',await pg.evaluate(()=>/momentanément indisponible/.test(document.querySelector('#view').innerText)&&!document.querySelector('#pubCode')));
// ---- actualisation automatique
await pg.goto(SB+'&suivi='+T.P1);await pg.waitForTimeout(1300);
await pg.evaluate(()=>{window.__map0=PUB.map;const n=Date.now();__MOCKDB.driver_locations.push({id:'lnew',driver_id:'d-1',lat:0.3950,lng:9.4550,accuracy:8,speed:null,heading:null,battery_level:70,is_charging:false,recorded_at:new Date(n).toISOString(),created_at:new Date(n).toISOString()})});
await wait(4200);
const r6=await pg.evaluate(()=>({mk:PUB.mk&&PUB.mk.getLatLng(),same:PUB.map===window.__map0,calls:(window.__MOCKRPC||[]).length}));
ok('Actualisation automatique : nouvelle position reçue, marqueur déplacé sans recharger la carte',r6.mk&&Math.abs(r6.mk.lat-0.395)<1e-6&&r6.same&&r6.calls>=2,JSON.stringify(r6));
await pg.evaluate(()=>{const o=new Date(Date.now()-11*6e4).toISOString();__MOCKDB.driver_locations.filter(l=>l.driver_id==='d-1').forEach(l=>{l.recorded_at=o;l.created_at=o})});
await wait(4200);
ok('Position devenue trop ancienne : marqueur retiré à l\'actualisation (aucune position conservée)',await pg.evaluate(()=>!PUB.mk&&/momentanément indisponible/.test(document.querySelector('#pubMapNote').innerText)));
// ---- âge local : une position reçue à 9 min 45 s disparaît d'elle-même après 10 min, même sans réponse du serveur
await pg.evaluate(()=>{__MOCKDB.driver_locations.push({id:'lold',driver_id:'d-1',lat:0.3960,lng:9.4560,accuracy:8,speed:null,heading:null,battery_level:70,is_charging:false,recorded_at:new Date(Date.now()-585e3).toISOString(),created_at:new Date(Date.now()-585e3).toISOString()})});
await wait(3600);const shown=await pg.evaluate(()=>!!PUB.mk);
await pg.evaluate(()=>{window.__RPC_DOWN=true});await wait(15000);
ok('Sans réponse du serveur, la position n\'est pas gardée au-delà de 10 min',shown&&await pg.evaluate(()=>!PUB.mk&&/Connexion perdue/.test(document.querySelector('#pubFoot').innerText)),'affichée avant : '+shown);
await pg.evaluate(()=>{window.__RPC_DOWN=false});
// ---- pause quand la page est cachée
const before=await pg.evaluate(()=>(window.__MOCKRPC||[]).length);
await pg.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>'hidden'})});await wait(4000);
const hiddenCalls=await pg.evaluate(()=>(window.__MOCKRPC||[]).length)-before;
await pg.evaluate(()=>{delete document.visibilityState});
ok('Page cachée : aucune actualisation (économie de données)',hiddenCalls===0,'appels pendant la pause : '+hiddenCalls);
await priv.close();

/* ---------- 2. Gestionnaire déjà connecté dans le même navigateur ---------- */
const mc=await ctxWith(db);const mp=await mc.newPage();track(mp);
await mp.goto(SB);await mp.waitForTimeout(500);await mp.fill('#lg1','manager@test.ga');await mp.fill('#lg2','secret');await mp.click('#lgGo');await mp.waitForTimeout(1200);
const link=await mp.evaluate(code=>{const c=S.colis.find(x=>x.code===code);return trackUrl(c)},'FE-261118-NMYZ');
ok('Lien généré par l\'application : ?mode=supabase&suivi=<jeton>',link===BASE+'?mode=supabase&suivi='+T.P1,link);
await mp.goto(link);await mp.waitForTimeout(1500);
const rm=await mp.evaluate(()=>({auth:AUTH&&AUTH.role,cur,solo:document.body.classList.contains('solo'),code:document.querySelector('#pubCode')?.textContent,rail:getComputedStyle(document.querySelector('.rail')).display}));
ok('Gestionnaire connecté : le lien ouvre quand même la fiche publique du colis',rm.auth==='manager'&&rm.cur==='suivi'&&rm.solo&&rm.code==='FE-261118-NMYZ'&&rm.rail==='none',JSON.stringify(rm));
await mp.goto(SB+'#colis');await mp.waitForTimeout(1200);
await mp.evaluate(()=>openColis('FE-261118-NMYZ'));await mp.waitForTimeout(300);
const [pop]=await Promise.all([mp.waitForEvent('popup',{timeout:4000}).catch(()=>null),mp.click('#drPub')]);
ok('« Voir le suivi public » ouvre la vraie page publique du colis dans un nouvel onglet',!!pop&&pop.url()===link,pop&&pop.url());
if(pop)await pop.close();
await mp.evaluate(()=>{closeAll();location.hash='suivi'});await mp.waitForTimeout(600);
ok('Menu « Suivi client » (Supabase) : explication, aucune donnée de démonstration',await mp.evaluate(()=>/Chaque colis a sa propre page de suivi/.test(document.querySelector('#view').innerText)&&!/FE-26-1\d{4}/.test(document.querySelector('#view').innerText)));
await mc.close();

/* ---------- 3. Téléphone ---------- */
const ph=await ctxWith(db,{viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});const pp=await ph.newPage();track(pp);
await pp.goto(SB+'&suivi='+T.P1);await pp.waitForTimeout(1500);
const rp=await pp.evaluate(()=>{const m=document.querySelector('#pubMap').getBoundingClientRect();return{over:document.documentElement.scrollWidth-innerWidth,mh:Math.round(m.height),mw:Math.round(m.width),mk:!!PUB.mk}});
ok('Téléphone : aucune barre de défilement horizontale, carte lisible',rp.over<=0&&rp.mh>=240&&rp.mw>=300&&rp.mk,JSON.stringify(rp));
await pp.screenshot({path:CAP+'s2-suivi-public-telephone.png',fullPage:true});
await ph.close();

/* ---------- 4. Générateur de jeton ---------- */
const gc=await ctxWith(null);const gp=await gc.newPage();await gp.goto(SB);await gp.waitForTimeout(400);
const g=await gp.evaluate(()=>{const out={};const mr=Math.random;let called=0;Math.random=()=>{called++;return mr()};
 out.a=uuid();const C=window.crypto;
 Object.defineProperty(window,'crypto',{configurable:true,get:()=>({getRandomValues:a=>C.getRandomValues(a)})});out.b=uuid();
 Object.defineProperty(window,'crypto',{configurable:true,get:()=>({})});try{uuid();out.c='aucune erreur'}catch(e){out.c=e.message}
 Object.defineProperty(window,'crypto',{configurable:true,get:()=>C});out.called=called;Math.random=mr;return out});
ok('Jetons : UUID v4 via crypto.randomUUID, puis via crypto.getRandomValues',UUIDRE.test(g.a)&&UUIDRE.test(g.b)&&g.a!==g.b,JSON.stringify(g));
ok('Sans générateur sûr : refus explicite, Math.random() jamais utilisé',/générateur aléatoire sécurisé/.test(g.c)&&g.called===0,g.c);
await gc.close();

/* ---------- 5. Mode démo inchangé ---------- */
const dc=await b.newContext({viewport:{width:1300,height:850}});const dp=await dc.newPage();track(dp);
await dp.goto(BASE);await dp.waitForTimeout(600);
const dtok=await dp.evaluate(()=>S.colis.find(c=>c.statut==='en_cours').token);
await dp.goto(BASE+'?suivi='+dtok);await dp.waitForTimeout(800);
const rd=await dp.evaluate(()=>({MODE,cur,big:!!document.querySelector('.big-st'),form:!!document.querySelector('#pIn'),ex:document.querySelectorAll('[data-ex]').length,eta:/Arrivée estimée/.test(document.body.innerText),fake:/fastexpress\.ga/.test(document.body.innerText)}));
ok('Démo : suivi par lien et par numéro toujours disponibles',rd.MODE==='demo'&&rd.cur==='suivi'&&rd.big&&rd.form&&rd.ex>0,JSON.stringify(rd));
ok('Démo : plus d\'heure d\'arrivée inventée ni d\'adresse fictive',!rd.eta&&!rd.fake);
ok('Démo : lien de suivi sans mode Supabase',await dp.evaluate(()=>{const c=S.colis[0];return trackUrl(c)===location.origin+location.pathname+'?suivi='+c.token}));
await dc.close();

ok('Aucune erreur JavaScript',errs.length===0,errs.join(' | '));
console.log(`\n${pass} réussis, ${fail} échoués`);
await b.close();
})();
