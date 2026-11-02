const {chromium}=require('playwright');const fs=require('fs');
const D=__dirname+'/';
const URL='http://localhost:8765/index.html';
let pass=0,fail=0;const ok=(n,c,i='')=>{c?pass++:fail++;console.log((c?'OK   ':'ÉCHEC')+' '+n+(i?' — '+String(i).slice(0,200):''))};
(async()=>{
const b=await chromium.launch();const errs=[];
const ctx=await b.newContext({viewport:{width:1400,height:900},permissions:['geolocation'],geolocation:{latitude:0.3801,longitude:9.4452,accuracy:9}});
// configuration mode Supabase + faux Supabase à la place de la bibliothèque
const cfg=fs.readFileSync(require('path').join(__dirname,'..','js','config.js'),'utf8').replace("mode: 'demo'","mode: 'supabase'").replace("supabaseUrl: ''","supabaseUrl: 'https://test.supabase.co'").replace("supabaseAnonKey: ''","supabaseAnonKey: 'cle-publique-anon-de-test'");
await ctx.route('**/js/config.js',r=>r.fulfill({contentType:'application/javascript',body:cfg}));
await ctx.route('**/vendor/supabase.js',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(D+'mock-supabase.js','utf8')}));
const p=await ctx.newPage();
p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs.push(m.text())});
await p.goto(URL);await p.evaluate(()=>{localStorage.clear()});await p.reload();await p.waitForTimeout(700);
ok('Mode Supabase : écran de connexion, sans comptes de démo',await p.evaluate(()=>MODE==='supabase'&&!document.querySelector('#login').hidden&&!document.querySelector('[data-u]')&&/Connecté à Supabase/.test(document.querySelector('.mode-pill').textContent)));
await p.fill('#lg1','manager@test.ga');await p.fill('#lg2','mauvais');await p.click('#lgGo');await p.waitForTimeout(300);
ok('Supabase Auth : mauvais mot de passe refusé (message en français)',/incorrect/.test(await p.$eval('.errbox',e=>e.textContent)));
await p.fill('#lg1','manager@test.ga');await p.fill('#lg2','secret');await p.click('#lgGo');await p.waitForTimeout(900);
ok('Manager connecté, rôle lu dans profiles',await p.evaluate(()=>AUTH&&AUTH.role==='manager'&&cur==='tableau'));
const st=await p.evaluate(()=>Object.fromEntries(S.colis.map(c=>[c.code,c.statut])));
ok('Statuts convertis (pending+livreur=Attribué, postponed sans date=Échec, avec date=Reporté)',st['FE-26-20001']==='en_attente'&&st['FE-26-20002']==='attribue'&&st['FE-26-20003']==='echec'&&st['FE-26-20004']==='reporte'&&st['FE-26-20005']==='livre',JSON.stringify(st));
ok('Noms réels : client_name, company_name, vehicle_type, zone, is_on_duty',await p.evaluate(()=>{const c=CO('FE-26-20001');const l=LV('d-1');return c.dest.nom==='Gaëlle Nguema'&&c.exp.nom==='Gabon Tech Store'&&l.vehicule==='Moto'&&l.zone==='Glass'&&l.statut==='disponible'&&l.nom==='Rodrigue Ondo'}));
ok('Colis sans coordonnées : quartier non déterminé',await p.evaluate(()=>CO('FE-26-20005').zone===null));
ok('Motif d\'échec relu depuis parcel_events',await p.evaluate(()=>CO('FE-26-20003').motif==='Destinataire injoignable'));
ok('Dernière position GPS du livreur relue',await p.evaluate(()=>{const g=toLL(LV('d-1').pos.x,LV('d-1').pos.y);return Math.abs(g.lat-0.379)<1e-4&&!!LV('d-1').posAt}));
ok('Seule la clé publique anon est utilisée',await p.evaluate(()=>window.__KEY==='cle-publique-anon-de-test'));
// création de colis
await p.evaluate(()=>location.hash='colis');await p.waitForTimeout(200);
await p.click('#newBtn');await p.waitForTimeout(150);
ok('Formulaire : pas de champs non confirmés (montant, poids, type)',await p.evaluate(()=>!$('#nc8')&&!$('#nc9')&&!$('#nc7')));
await p.selectOption('#nc1',{label:'Comptoir agence'});await p.fill('#nc2','Arnaud Mouele');await p.fill('#nc3','Ornella Koumba');await p.fill('#nc4','+241 077 88 99 00');await p.fill('#nc12','0.4115, 9.4335');await p.fill('#nc6','Résidence Les Palmiers');
await p.click('#ncSave');await p.waitForTimeout(800);
const log1=await p.evaluate(()=>__MOCKLOG.filter(x=>x.t==='parcels'||x.t==='parcel_events'));
const ins=log1.find(x=>x.t==='parcels'&&x.op==='insert');
ok('Insertion dans parcels avec les colonnes réelles uniquement',ins&&!log1.some(x=>x.error)&&ins.row.client_name==='Ornella Koumba'&&ins.row.partner_id==='p-0'&&ins.row.status==='pending'&&Math.abs(ins.row.delivery_lat-0.4115)<1e-6&&!!ins.row.tracking_token&&/^\d{4}$/.test(ins.row.confirmation_code),JSON.stringify(ins&&ins.row));
const evIns=log1.filter(x=>x.t==='parcel_events'&&x.op==='insert');
ok('Événement de création avec author_id et author_role',evIns.some(e=>e.row.author_id==='u-mgr'&&e.row.author_role==='manager'&&/Arnaud Mouele/.test(e.row.reason)));
const upd=log1.find(x=>x.t==='parcels'&&x.op==='update');
ok('Attribution automatique : driver_id + status pending, raison enregistrée',upd&&upd.patch.status==='pending'&&!!upd.patch.driver_id&&evIns.some(e=>/Attribué automatiquement/.test(e.row.reason)),JSON.stringify(upd&&upd.patch));
const newCode=await p.evaluate(()=>S.colis[0].code);
ok('Nouveau numéro de suivi après le plus grand existant',newCode==='FE-26-20006',newCode);
// réaffectation manuelle puis annulation
await p.evaluate(c=>openColis(c),'FE-26-20001');await p.waitForTimeout(200);
await p.selectOption('#drL','d-1');await p.click('#drAssign');await p.waitForTimeout(400);
ok('Attribution manuelle enregistrée',await p.evaluate(()=>__MOCKDB.parcels.find(r=>r.id==='a1').driver_id==='d-1'&&__MOCKDB.parcel_events.some(e=>e.parcel_id==='a1'&&/Attribué manuellement/.test(e.reason))));
await p.evaluate(()=>closeAll());
await p.evaluate(()=>logout());await p.waitForTimeout(400);
// livreur
await p.fill('#lg1','rodrigue@test.ga');await p.fill('#lg2','secret');await p.click('#lgGo');await p.waitForTimeout(1500);
ok('Livreur connecté : driverId lu dans drivers',await p.evaluate(()=>AUTH.role==='driver'&&AUTH.driverId==='d-1'&&cur==='livreur'));
await p.waitForTimeout(800);
const loc=await p.evaluate(()=>__MOCKLOG.filter(x=>x.t==='driver_locations'));
ok('Position GPS insérée dans driver_locations (colonnes réelles)',loc.length>=1&&!loc.some(x=>x.error)&&loc[0].row.driver_id==='d-1'&&Math.abs(loc[0].row.lat-0.3801)<1e-6&&'recorded_at' in loc[0].row&&'accuracy' in loc[0].row,JSON.stringify(loc[0]&&loc[0].row));
await p.click('[data-pick="FE-26-20002"]');await p.waitForTimeout(500);
await p.click('[data-start="FE-26-20002"]');await p.waitForTimeout(200);await p.click('#shareYes');await p.waitForTimeout(800);
await p.click('[data-confirm="FE-26-20002"]');await p.waitForTimeout(200);await p.fill('#dsOtp','2222');await p.click('#dsOk');await p.waitForTimeout(700);
const a2=await p.evaluate(()=>({st:__MOCKDB.parcels.find(r=>r.id==='a2').status,ev:__MOCKDB.parcel_events.filter(e=>e.parcel_id==='a2').map(e=>e.status+'|'+e.author_role+'|'+(e.lat!=null))}));
ok('Livreur : picked_up → in_transit → delivered, avec position et auteur',a2.st==='delivered'&&['picked_up|driver|true','in_transit|driver|true','delivered|driver|true'].every(s=>a2.ev.includes(s)),JSON.stringify(a2));
// échec et report
await p.evaluate(async()=>{__MOCKDB.parcels.push({id:'a7',tracking_number:'FE-26-20007',tracking_token:'tok-a7',confirmation_code:'7777',client_name:'Hervé Bekale',client_phone:'+241 066 00 00 07',delivery_address:'Après le carrefour',status:'pending',driver_id:'d-1',partner_id:'p-1',delivery_lat:0.3650,delivery_lng:9.4520,precision:null,proof_photo_url:null,postponed_date:null});await FEDB.reload();R.livreur()});
const two=['FE-26-20001','FE-26-20007'];
for(const c of two){await p.evaluate(c=>{const x=CO(c);if(x.statut==='attribue')drvPick(c)},c);await p.waitForTimeout(300);await p.evaluate(c=>drvStart(c),c);await p.waitForTimeout(300)}
await p.evaluate(c=>{drvDetail=c;R.livreur()},two[0]);await p.click(`[data-issue="${two[0]}"]`);await p.waitForTimeout(150);await p.click('[data-itype="echec"]');await p.selectOption('#dsMotif',{index:2});await p.click('#dsIssue');await p.waitForTimeout(600);
await p.evaluate(c=>{drvDetail=c;R.livreur()},two[1]);await p.click(`[data-issue="${two[1]}"]`);await p.waitForTimeout(150);await p.selectOption('#dsMotif',{index:1});await p.click('#dsIssue');await p.waitForTimeout(600);
const ee=await p.evaluate(t=>t.map(c=>{const r=__MOCKDB.parcels.find(x=>x.tracking_number===c);const ev=__MOCKDB.parcel_events.filter(e=>e.parcel_id===r.id).at(-1);return{status:r.status,date:r.postponed_date,reason:ev.reason}}),two);
ok('Échec : status postponed, postponed_date vide, raison « Échec : … »',ee[0].status==='postponed'&&ee[0].date===null&&/^Échec : /.test(ee[0].reason),JSON.stringify(ee[0]));
ok('Report : status postponed avec postponed_date',ee[1].status==='postponed'&&!!ee[1].date&&Date.parse(ee[1].date)>Date.now(),JSON.stringify(ee[1]));
// hors service
await p.evaluate(()=>{drvDetail=null;drvTab='profil';R.livreur()});await p.click('[data-av="hors_service"]');await p.waitForTimeout(500);
ok('Hors service → drivers.is_on_duty = false',await p.evaluate(()=>__MOCKDB.drivers.find(d=>d.id==='d-1').is_on_duty===false));
await p.click('[data-av="disponible"]');await p.waitForTimeout(400);
await p.evaluate(()=>logout());await p.waitForTimeout(400);
// livreur sans accord GPS
await p.fill('#lg1','prisca@test.ga');await p.fill('#lg2','secret');await p.click('#lgGo');await p.waitForTimeout(1200);
const before=await p.evaluate(()=>__MOCKLOG.filter(x=>x.t==='driver_locations'&&x.row&&x.row.driver_id==='d-2').length);
ok('Sans consent_at : aucune position envoyée',before===0&&await p.evaluate(()=>!!document.querySelector('#gpsOk')));
await p.click('#gpsOk');await p.waitForTimeout(1500);
ok('Accord → drivers.consent_at enregistré puis positions envoyées',await p.evaluate(()=>!!__MOCKDB.drivers.find(d=>d.id==='d-2').consent_at&&__MOCKLOG.some(x=>x.t==='driver_locations'&&x.row&&x.row.driver_id==='d-2')));
await p.evaluate(()=>logout());await p.waitForTimeout(400);
// manager : temps réel + session restaurée
await p.fill('#lg1','manager@test.ga');await p.fill('#lg2','secret');await p.click('#lgGo');await p.waitForTimeout(1000);
await p.evaluate(()=>location.hash='carte');await p.waitForTimeout(400);
await p.evaluate(()=>__MOCKDB&&window.__CH.hs.find(([f])=>f.table==='driver_locations')[1]({new:{driver_id:'d-2',lat:0.3560,lng:9.4730,recorded_at:new Date().toISOString()}}));await p.waitForTimeout(600);
ok('Temps réel : nouvelle position reçue et affichée',await p.evaluate(()=>{const l=LV('d-2');return zoneOf(l.pos)==='Lalala'}));
await p.reload();await p.waitForTimeout(1200);
ok('Session Supabase restaurée après actualisation',await p.evaluate(()=>AUTH&&AUTH.role==='manager'&&S.colis.length>=6));
await p.evaluate(()=>logout());await p.waitForTimeout(400);
// partenaire
await p.fill('#lg1','gts@test.ga');await p.fill('#lg2','secret');await p.click('#lgGo');await p.waitForTimeout(1000);
ok('Partenaire connecté : partnerId lu dans partners',await p.evaluate(()=>AUTH.role==='partner'&&AUTH.partnerId==='p-1'&&cur==='partenaire'));
await p.evaluate(()=>logout());await p.waitForTimeout(400);
// suivi public sans fonction serveur
await p.goto(URL+'?suivi=tok-a1');await p.waitForTimeout(700);
ok('Suivi public sans connexion : aucune lecture directe des tables (message d\'attente)',await p.evaluate(()=>cur==='suivi'&&/sera activé/.test(document.querySelector('#view').textContent)));
const errsMock=await p.evaluate(()=>__MOCKLOG.filter(x=>x.error));
ok('Aucune colonne inconnue ni statut invalide envoyé à Supabase',errsMock.length===0,JSON.stringify(errsMock));
ok('Aucune erreur JavaScript',errs.length===0,errs.join(' | '));
console.log(`\n${pass} réussis, ${fail} échoués`);
await b.close();
})();
