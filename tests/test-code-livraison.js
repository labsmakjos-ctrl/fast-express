/* Confirmation de livraison : jamais sans le code du client, code jamais montré au livreur (mode Supabase).
   A : configuration actuelle (vérification dans le navigateur, en attendant la fonction serveur)
   B : avec deliveryRpc = 'confirm_delivery' (faux serveur conforme à supabase/05a_verification_code_serveur.sql)
   C : mode démo inchangé */
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
const D=__dirname+'/';const BASE='http://localhost:8765/index.html';const SB=BASE+'?mode=supabase';
let pass=0,fail=0;const ok=(n,c,i='')=>{c?pass++:fail++;console.log((c?'OK   ':'ÉCHEC')+' '+n+(i?' — '+String(i).slice(0,220):''))};
(async()=>{
const b=await chromium.launch();const errs=[];
const realCfg=fs.readFileSync(path.join(__dirname,'..','js','config.js'),'utf8');
if(!/mode: 'demo'/.test(realCfg)||!/deliveryRpc: null/.test(realCfg))throw new Error('config.js : démo par défaut et deliveryRpc: null attendus');
const cfgA=realCfg.replace(/supabaseAnonKey: '[^']*'/,"supabaseAnonKey: 'sb_publishable_TEST'");
const cfgB=cfgA.replace("deliveryRpc: null","deliveryRpc: 'confirm_delivery'");
const cfgE=cfgB.replace("deliveryCodeRpc: null","deliveryCodeRpc: 'get_delivery_code'");
if(!/deliveryCodeRpc: null/.test(realCfg))throw new Error('config.js : deliveryCodeRpc: null attendu');
const mock=fs.readFileSync(D+'mock-supabase.js','utf8');
const track=pg=>{pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|ERR_|tile/.test(m.text()))errs.push(m.text())})};
const CODES={'FE-261119-AAAA':'4826','FE-261119-BBBB':'3917','FE-261119-CCCC':'5150','FE-261119-DDDD':' 2468 ','FE-261119-EEEE':'AB12'};
async function setup(cfg,rpc,protect){
 const c=await b.newContext({viewport:{width:1300,height:850},permissions:['geolocation'],geolocation:{latitude:0.3801,longitude:9.4452,accuracy:9}});
 await c.route('**/js/config.js',r=>r.fulfill({contentType:'application/javascript',body:cfg}));
 await c.route('**/vendor/supabase.js',r=>r.fulfill({contentType:'application/javascript',body:mock}));
 if(rpc)await c.addInitScript(()=>{window.__HAS_CONFIRM_RPC=true});
 if(protect)await c.addInitScript(()=>{window.__HAS_CODE_RPC=true;window.__COL_PROTECT=true});
 const p=await c.newPage();track(p);await p.goto(SB);await p.waitForTimeout(400);
 await p.evaluate(codes=>{localStorage.clear();const now=Date.now();let i=0;
  for(const [tn,code] of Object.entries(codes)){i++;__MOCKDB.parcels.push({id:'z'+i,tracking_number:tn,tracking_token:'00000000-0000-4000-8000-00000000000'+i,confirmation_code:code,client_name:'TEST FAST EXPRESS',client_phone:'+241 000',delivery_address:'Test',status:'in_transit',driver_id:'d-1',partner_id:'p-1',delivery_lat:0.39,delivery_lng:9.45,proof_photo_url:null,postponed_date:null,created_at:new Date(now-36e5).toISOString()})}
  localStorage.setItem('__mockdb',JSON.stringify(__MOCKDB))},CODES);
 await p.reload();await p.waitForTimeout(400);return{c,p}}
const login=async(p,email)=>{await p.fill('#lg1',email);await p.fill('#lg2','secret');await p.click('#lgGo');await p.waitForTimeout(1500)};
const row=(p,tn)=>p.evaluate(tn=>{const r=__MOCKDB.parcels.find(x=>x.tracking_number===tn);return{status:r.status,delivered_at:r.delivered_at||null,ev:__MOCKDB.parcel_events.filter(e=>e.parcel_id===r.id).map(e=>e.status)}},tn);
const directWrites=(p,tn)=>p.evaluate(tn=>__MOCKLOG.filter(x=>x.t==='parcels'&&x.op==='update'&&x.patch&&x.patch.status==='delivered').length,tn);
async function driverConfirm(p,tn,code){await p.evaluate(()=>{drvSheet=null;drvDetail=null;drvTab='missions';R.livreur()});await p.waitForTimeout(150);
 await p.click(`[data-confirm="${tn}"]`);await p.waitForTimeout(200);await p.fill('#dsOtp',code);await p.click('#dsOk');await p.waitForTimeout(500);
 return p.evaluate(()=>{const e=document.querySelector('#dsErr');return e&&!e.hidden?e.innerText:''})}
