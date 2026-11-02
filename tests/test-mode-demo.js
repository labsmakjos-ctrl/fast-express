const {chromium}=require('playwright');
const D=require('path').join(__dirname,'captures')+'/';require('fs').mkdirSync(D,{recursive:true});
const URL='http://localhost:8765/index.html';
let pass=0,fail=0;const ok=(n,c,i='')=>{c?pass++:fail++;console.log((c?'OK   ':'ÉCHEC')+' '+n+(i?' — '+String(i).slice(0,170):''))};
(async()=>{
const b=await chromium.launch();const errs=[];
const ctx=await b.newContext({viewport:{width:1400,height:900},permissions:['geolocation'],geolocation:{latitude:0.3921,longitude:9.4555,accuracy:14}});
const p=await ctx.newPage();
p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/tile\.openstreetmap|ERR_TUNNEL|Failed to load resource/.test(m.text()))errs.push(m.text())});
await p.goto(URL);await p.waitForTimeout(800);
ok('Écran de connexion au démarrage',await p.evaluate(()=>!document.querySelector('#login').hidden&&document.querySelector('.app').hidden));
ok('Bibliothèques locales chargées (Leaflet, Supabase)',await p.evaluate(()=>typeof L==='object'&&typeof supabase==='object'));
await p.screenshot({path:D+'a1-login.png'});
// mauvais mot de passe
await p.fill('#lg1','manager@fastexpress.demo');await p.fill('#lg2','faux');await p.click('#lgGo');await p.waitForTimeout(200);
ok('Mot de passe incorrect refusé',/incorrect/.test(await p.$eval('.errbox',e=>e.textContent)));
await p.click('[data-u="manager@fastexpress.demo"]');await p.click('#lgGo');await p.waitForTimeout(500);
ok('Connexion manager → tableau de bord',await p.evaluate(()=>cur==='tableau'&&AUTH.role==='manager'&&!document.querySelector('.app').hidden));
await p.evaluate(()=>setSim(false));
for(const v of ['tableau','carte','colis','attribution','livreurs','whatsapp','historique','suivi']){
 await p.evaluate(v=>location.hash=v,v);await p.waitForTimeout(350);
 const ov=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);if(ov>0)ok('Débordement '+v,false,ov);
 await p.screenshot({path:D+`a2-${v}.png`});}