async function managerConfirm(p,tn,code){await p.evaluate(tn=>{closeAll();openColis(tn)},tn);await p.waitForTimeout(250);
 await p.click('[data-a="livrecode"]');await p.waitForTimeout(150);await p.fill('#drCode',code);await p.click('#drCodeOk');await p.waitForTimeout(500);
 return p.evaluate(()=>{const e=document.querySelector('#drCodeErr');return e&&!e.hidden?e.innerText:''})}

/* ===================== A. Configuration actuelle (deliveryRpc: null) ===================== */
{const {c,p}=await setup(cfgA,false);
 await login(p,'rodrigue@test.ga');
 await p.evaluate(()=>{drvTab='missions';R.livreur()});await p.waitForTimeout(200);
 await p.click('[data-confirm="FE-261119-AAAA"]');await p.waitForTimeout(250);
 const sheet=await p.evaluate(()=>({txt:document.querySelector('.drv-sheet').innerText,html:document.querySelector('#drv').innerHTML}));
 ok('A. Livreur (Supabase) : « Code pour la démo » absent de la fenêtre de confirmation',!/Code pour la démo/.test(sheet.txt));
 ok('A. Livreur (Supabase) : le vrai code n\'apparaît pas dans la fenêtre de confirmation',!/4826/.test(sheet.html));
 const scan=await p.evaluate(async codes=>{const seen=[];const look=w=>{const h=document.querySelector('#drv').innerHTML;codes.forEach(c=>{if(h.includes(c))seen.push(w+':'+c)})};
  drvSheet=null;for(const t of ['missions','historique','profil']){drvTab=t;drvDetail=null;R.livreur();look(t)}
  for(const c of S.colis.filter(x=>x.livreurId===AUTH.driverId)){drvTab='missions';drvDetail=c.code;R.livreur();look('détail '+c.code)}
  drvDetail=null;drvTab='missions';R.livreur();return seen},Object.values(CODES));
 ok('A. Livreur (Supabase) : aucun code de remise dans tout l\'espace livreur (missions, détail, historique, profil)',scan.length===0,scan.join(', '));
 let e=await driverConfirm(p,'FE-261119-AAAA','');
 ok('A. Livreur : code vide refusé',/4 chiffres/.test(e),e);
 e=await driverConfirm(p,'FE-261119-AAAA','1111');let r=await row(p,'FE-261119-AAAA');
 ok('A. Livreur : mauvais code refusé, rien écrit dans Supabase',/incorrect/.test(e)&&r.status==='in_transit'&&!r.ev.includes('delivered'),e+' '+JSON.stringify(r));
 e=await driverConfirm(p,'FE-261119-AAAA','4826');await p.waitForTimeout(400);r=await row(p,'FE-261119-AAAA');
 ok('A. Livreur : bon code → delivered + delivered_at + événement',!e&&r.status==='delivered'&&!!r.delivered_at&&r.ev.includes('delivered'),JSON.stringify(r));
 e=await driverConfirm(p,'FE-261119-DDDD','2468');await p.waitForTimeout(400);r=await row(p,'FE-261119-DDDD');
 ok('A. Code enregistré avec des espaces autour (« 2468 ») : accepté, comme côté serveur',!e&&r.status==='delivered',e+' '+JSON.stringify(r));
 e=await driverConfirm(p,'FE-261119-EEEE','1234');r=await row(p,'FE-261119-EEEE');
 ok('A. Code enregistré non conforme (« AB12 ») : message clair, aucune écriture',/pas au bon format/.test(e)&&r.status==='in_transit',e);
 // ---- manager
 const m=await c.newPage();track(m);await m.addInitScript(()=>{try{localStorage.removeItem('__mocksession')}catch(e){}});
 await m.goto(SB);await m.waitForTimeout(400);await login(m,'manager@test.ga');
 await m.evaluate(()=>openColis('FE-261119-BBBB'));await m.waitForTimeout(300);
 const dr=await m.evaluate(()=>({direct:!!document.querySelector('#drawer [data-a="livre"]'),withCode:!!document.querySelector('#drawer [data-a="livrecode"]'),txt:document.querySelector('#drawer').innerText,
  btns:[...document.querySelectorAll('#drawer button')].map(x=>x.textContent.trim())}));
 ok('A. Manager : plus de bouton « Confirmer la livraison » direct, seulement « Confirmer avec le code du client »',!dr.direct&&dr.withCode&&!dr.btns.includes('Confirmer la livraison'),dr.btns.join(' | '));
 ok('A. Manager (Supabase) : le code de remise est affiché dans la fiche, pour le communiquer au client',/3917/.test(dr.txt)&&/communiquer au client par téléphone/.test(dr.txt));
 await m.evaluate(()=>{closeAll();openColis('FE-261119-EEEE')});await m.waitForTimeout(250);
 ok('A. Manager : alerte « format non conforme » sur un code enregistré invalide',await m.evaluate(()=>/Format non conforme/.test(document.querySelector('#drawer').innerText)));
 e=await managerConfirm(m,'FE-261119-BBBB','');r=await row(m,'FE-261119-BBBB');
 ok('A. Manager : sans code → refus, colis toujours en cours',/4 chiffres/.test(e)&&r.status==='in_transit',e);
 e=await managerConfirm(m,'FE-261119-BBBB','0000');r=await row(m,'FE-261119-BBBB');
 ok('A. Manager : mauvais code → refus, rien écrit',/incorrect/.test(e)&&r.status==='in_transit'&&!r.ev.includes('delivered'),e);
 e=await managerConfirm(m,'FE-261119-BBBB','3917');await m.waitForTimeout(400);r=await row(m,'FE-261119-BBBB');
 ok('A. Manager : bon code du client → delivered',!e&&r.status==='delivered'&&r.ev.includes('delivered'),JSON.stringify(r));
 await c.close()}

/* ===================== B. Avec la fonction serveur (deliveryRpc: 'confirm_delivery') ===================== */
{const {c,p}=await setup(cfgB,true);
 await login(p,'rodrigue@test.ga');
 const loaded=await p.evaluate(()=>S.colis.filter(x=>/^FE-261119-/.test(x.code)).map(x=>x.otp));
 ok('B. Le code de remise n\'est plus chargé dans le navigateur du livreur',loaded.length===5&&loaded.every(o=>o===''),JSON.stringify(loaded));
 ok('B. Le livreur ne demande même plus la colonne confirmation_code au serveur',await p.evaluate(()=>!(window.__MOCKCOLS||[]).some(x=>x.t==='parcels'&&/confirmation_code/.test(x.cols))));
 let e=await driverConfirm(p,'FE-261119-AAAA','1111');let r=await row(p,'FE-261119-AAAA');
 ok('B. Livreur : mauvais code refusé PAR LE SERVEUR (essais restants), rien écrit',/incorrect/.test(e)&&/Il reste 4 essais/.test(e)&&r.status==='in_transit'&&await p.evaluate(()=>(window.__MOCKRPC||[]).some(x=>x.name==='confirm_delivery')),e);
 e=await driverConfirm(p,'FE-261119-AAAA','4826');await p.waitForTimeout(400);r=await row(p,'FE-261119-AAAA');
 ok('B. Livreur : bon code → livraison enregistrée par le serveur, aucune écriture directe du navigateur',!e&&r.status==='delivered'&&r.ev.includes('delivered')&&await directWrites(p)===0,JSON.stringify(r));
 ok('B. Livreur : écran à jour « Livré »',await p.evaluate(()=>CO('FE-261119-AAAA').statut==='livre'));
 let last='';for(let i=0;i<5;i++)last=await driverConfirm(p,'FE-261119-CCCC','000'+i);
 ok('B. 5e code faux : message « dernier essai », plus de « Il reste 0 essai »',/dernier essai/.test(last)&&!/Il reste 0/.test(last),last);
 e=await driverConfirm(p,'FE-261119-CCCC','5150');r=await row(p,'FE-261119-CCCC');
 ok('B. 5 codes faux → vérification bloquée, même avec le bon code ensuite',/bloquée/.test(e)&&r.status==='in_transit',e);
 const m=await c.newPage();track(m);await m.addInitScript(()=>{try{localStorage.removeItem('__mocksession')}catch(e){}});
 await m.goto(SB);await m.waitForTimeout(400);await login(m,'manager@test.ga');
 await m.evaluate(()=>openColis('FE-261119-BBBB'));await m.waitForTimeout(250);
 ok('B. Manager : le code reste consultable dans la fiche (chargé pour le manager seulement)',await m.evaluate(()=>/3917/.test(document.querySelector('#drawer').innerText)));
 e=await managerConfirm(m,'FE-261119-BBBB','9999');r=await row(m,'FE-261119-BBBB');
 ok('B. Manager : mauvais code refusé par le serveur',/incorrect/.test(e)&&r.status==='in_transit',e);
 e=await managerConfirm(m,'FE-261119-BBBB','3917');await m.waitForTimeout(400);r=await row(m,'FE-261119-BBBB');
 ok('B. Manager : bon code → livraison enregistrée par le serveur, aucune écriture directe',!e&&r.status==='delivered'&&await directWrites(m)===0,JSON.stringify(r));
 await c.close()}