ok('Carte Leaflet créée avec marqueurs',await p.evaluate(()=>{location.hash='carte';return true})&&await (async()=>{await p.waitForTimeout(400);return p.evaluate(()=>!!LM&&Object.keys(LMK).length>0&&document.querySelectorAll('.leaflet-interactive').length>5)})());
// statuts
ok('Statuts « Colis récupéré » et « Échec » distincts présents',await p.evaluate(()=>S.colis.some(c=>c.statut==='recupere')&&S.colis.some(c=>c.statut==='echec')&&S.colis.some(c=>c.statut==='reporte')));
ok('Deux états livreur seulement',await p.evaluate(()=>S.livreurs.every(l=>['disponible','hors_service'].includes(l.statut))&&Object.keys(LST).length===2));
ok('Capacité selon le véhicule',await p.evaluate(()=>capOf(S.livreurs.find(l=>/Voiture/.test(l.vehicule)))===8&&capOf(S.livreurs.find(l=>/Scooter/.test(l.vehicule)))===4&&capOf(S.livreurs.find(l=>/^Moto/.test(l.vehicule)))===5));
ok('Expéditeur « Comptoir agence » présent',await p.evaluate(()=>S.partners[0].company_name==='Comptoir agence'));
ok('Quartier non déduit si coordonnées incertaines',await p.evaluate(()=>S.colis.filter(c=>!c.zone).length===2&&zoneLabel(S.colis.find(c=>!c.zone))==='Quartier non déterminé'));
// création : quartier
await p.evaluate(()=>location.hash='colis');await p.waitForTimeout(200);
await p.click('#newBtn');await p.waitForTimeout(150);
ok('Formulaire : expéditeur par défaut Comptoir agence + champ déposant',await p.evaluate(()=>PA($('#nc1').value).company_name==='Comptoir agence'&&!$('#nc2F').hidden));
await p.click('#ncSave');await p.waitForTimeout(150);
ok('Validation : quartier ou coordonnées obligatoires',(await p.$$eval('.ferr',e=>e.map(x=>x.textContent))).some(t=>/quartier ou saisissez/.test(t)));
await p.fill('#nc2','Brice Ndong');await p.fill('#nc3','Gaëlle Nguema');await p.fill('#nc4','+241 066 12 34 56');await p.selectOption('#nc5','Akébé');await p.fill('#nc6','Derrière la pharmacie, portail bleu');
await p.click('#ncSave');await p.waitForTimeout(400);
let c1=await p.evaluate(()=>{const c=S.colis[0];return{code:c.code,zone:c.zone,exp:c.exp.nom,st:c.statut,note:c.hist[0].note,tok:!!c.token}});
ok('Colis créé (quartier choisi, comptoir, déposant)',c1.zone==='Akébé'&&c1.exp==='Comptoir agence'&&/Brice Ndong/.test(c1.note)&&c1.tok,JSON.stringify(c1));
// création : coordonnées hors quartier connu
await p.click('#newBtn');await p.waitForTimeout(150);await p.selectOption('#nc1',{label:'Gabon Tech Store'});
await p.fill('#nc3','Junior Ella');await p.fill('#nc4','+241 077 98 76 54');await p.fill('#nc12','12, 9');await p.fill('#nc6','Après le pont');await p.click('#ncSave');await p.waitForTimeout(150);
ok('Coordonnées hors Libreville refusées',(await p.$$eval('.ferr',e=>e.map(x=>x.textContent))).some(t=>/hors de la région/.test(t)));
await p.fill('#nc12','0.4800, 9.5600');await p.click('#ncSave');await p.waitForTimeout(400);
c1=await p.evaluate(()=>{const c=S.colis[0];return{zone:c.zone,lbl:zoneLabel(c),exp:c.exp.nom}});
ok('Coordonnées éloignées → quartier non déterminé',c1.zone===null&&c1.lbl==='Quartier non déterminé'&&c1.exp==='Gabon Tech Store',JSON.stringify(c1));
await p.click('#newBtn');await p.waitForTimeout(150);await p.fill('#nc3','Chancelle Ovono');await p.fill('#nc4','+241 074 11 22 33');await p.fill('#nc12','0.3785, 9.4428');await p.fill('#nc6','Immeuble blanc');await p.click('#ncSave');await p.waitForTimeout(400);
ok('Coordonnées proches d\'un centre → quartier déduit (Glass)',await p.evaluate(()=>S.colis[0].zone)==='Glass');
// manager : fiche → récupéré → en livraison → livré
const code=await p.evaluate(()=>{const c=S.colis.find(x=>x.statut==='attribue');return c.code});
await p.evaluate(c=>openColis(c),code);await p.waitForTimeout(250);
await p.screenshot({path:D+'a3-drawer.png'});
await p.click('[data-a="recupere"]');await p.waitForTimeout(150);
ok('Manager : Marquer récupéré',await p.evaluate(c=>CO(c).statut,code)==='recupere');
await p.click('[data-a="en_cours"]');await p.waitForTimeout(150);
ok('Manager : Marquer en livraison',await p.evaluate(c=>CO(c).statut,code)==='en_cours');
await p.evaluate(()=>closeAll());
// déconnexion → livreur
await p.click('#logoutBtn');await p.waitForTimeout(300);
ok('Déconnexion',await p.evaluate(()=>AUTH===null&&!document.querySelector('#login').hidden));
const drv=await p.evaluate(()=>{const l=S.livreurs.find(l=>l.statut==='disponible'&&l.consentAt&&S.colis.some(c=>c.livreurId===l.id&&c.statut==='attribue'));return S.users.find(u=>u.id===l.profileId).email});
await p.click(`[data-u="${drv}"]`);await p.click('#lgGo');await p.waitForTimeout(600);
ok('Livreur : seul l\'espace livreur est visible',await p.evaluate(()=>cur==='livreur'&&document.querySelector('.app').hidden&&!document.querySelector('#drv').hidden&&!document.querySelector('.drv-admin')));
ok('Livreur : ne voit que ses colis',await p.evaluate(()=>[...document.querySelectorAll('.mcard [data-detail]')].every(b=>CO(b.dataset.detail).livreurId===AUTH.driverId)));
await p.evaluate(()=>location.hash='tableau');await p.waitForTimeout(200);
ok('Livreur : accès au tableau de bord refusé (renvoyé à son espace)',await p.evaluate(()=>cur==='livreur'));
await p.waitForTimeout(1500);
const gps=await p.evaluate(()=>({watch:GPS.watch!=null,sent:!!GPS.sentAt,zone:zoneOf(me().pos)}));
ok('GPS : position lue et enregistrée (consentement donné, en service)',gps.watch&&gps.sent,JSON.stringify(gps));
await p.screenshot({path:D+'a4-driver.png'});
const dc=await p.evaluate(()=>mine().find(c=>c.statut==='attribue').code);
await p.click(`[data-pick="${dc}"]`);await p.waitForTimeout(200);
ok('Livreur : « J\'ai récupéré le colis » → Colis récupéré',await p.evaluate(c=>CO(c).statut,dc)==='recupere');
ok('Événement avec position GPS du livreur',await p.evaluate(c=>{const h=CO(c).hist.at(-1);return Math.abs(h.lat-0.3921)<1e-6&&Math.abs(h.lng-9.4555)<1e-6},dc));
await p.click(`[data-start="${dc}"]`);await p.waitForTimeout(200);
ok('Commencer → demande de partage de position affichée',await p.evaluate(()=>!!document.querySelector('#shareYes')&&!!document.querySelector('#shareNo')));
await p.screenshot({path:D+'a4b-partage.png'});
await p.click('#shareYes');await p.waitForTimeout(800);
ok('Livreur : « Commencer la livraison » → En cours de livraison',await p.evaluate(c=>CO(c).statut,dc)==='en_cours');
ok('Position partagée au démarrage (événement avec coordonnées)',await p.evaluate(c=>{const h=CO(c).hist.at(-1);return h.s==='en_cours'&&Math.abs(h.lat-0.3921)<1e-6},dc));
// démarrage sans partager
const dc2=await p.evaluate(()=>{const L=me();const {c}=createColis({partnerId:'P1',point:{x:ZI.Louis.x,y:ZI.Louis.y},destNom:'Sans Partage',destTel:'+241 066 00 11 22',adresse:'Test',type:'standard',poids:1,cod:0});assign(c,L);setStatus(c,'recupere',null,L.nom);R.livreur();return c.code});
await p.click(`[data-start="${dc2}"]`);await p.waitForTimeout(150);await p.click('#shareNo');await p.waitForTimeout(250);
ok('« Démarrer sans partager » : livraison démarrée, choix enregistré',await p.evaluate(c=>CO(c).statut==='en_cours'&&S.log.some(e=>e.code===c&&/sans partager/.test(e.text)),dc2));
await p.click(`[data-confirm="${dc}"]`);await p.waitForTimeout(150);
await p.fill('#dsOtp',await p.evaluate(c=>CO(c).otp,dc));if(await p.$('#dsCash'))await p.check('#dsCash');await p.click('#dsOk');await p.waitForTimeout(250);
ok('Livreur : livraison confirmée → Livré',await p.evaluate(c=>CO(c).statut,dc)==='livre');
// échec et report
const others=await p.evaluate(()=>{const id=AUTH.driverId;const L=LV(id);const out=[];for(let i=0;i<2;i++){const {c}=createColis({partnerId:'P1',point:{x:ZI.Glass.x,y:ZI.Glass.y},destNom:'Test '+i,destTel:'+241 066 00 00 0'+i,adresse:'Repère '+i,type:'standard',poids:1,cod:0});assign(c,L);setStatus(c,'recupere',null,L.nom);setStatus(c,'en_cours',null,L.nom);out.push(c.code)}R.livreur();return out});
await p.click(`[data-detail="${others[0]}"]`);await p.waitForTimeout(150);await p.click(`[data-issue="${others[0]}"]`);await p.waitForTimeout(150);
await p.click('[data-itype="echec"]');await p.waitForTimeout(100);await p.click('#dsIssue');await p.waitForTimeout(100);
ok('Échec sans motif refusé',/obligatoire/.test(await p.$eval('#dsErr',e=>e.textContent)));
await p.selectOption('#dsMotif',{index:1});await p.click('#dsIssue');await p.waitForTimeout(200);
ok('Échec enregistré, distinct de Reporté, sans date',await p.evaluate(c=>{const x=CO(c);return x.statut==='echec'&&DB_STATUS[x.statut]==='postponed'&&x.postponedDate===null&&ST[x.statut].l==='Échec'},others[0]));
await p.click(`[data-detail="${others[1]}"]`);await p.waitForTimeout(150);await p.click(`[data-issue="${others[1]}"]`);await p.waitForTimeout(150);
await p.selectOption('#dsMotif',{index:1});await p.selectOption('#dsCren',{index:0});await p.click('#dsIssue');await p.waitForTimeout(200);
ok('Report enregistré avec nouvelle date (postponed_date)',await p.evaluate(c=>{const x=CO(c);return x.statut==='reporte'&&x.postponedDate>Date.now()&&/à partir de 8 h/.test(x.report.creneau)},others[1]));
// hors service
await p.click('[data-dtab="profil"]');await p.waitForTimeout(150);await p.click('[data-av="hors_service"]');await p.waitForTimeout(200);
ok('Hors service : partage GPS arrêté et plus d\'attribution',await p.evaluate(()=>me().statut==='hors_service'&&GPS.watch==null&&!classer(S.colis[0]).ok.some(e=>e.l.id===AUTH.driverId)));
await p.click('[data-av="disponible"]');await p.waitForTimeout(150);
await p.click('#dvLogout');await p.waitForTimeout(300);
// livreur sans consentement
const nc=await p.evaluate(()=>{const l=S.livreurs.find(l=>!l.consentAt&&l.statut==='disponible');return S.users.find(u=>u.id===l.profileId).email});
await p.click(`[data-u="${nc}"]`);await p.click('#lgGo');await p.waitForTimeout(500);
ok('Sans accord : aucune position envoyée, demande de consentement affichée',await p.evaluate(()=>GPS.watch==null&&!!document.querySelector('#gpsOk')));
await p.click('#gpsOk');await p.waitForTimeout(1200);
ok('Après accord : partage de position démarré',await p.evaluate(()=>!!me().consentAt&&GPS.watch!=null));
await p.evaluate(()=>logout());await p.waitForTimeout(300);
// partenaire
await p.click('[data-u="gabon.tech.store@fastexpress.demo"]');await p.click('#lgGo');await p.waitForTimeout(500);
ok('Partenaire → son tableau de bord',await p.evaluate(()=>cur==='partenaire'&&AUTH.role==='partner'));
await p.screenshot({path:D+'a5-partner.png'});
await p.evaluate(()=>location.hash='colis');await p.waitForTimeout(250);
ok('Partenaire : ne voit que ses colis',await p.evaluate(()=>[...document.querySelectorAll('tr[data-c]')].every(r=>CO(r.dataset.c).partnerId===AUTH.partnerId)&&document.querySelectorAll('tr[data-c]').length>0));
ok('Partenaire : pas de menu Attribution/Livreurs',await p.evaluate(()=>!document.querySelector('[data-v="attribution"]')&&!document.querySelector('[data-v="livreurs"]')));
await p.click('#newBtn');await p.waitForTimeout(150);
ok('Partenaire : expéditeur imposé (pas de choix)',await p.evaluate(()=>!document.querySelector('#nc1')));
await p.fill('#nc3','Client Partenaire');await p.fill('#nc4','+241 066 44 55 66');await p.selectOption('#nc5','Louis');await p.fill('#nc6','Résidence Les Palmiers');await p.click('#ncSave');await p.waitForTimeout(400);
ok('Partenaire : colis créé à son nom, en attente',await p.evaluate(()=>{const c=S.colis[0];return c.partnerId===AUTH.partnerId&&c.statut==='en_attente'}));
await p.evaluate(()=>{openColis(S.colis[1].code)});await p.waitForTimeout(200);
ok('Partenaire : pas de code de remise ni d\'attribution dans la fiche',await p.evaluate(()=>!document.querySelector('#drawer .otp')&&!document.querySelector('#drL')));
const tok=await p.evaluate(()=>S.colis.find(c=>c.statut==='en_cours').token);
await p.evaluate(()=>{closeAll();logout()});await p.waitForTimeout(300);
// suivi public par lien privé, sans connexion
await p.goto('http://localhost:8765/index.html?suivi='+tok);await p.waitForTimeout(700);
ok('Suivi public par lien (tracking_token) sans connexion',await p.evaluate(()=>cur==='suivi'&&document.body.classList.contains('solo')&&!!document.querySelector('.big-st')));
await p.screenshot({path:D+'a6-public.png'});
// persistance de session
await p.goto(URL);await p.waitForTimeout(400);await p.click('[data-u="manager@fastexpress.demo"]');await p.click('#lgGo');await p.waitForTimeout(400);
const n=await p.evaluate(()=>S.colis.length);await p.reload();await p.waitForTimeout(700);
ok('Après actualisation : session et données conservées',await p.evaluate(n=>AUTH&&AUTH.role==='manager'&&S.colis.length===n,n));
// téléphone Android
const m=await b.newContext({viewport:{width:393,height:851},isMobile:true,hasTouch:true,permissions:['geolocation'],geolocation:{latitude:0.41,longitude:9.48}});const mp=await m.newPage();
mp.on('pageerror',e=>errs.push('mobile: '+e.message));
await mp.goto(URL);await mp.waitForTimeout(600);await mp.screenshot({path:D+'a7-m-login.png'});
await mp.click('[data-u="rodrigue.ondo@fastexpress.demo"]');await mp.click('#lgGo');await mp.waitForTimeout(800);
await mp.screenshot({path:D+'a8-m-driver.png'});
ok('Téléphone : aucun débordement (livreur)',await mp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
await mp.evaluate(()=>logout());await mp.waitForTimeout(300);await mp.click('[data-u="manager@fastexpress.demo"]');await mp.click('#lgGo');await mp.waitForTimeout(500);
for(const v of ['tableau','colis','carte','attribution']){await mp.evaluate(v=>location.hash=v,v);await mp.waitForTimeout(300);const ov=await mp.evaluate(()=>document.documentElement.scrollWidth-innerWidth);if(ov>0)ok('Téléphone : débordement '+v,false,ov)}
ok('Téléphone : vues manager sans débordement',true);
const dn=await b.newContext({viewport:{width:393,height:851},isMobile:true});const dp=await dn.newPage();
dp.on('pageerror',e=>errs.push('refus: '+e.message));
await dp.goto(URL);await dp.waitForTimeout(500);await dp.click('[data-u="prisca.mba@fastexpress.demo"]');await dp.click('#lgGo');await dp.waitForTimeout(500);
const dc3=await dp.evaluate(()=>{const L=me();const {c}=createColis({partnerId:'P1',point:{x:ZI.Glass.x,y:ZI.Glass.y},destNom:'Refus GPS',destTel:'+241 066 00 33 44',adresse:'Test',type:'standard',poids:1,cod:0});assign(c,L);setStatus(c,'recupere',null,L.nom);R.livreur();return c.code});
await dp.click(`[data-start="${dc3}"]`);await dp.waitForTimeout(150);await dp.click('#shareYes');await dp.waitForTimeout(1500);
ok('Autorisation refusée par le téléphone : livraison démarrée quand même, message clair',await dp.evaluate(c=>CO(c).statut==='en_cours',dc3)&&await dp.evaluate(()=>[...document.querySelectorAll('.toast')].some(t=>/refusée|introuvable/.test(t.textContent))));
ok('Aucune erreur JavaScript',errs.length===0,errs.join(' | '));
console.log(`\n${pass} réussis, ${fail} échoués`);
await b.close();
})();