/* ===================== E. Colonne protégée (proposition 06 partie B) + fonctions serveur ===================== */
{const {c,p}=await setup(cfgE,true,true);
 await login(p,'rodrigue@test.ga');
 ok('E. Livreur : connexion et chargement réussis avec la colonne protégée',await p.evaluate(()=>AUTH&&AUTH.role==='driver'&&S.colis.some(x=>x.code==='FE-261119-AAAA')));
 const direct=await p.evaluate(async()=>{const sb=window.supabase.createClient('u','k');const r=await sb.from('parcels').select('id,confirmation_code').limit(1);return r.error&&r.error.code});
 ok('E. Livreur : requête directe de confirmation_code refusée par la base',direct==='42501',direct);
 const viaRpc=await p.evaluate(async()=>{const sb=window.supabase.createClient('u','k');return (await sb.rpc('get_delivery_code',{p_parcel_id:'z1'})).data});
 ok('E. Livreur : get_delivery_code ne lui renvoie rien',viaRpc===null,String(viaRpc));
 let e=await driverConfirm(p,'FE-261119-AAAA','0000');let r=await row(p,'FE-261119-AAAA');
 ok('E. Livreur : mauvais code refusé par le serveur',/incorrect/.test(e)&&r.status==='in_transit',e);
 e=await driverConfirm(p,'FE-261119-AAAA','4826');await p.waitForTimeout(400);r=await row(p,'FE-261119-AAAA');
 ok('E. Livreur : bon code communiqué par le client → livré (vérifié par le serveur)',!e&&r.status==='delivered',e);
 const m=await c.newPage();track(m);await m.addInitScript(()=>{try{localStorage.removeItem('__mocksession')}catch(e){}});
 await m.goto(SB);await m.waitForTimeout(400);await login(m,'manager@test.ga');
 ok('E. Manager : chargement réussi, aucune lecture de confirmation_code par personne',await m.evaluate(()=>AUTH.role==='manager'&&S.colis.length>0&&!(window.__MOCKCOLS||[]).some(x=>x.t==='parcels'&&/confirmation_code/.test(x.cols))));
 await m.evaluate(()=>openColis('FE-261119-BBBB'));await m.waitForTimeout(500);
 ok('E. Manager : le code est obtenu auprès du serveur et affiché dans la fiche',await m.evaluate(()=>/3917/.test(document.querySelector('#drOtpBox').innerText)&&(window.__MOCKRPC||[]).some(x=>x.name==='get_delivery_code')));
 e=await managerConfirm(m,'FE-261119-BBBB','3917');await m.waitForTimeout(400);r=await row(m,'FE-261119-BBBB');
 ok('E. Manager : confirmation avec le code du client → livré',!e&&r.status==='delivered',e);
 // nouveau colis : code créé par la base, jamais par le navigateur
 await m.evaluate(()=>{closeAll();createColis({partnerId:'p-0',point:{x:ZI.Glass.x,y:ZI.Glass.y},destNom:'Test Code Serveur',destTel:'+241 066 11 22 33',adresse:'Repère test',type:'standard',poids:1,cod:0})});await m.waitForTimeout(900);
 const nw=await m.evaluate(()=>{const c=S.colis.find(x=>x.dest.nom==='Test Code Serveur');const ins=__MOCKLOG.find(x=>x.t==='parcels'&&x.op==='insert'&&x.row&&x.row.client_name==='Test Code Serveur');return{local:c&&c.otp,sent:ins?(ins.sent.includes('confirmation_code')?'envoyé':'non envoyé'):'?',db:ins&&__MOCKDB.parcels.find(x=>x.client_name==='Test Code Serveur').confirmation_code,code:c&&c.code}});
 ok('E. Nouveau colis : le navigateur n\'envoie ni ne connaît le code, la base le crée (4 chiffres)',nw.local===''&&nw.sent==='non envoyé'&&/^[0-9]{4}$/.test(nw.db||''),JSON.stringify({...nw,db:nw.db?'4 chiffres':nw.db}));
 await m.evaluate(c=>openColis(c),nw.code);await m.waitForTimeout(500);
 ok('E. Nouveau colis : le manager voit le code créé par la base',await m.evaluate(db=>document.querySelector('#drOtpBox').innerText.includes(db),nw.db));
 const pp=await c.newPage();track(pp);await pp.addInitScript(()=>{try{localStorage.removeItem('__mocksession')}catch(e){}});
 await pp.goto(SB);await pp.waitForTimeout(400);await login(pp,'gts@test.ga');
 const part=await pp.evaluate(async()=>{const sb=window.supabase.createClient('u','k');const a=await sb.from('parcels').select('confirmation_code').limit(1);const b=await sb.rpc('get_delivery_code',{p_parcel_id:'z2'});return{direct:a.error&&a.error.code,rpc:b.data,role:AUTH.role}});
 ok('E. Partenaire : ni requête directe ni fonction serveur ne donnent le code',part.role==='partner'&&part.direct==='42501'&&part.rpc===null,JSON.stringify(part));
 await c.close()}

/* ===================== F. Relecture périodique des colis (temps réel coupé) ===================== */
{const cfgF=cfgE.replace(/parcelPollMs: \d+/,'parcelPollMs: 2000');
 const {c,p}=await setup(cfgF,true,true);
 await login(p,'rodrigue@test.ga');
 const m=await c.newPage();track(m);await m.addInitScript(()=>{try{localStorage.removeItem('__mocksession')}catch(e){};window.__PG_DOWN=true});
 await m.goto(SB);await m.waitForTimeout(400);await login(m,'manager@test.ga');
 ok('F. Manager : temps réel des tables coupé pour ce test',await m.evaluate(()=>window.__PG_DOWN===true&&CO('FE-261119-AAAA').statut==='en_cours'));
 const e=await driverConfirm(p,'FE-261119-AAAA','4826');await p.waitForTimeout(300);
 ok('F. Livreur : livraison confirmée par le serveur',!e&&(await row(p,'FE-261119-AAAA')).status==='delivered',e);
 await m.waitForTimeout(3500);
 ok('F. Manager : la livraison apparaît sans temps réel ni rechargement (relecture périodique)',await m.evaluate(()=>CO('FE-261119-AAAA').statut==='livre'&&(window.__MOCKCOLS||[]).some(x=>x.t==='parcels'&&x.cols==='id,status,driver_id,postponed_date')));
 ok('F. La relecture ne lit jamais confirmation_code',await m.evaluate(()=>!(window.__MOCKCOLS||[]).some(x=>x.t==='parcels'&&/confirmation_code/.test(x.cols))));
 await c.close()}
{const {c,p}=await setup(cfgA,false);await login(p,'manager@test.ga');await p.waitForTimeout(2500);
 ok('F. Protection désactivée (réglage actuel) : aucune relecture périodique des colis',await p.evaluate(()=>!(window.__MOCKCOLS||[]).some(x=>x.cols==='id,status,driver_id,postponed_date')));
 await c.close()}

/* ===================== G. Profil sans rôle (NULL) ===================== */
{const {c,p}=await setup(cfgE,true,true);
 const g=await p.evaluate(async()=>{__MOCKDB.profiles.push({id:'u-null',full_name:'Sans Rôle',phone:'',role:null});__MOCKUSERS['nul@test.ga']='u-null';
  const sb=window.supabase.createClient('u','k');await sb.auth.signInWithPassword({email:'nul@test.ga',password:'secret'});
  const code=(await sb.rpc('get_delivery_code',{p_parcel_id:'z1'})).data;const conf=(await sb.rpc('confirm_delivery',{p_parcel_id:'z1',p_code:'4826'})).data;
  const st=__MOCKDB.parcels.find(x=>x.id==='z1').status;await sb.auth.signOut();return{code,conf,st}});
 ok('G. Profil au rôle vide : ni code (get_delivery_code), ni confirmation (not_allowed)',g.code===null&&g.conf&&g.conf.ok===false&&g.conf.error==='not_allowed'&&g.st==='in_transit',JSON.stringify(g));
 await c.close()}

/* ===================== C. Mode démo ===================== */
{const c=await b.newContext({viewport:{width:1300,height:850},permissions:['geolocation'],geolocation:{latitude:0.3921,longitude:9.4555}});const p=await c.newPage();track(p);
 await p.goto(BASE);await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(500);
 await p.click('[data-u="manager@fastexpress.demo"]');await p.click('#lgGo');await p.waitForTimeout(600);
 const code=await p.evaluate(()=>{setSim(false);return S.colis.find(x=>x.statut==='en_cours').code});
 await p.evaluate(c=>openColis(c),code);await p.waitForTimeout(250);
 const d=await p.evaluate(c=>({direct:!!document.querySelector('#drawer [data-a="livre"]'),shown:document.querySelector('#drawer .otp')?.textContent===CO(c).otp}),code);
 ok('C. Démo : manager sans confirmation directe, code toujours visible pour la démonstration',!d.direct&&d.shown,JSON.stringify(d));
 let e=await managerConfirm(p,code,'0000'===await p.evaluate(c=>CO(c).otp,code)?'1111':'0000');
 ok('C. Démo : mauvais code refusé',/incorrect/.test(e)&&await p.evaluate(c=>CO(c).statut,code)==='en_cours',e);
 e=await managerConfirm(p,code,await p.evaluate(c=>CO(c).otp,code));
 ok('C. Démo : bon code → Livré',!e&&await p.evaluate(c=>CO(c).statut,code)==='livre',e);
 // livreur de démonstration qui a réellement un colis en cours
 const email=await p.evaluate(()=>{for(const c of S.colis.filter(x=>x.statut==='en_cours')){const L=LV(c.livreurId);const u=L&&S.users.find(u=>u.role==='driver'&&(u.full_name===L.nom||authFromUser(u).driverId===L.id));if(u)return u.email}return null});
 await p.evaluate(()=>logout());await p.waitForTimeout(300);
 if(email){await p.click(`[data-u="${email}"]`);await p.click('#lgGo');await p.waitForTimeout(1200)}
 const mine=await p.evaluate(()=>{const c=S.colis.find(x=>x.livreurId===AUTH.driverId&&x.statut==='en_cours');return c&&c.code});
 if(mine){await p.evaluate(()=>{drvTab='missions';R.livreur()});await p.click(`[data-confirm="${mine}"]`);await p.waitForTimeout(200);
  ok('C. Démo : la fenêtre du livreur affiche toujours « Code pour la démo »',await p.evaluate(()=>/Code pour la démo/.test(document.querySelector('.drv-sheet').innerText)));
  await p.evaluate(()=>{drvSheet=null;R.livreur()})}
 else ok('C. Démo : colis en cours pour le livreur de démonstration',false,'aucun colis en cours');
 await c.close()}

/* ===================== D. Génération du code de remise ===================== */
{const c=await b.newContext();const p=await c.newPage();track(p);await p.goto(BASE);await p.waitForTimeout(400);
 const g=await p.evaluate(()=>{const mr=Math.random;let n=0;Math.random=()=>{n++;return mr()};const codes=Array.from({length:200},()=>newOtp());Math.random=mr;
  return{ok:codes.every(x=>/^[1-9][0-9]{3}$/.test(x)),distinct:new Set(codes).size,calls:n}});
 ok('D. Code de remise : 4 chiffres (1000-9999) par générateur cryptographique, Math.random() jamais utilisé',g.ok&&g.calls===0&&g.distinct>150,JSON.stringify(g));
 await c.close()}

ok('Aucune erreur JavaScript',errs.length===0,errs.join(' | '));
console.log(`\n${pass} réussis, ${fail} échoués`);
await b.close();
})();
