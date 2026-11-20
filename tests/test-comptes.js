/* Gestion des utilisateurs (manager) : démo + Supabase simulé (faux Supabase et fausse fonction serveur
   reproduisant supabase/functions/admin-users). Aucune donnée réelle. */
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
const D=__dirname+'/';const BASE='http://localhost:8765/index.html';const SB=BASE+'?mode=supabase';
let pass=0,fail=0;const ok=(n,c,i='')=>{c?pass++:fail++;console.log((c?'OK   ':'ÉCHEC')+' '+n+(i?' — '+String(i).slice(0,220):''))};
(async()=>{
const b=await chromium.launch();const errs=[];
const root=path.join(__dirname,'..');
const realCfg=fs.readFileSync(path.join(root,'js','config.js'),'utf8');
if(!/mode: 'demo'/.test(realCfg))throw new Error('config.js : le site doit rester en démo par défaut');
// aucune clé secrète dans le code du navigateur
const jsFiles=['js/app.js','js/supabase-data.js','js/config.js','js/geo.js'].map(f=>fs.readFileSync(path.join(root,f),'utf8').replace(/\/\/.*$/gm,'').replace(/\/\*[\s\S]*?\*\//g,''));
ok('Aucune clé service_role ni secrète dans le JavaScript du navigateur',!jsFiles.some(t=>/service_role|sb_secret_|SERVICE_ROLE_KEY/.test(t)));
ok('Fonction serveur : clé service_role lue uniquement dans l\'environnement serveur',/Deno\.env\.get\('SUPABASE_SERVICE_ROLE_KEY'\)/.test(fs.readFileSync(path.join(root,'supabase/functions/admin-users/index.ts'),'utf8')));
const cfg0=realCfg.replace(/supabaseAnonKey: '[^']*'/,"supabaseAnonKey: 'sb_publishable_TEST'");
const cfgOn=cfg0.replace("adminFunction: null","adminFunction: 'admin-users'");
const mock=fs.readFileSync(D+'mock-supabase.js','utf8');
async function ctxNew(cfg){const c=await b.newContext({viewport:{width:1300,height:850}});
 await c.route('**/js/config.js',r=>r.fulfill({contentType:'application/javascript',body:cfg}));
 await c.route('**/vendor/supabase.js',r=>r.fulfill({contentType:'application/javascript',body:mock}));
 await c.route(/basemaps\.cartocdn|openstreetmap|arcgisonline/,r=>r.fulfill({status:204,body:''}));return c}
const watch=pg=>{pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|ERR_/.test(m.text()))errs.push(m.text())})};
const view=pg=>pg.$eval('#view',e=>e.textContent);
const login=async(p,email,pw,wait=900)=>{await p.fill('#lg1',email);await p.fill('#lg2',pw);await p.click('#lgGo');await p.waitForTimeout(wait)};
const loginErr=p=>p.$eval('#login',e=>(e.querySelector('.errbox')||{}).textContent||'');
const nav=p=>p.evaluate(()=>[...document.querySelectorAll('#nav a')].map(a=>a.dataset.v));

/* ====================== DÉMO ====================== */
let c=await ctxNew(cfg0);let p=await c.newPage();watch(p);
await p.goto(BASE);await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(500);
await login(p,'manager@fastexpress.demo','demo2026',500);
ok('Démo : rubrique « Gestion des utilisateurs » dans le menu manager',(await nav(p)).includes('utilisateurs'));
await p.evaluate(()=>location.hash='utilisateurs');await p.waitForTimeout(300);
ok('Liste des livreurs avec e-mail, véhicule, statut du compte et service',await p.evaluate(()=>document.querySelectorAll('#view tbody tr').length===S.livreurs.length&&/Actif/.test(document.querySelector('#view tbody').textContent)&&/En service|Hors service/.test(document.querySelector('#view tbody').textContent)&&/@fastexpress\.demo/.test(document.querySelector('#view tbody').textContent)));
// création d'un livreur
await p.click('#uNew');await p.waitForTimeout(200);
await p.fill('#uf1','Wilfried Biyogo');await p.fill('#uf2','12');await p.fill('#uf3','pas-un-mail');await p.click('#ufSave');await p.waitForTimeout(150);
ok('Création : champs invalides refusés (téléphone, e-mail)',await p.evaluate(()=>document.querySelectorAll('#ufF .ferr').length>=2&&!document.querySelector('#upPw')));
await p.fill('#uf2','+241 074 55 66 77');await p.fill('#uf3','rodrigue.ondo@fastexpress.demo');await p.click('#ufSave');await p.waitForTimeout(150);
ok('Création : e-mail déjà utilisé refusé',/déjà utilisée/.test(await p.$eval('#ufF',e=>e.textContent)));
await p.fill('#uf3','wilfried@fastexpress.demo');await p.selectOption('#uf4','Moto');await p.fill('#uf5','Haojue');await p.fill('#uf6','gh-123-aa');await p.selectOption('#uf7','Louis');
await p.click('#ufSave');await p.waitForTimeout(300);
const tmp1=await p.$eval('#upPw',e=>e.textContent);
ok('Création : mot de passe provisoire affiché une fois (12 caractères)',/^[A-Za-z2-9]{12}$/.test(tmp1),tmp1);
const nd=await p.evaluate(()=>{const u=S.users.find(x=>x.email==='wilfried@fastexpress.demo');const l=S.livreurs.find(x=>x.profileId===u.id);return{role:u.role,must:u.mustChange,l:l&&{v:l.vehicule,p:l.plaque,z:l.zone,st:l.statut}}});
ok('Création : compte driver + fiche livreur associée',nd.role==='driver'&&nd.must&&nd.l&&nd.l.v==='Moto Haojue'&&nd.l.p==='GH-123-AA'&&nd.l.z==='Louis'&&nd.l.st==='hors_service',JSON.stringify(nd));
await p.click('#upDone');await p.waitForTimeout(200);
ok('Le mot de passe provisoire n\'est plus affiché ensuite',!(await p.evaluate(t=>document.body.textContent.includes(t),tmp1)));
// recherche / filtres
await p.fill('#uQ','wilfried');await p.waitForTimeout(150);
ok('Recherche : un seul résultat',await p.evaluate(()=>document.querySelectorAll('#view tbody tr').length===1&&/Wilfried/.test(document.querySelector('#view tbody').textContent)));
await p.fill('#uQ','');await p.click('#uS [data-s="hors"]');await p.waitForTimeout(150);
ok('Filtre « Hors service »',await p.evaluate(()=>[...document.querySelectorAll('#view tbody tr')].every(r=>/Hors service/.test(r.textContent))&&document.querySelectorAll('#view tbody tr').length>=1));
await p.click('#uS [data-s="tous"]');await p.waitForTimeout(100);
// modification
await p.evaluate(()=>{const l=S.livreurs.find(x=>x.nom==='Wilfried Biyogo');document.querySelector(`[data-ua="edit"][data-id="${l.id}"]`).click()});await p.waitForTimeout(200);
await p.fill('#uf2','+241 062 11 22 33');await p.selectOption('#uf4','Scooter');await p.click('#ufSave');await p.waitForTimeout(250);
ok('Modification enregistrée (téléphone, véhicule)',await p.evaluate(()=>{const l=S.livreurs.find(x=>x.nom==='Wilfried Biyogo');return l.tel==='+241 062 11 22 33'&&/^Scooter/.test(l.vehicule)}));
// première connexion
await p.evaluate(()=>logout());await p.waitForTimeout(300);
await login(p,'wilfried@fastexpress.demo','demo2026',300);
ok('Mot de passe de démo refusé pour le nouveau compte',/incorrect/.test(await loginErr(p)));
await login(p,'wilfried@fastexpress.demo',tmp1,300);
ok('Première connexion : changement de mot de passe obligatoire',!!(await p.$('#pw1'))&&await p.evaluate(()=>!AUTH));
await p.fill('#pw1','court1');await p.fill('#pw2','court1');await p.click('#pwGo');await p.waitForTimeout(150);
ok('Mot de passe trop simple refusé',/trop simple/.test(await p.$eval('#login',e=>e.textContent)));
await p.fill('#pw1','LivreurFast2026');await p.fill('#pw2','LivreurFast2027');await p.click('#pwGo');await p.waitForTimeout(150);
ok('Confirmation différente refusée',/pas identiques/.test(await p.$eval('#login',e=>e.textContent)));
await p.fill('#pw1','LivreurFast2026');await p.fill('#pw2','LivreurFast2026');await p.click('#pwGo');await p.waitForTimeout(500);
ok('Nouveau mot de passe enregistré → espace livreur',await p.evaluate(()=>AUTH&&AUTH.role==='driver'&&cur==='livreur'&&!S.users.find(x=>x.email==='wilfried@fastexpress.demo').mustChange));
await p.evaluate(()=>logout());await p.waitForTimeout(300);
await login(p,'wilfried@fastexpress.demo',tmp1,300);
ok('L\'ancien mot de passe provisoire ne fonctionne plus',/incorrect/.test(await loginErr(p)));
// partenaire
await login(p,'manager@fastexpress.demo','demo2026',500);
await p.evaluate(()=>{UF.tab='partner';location.hash='utilisateurs'});await p.waitForTimeout(300);
ok('Liste des partenaires (entreprises, responsables, comptes)',await p.evaluate(()=>document.querySelectorAll('#view tbody tr').length===S.partners.length&&/Sans compte/.test(document.querySelector('#view').textContent)));
await p.click('#uNew');await p.waitForTimeout(200);
await p.fill('#uf1','Librairie Akanda');await p.fill('#uf2','Mireille Ndong');await p.fill('#uf3','+241 066 10 20 30');await p.fill('#uf4','librairie.akanda@exemple.ga');
await p.click('#ufSave');await p.waitForTimeout(300);const tmp2=await p.$eval('#upPw',e=>e.textContent);await p.click('#upDone');
const np=await p.evaluate(()=>{const u=S.users.find(x=>x.email==='librairie.akanda@exemple.ga');const P=S.partners.find(x=>x.profileId===u.id);return{role:u.role,P:P&&P.company_name}});
ok('Création partenaire : compte partner + entreprise associée',np.role==='partner'&&np.P==='Librairie Akanda',JSON.stringify(np));
// accès pour une entreprise existante sans compte
const noAcc=await p.evaluate(()=>S.partners.find(x=>!x.profileId&&x.company_name!==COMPTOIR_NAME).id);
await p.click(`[data-ua="login"][data-id="${noAcc}"]`);await p.waitForTimeout(200);
ok('Entreprise existante : nom non modifiable lors de la création de son accès',await p.evaluate(()=>document.querySelector('#uf1').disabled));
await p.fill('#uf4','acces.existant@exemple.ga');await p.click('#ufSave');await p.waitForTimeout(300);await p.click('#upDone');
ok('Accès créé et associé à SA propre entreprise',await p.evaluate(id=>{const P=PA(id);const u=S.users.find(x=>x.id===P.profileId);return!!u&&u.role==='partner'&&u.email==='acces.existant@exemple.ga'},noAcc));
// désactivation partenaire
const pid=await p.evaluate(()=>S.partners.find(x=>x.company_name==='Librairie Akanda').id);
await p.click(`[data-ua="off"][data-id="${pid}"]`);await p.waitForTimeout(150);await p.click('#ufOk');await p.waitForTimeout(250);
ok('Partenaire désactivé (statut affiché)',await p.evaluate(id=>PA(id).active===false&&/Désactivé/.test(document.querySelector(`tr[data-uid="${id}"]`).textContent),pid));
await p.click('#newBtn');await p.waitForTimeout(200);
ok('Partenaire désactivé absent du formulaire « Nouveau colis »',await p.evaluate(id=>![...document.querySelectorAll('#nc1 option')].some(o=>o.value===id),pid));
await p.evaluate(()=>closeAll());
// désactivation livreur : refus s'il transporte des colis
const busy=await p.evaluate(()=>S.livreurs.find(l=>S.colis.some(c=>c.livreurId===l.id&&ACTIVE.includes(c.statut))).id);
await p.evaluate(()=>{UF.tab='driver';R.utilisateurs()});await p.click(`[data-ua="off"][data-id="${busy}"]`);await p.waitForTimeout(200);
ok('Livreur avec colis en cours : désactivation refusée (réaffecter d\'abord)',await p.evaluate(id=>LV(id).active!==false&&/réaffectez/.test(document.querySelector('#toasts')?.textContent||''),busy));
const wid=await p.evaluate(()=>S.livreurs.find(x=>x.nom==='Wilfried Biyogo').id);
await p.click(`[data-ua="off"][data-id="${wid}"]`);await p.waitForTimeout(150);await p.click('#ufOk');await p.waitForTimeout(250);
ok('Livreur désactivé : exclu des attributions',await p.evaluate(id=>{const c=S.colis.find(x=>x.statut==='en_attente')||S.colis[0];return evaluer(c,LV(id)).why==='Compte désactivé'},wid));
ok('Données conservées après désactivation (fiche et compte toujours présents)',await p.evaluate(id=>!!LV(id)&&!!S.users.find(u=>u.id===LV(id).profileId),wid));
await p.evaluate(()=>logout());await p.waitForTimeout(300);
await login(p,'wilfried@fastexpress.demo','LivreurFast2026',300);
ok('Compte désactivé : connexion refusée',/désactivé/.test(await loginErr(p)));
await login(p,'librairie.akanda@exemple.ga',tmp2,300);
ok('Partenaire désactivé : connexion refusée',/désactivé/.test(await loginErr(p)));
await login(p,'manager@fastexpress.demo','demo2026',500);
await p.evaluate(()=>{UF.tab='driver';location.hash='utilisateurs'});await p.waitForTimeout(250);
await p.click(`[data-ua="on"][data-id="${wid}"]`);await p.waitForTimeout(150);await p.click('#ufOk');await p.waitForTimeout(250);
await p.click(`[data-ua="pw"][data-id="${wid}"]`);await p.waitForTimeout(150);await p.click('#ufOk');await p.waitForTimeout(250);
const tmp3=await p.$eval('#upPw',e=>e.textContent);await p.click('#upDone');
await p.evaluate(()=>logout());await p.waitForTimeout(300);
await login(p,'wilfried@fastexpress.demo','LivreurFast2026',300);
ok('Réactivation + nouveau mot de passe provisoire : l\'ancien mot de passe est remplacé',/incorrect/.test(await loginErr(p)));
await login(p,'wilfried@fastexpress.demo',tmp3,300);
ok('Réactivé : connexion avec le mot de passe provisoire → changement demandé',!!(await p.$('#pw1')));
await p.click('#pwCancel');await p.waitForTimeout(200);
// partenaire et livreur : aucun accès à la gestion
await login(p,'gabon.tech.store@fastexpress.demo','demo2026',500);
ok('Partenaire : pas de rubrique de gestion des comptes',!(await nav(p)).includes('utilisateurs'));
await p.evaluate(()=>location.hash='utilisateurs');await p.waitForTimeout(250);
ok('Partenaire : page de gestion inaccessible directement',await p.evaluate(()=>cur!=='utilisateurs'));
const pt=await p.evaluate(async()=>{try{await accDo('set_active',{kind:'partner',id:S.partners[2].id,active:false});return'accepté'}catch(e){return e.message}});
ok('Partenaire : action de gestion refusée même appelée directement',/réservée au manager/.test(pt),pt);
ok('Partenaire : son espace habituel est intact',await p.evaluate(()=>{location.hash='partenaire';return true})&&(await p.waitForTimeout(250),await p.evaluate(()=>cur==='partenaire'&&!!document.querySelector('#pkTotal'))));
await c.close();

/* ====================== SUPABASE SIMULÉ ====================== */
// fonction serveur non activée → lecture seule
c=await ctxNew(cfg0);p=await c.newPage();watch(p);
await p.goto(SB);await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(500);
await login(p,'manager@test.ga','secret',1200);
await p.evaluate(()=>location.hash='utilisateurs');await p.waitForTimeout(300);
ok('Supabase sans fonction serveur : liste en lecture seule, message clair, aucun bouton de gestion',/Lecture seule/.test(await view(p))&&!(await p.$('#uNew'))&&!(await p.$('[data-ua]'))&&await p.evaluate(()=>!(window.__MOCKFN||[]).length));
await c.close();
// fonction serveur activée
c=await ctxNew(cfgOn);p=await c.newPage();watch(p);
await p.goto(SB);await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(500);
await login(p,'manager@test.ga','secret',1200);
await p.evaluate(()=>location.hash='utilisateurs');await p.waitForTimeout(700);
ok('Supabase : e-mails des comptes lus par la fonction serveur (action list)',/rodrigue@test\.ga/.test(await view(p))&&await p.evaluate(()=>(window.__MOCKFN||[]).some(x=>x.action==='list')));
ok('Supabase : la liste ne renvoie aucun mot de passe',await p.evaluate(async()=>{const r=await window.FEDB.admin('list');return r.accounts.length>0&&!JSON.stringify(r).match(/pass(word)?"\s*:\s*"/i)}));
await p.click('#uNew');await p.waitForTimeout(200);
await p.fill('#uf1','Junior Mve');await p.fill('#uf2','+241 077 99 88 77');await p.fill('#uf3','junior@test.ga');await p.selectOption('#uf4','Scooter');await p.selectOption('#uf7','Louis');
await p.click('#ufSave');await p.waitForTimeout(900);
const st1=await p.$eval('#upPw',e=>e.textContent).catch(()=>'');
await p.evaluate(t=>{window.__ST1=t},st1);
const db1=await p.evaluate(()=>{const a=__MOCKDB._auth['junior@test.ga'];const pr=a&&__MOCKDB.profiles.find(x=>x.id===a.id);const d=a&&__MOCKDB.drivers.find(x=>x.profile_id===a.id);return{a:!!a,must:!!(a&&a.app&&a.app.fe_pending&&a.banned&&a.pass!==window.__ST1),role:pr&&pr.role,active:pr&&pr.is_active,d:d&&{v:d.vehicle_type,z:d.zone,duty:d.is_on_duty},inApp:!!S.livreurs.find(l=>l.nom==='Junior Mve')}});
ok('Supabase : compte de connexion + profil driver + fiche drivers créés par la fonction serveur',/^[A-Za-z2-9]{12}$/.test(st1)&&db1.a&&db1.must&&db1.role==='driver'&&db1.active===true&&db1.d&&db1.d.v==='Scooter'&&db1.d.z==='Louis'&&db1.d.duty===false&&db1.inApp,JSON.stringify(db1));
await p.click('#upDone');await p.waitForTimeout(200);
// rôle impossible à choisir
const forced=await p.evaluate(async()=>{const r=await window.FEDB.admin('create_driver',{full_name:'Pirate Role',phone:'+241 077 00 00 01',email:'pirate@test.ga',vehicle_type:'Moto',zone:'Glass',role:'manager'});const pr=__MOCKDB.profiles.find(x=>x.id===r.profile_id);return pr.role});
ok('Supabase : le rôle ne peut pas être choisi (champ « role » ignoré → driver)',forced==='driver');
// partenaire
await p.evaluate(()=>{UF.tab='partner';R.utilisateurs()});await p.waitForTimeout(200);
await p.click('#uNew');await p.waitForTimeout(200);
await p.fill('#uf1','Pharmacie du Port');await p.fill('#uf2','Arnaud Mouele');await p.fill('#uf3','+241 066 20 30 40');await p.fill('#uf4','pharmacie@test.ga');
await p.click('#ufSave');await p.waitForTimeout(900);const st2=await p.$eval('#upPw',e=>e.textContent);await p.click('#upDone');
const db2=await p.evaluate(()=>{const a=__MOCKDB._auth['pharmacie@test.ga'];const P=__MOCKDB.partners.find(x=>x.profile_id===a.id);return{role:__MOCKDB.profiles.find(x=>x.id===a.id).role,P:P&&P.company_name}});
ok('Supabase : compte partner + entreprise associée à CE compte',db2.role==='partner'&&db2.P==='Pharmacie du Port',JSON.stringify(db2));
// colonnes NOT NULL réelles (09.0 b) : partners.contact_email et drivers.zone
ok('partners.contact_email renseigné à la création (e-mail du responsable)',await p.evaluate(()=>{const a=__MOCKDB._auth['pharmacie@test.ga'];return __MOCKDB.partners.find(x=>x.profile_id===a.id).contact_email==='pharmacie@test.ga'}));
ok('Aucune insertion refusée pour colonne obligatoire vide',await p.evaluate(()=>!__MOCKLOG.some(x=>/not null/.test(x.error||''))));
const noZone=await p.evaluate(async()=>{let msg;try{await window.FEDB.admin('create_driver',{full_name:'Sans Zone',phone:'+241 077 00 00 02',email:'sanszone@test.ga',vehicle_type:'Moto'});msg='accepté'}catch(e){msg=e.message}return{msg,acc:!!__MOCKDB._auth['sanszone@test.ga']}});
ok('Livreur sans zone : refusé AVANT toute création (message clair, aucun compte créé)',/zone principale/.test(noZone.msg)&&!noZone.acc,JSON.stringify(noZone));
const zEdit=await p.evaluate(async()=>{const d=__MOCKDB.drivers.find(x=>x.id==='d-2');const before=d.zone;let msg;try{await window.FEDB.admin('update_driver',{driver_id:'d-2',full_name:'Prisca Mba',phone:'+241 066 44 55 66',vehicle_type:'Scooter',zone:null});msg='accepté'}catch(e){msg=e.message}return{msg,same:d.zone===before}});
ok('Modification d\'un livreur sans zone : refusée, zone inchangée',/zone principale/.test(zEdit.msg)&&zEdit.same,JSON.stringify(zEdit));
// accès pour une entreprise existante : contact_email existant conservé
const acc3=await p.evaluate(async()=>{__MOCKDB.partners.push({id:'p-3',company_name:'Boutique Existante',contact_name:'Paul Ella',contact_phone:'+241 066 30 30 30',contact_email:'boutique@exemple.ga',profile_id:null});
 const r=await window.FEDB.admin('create_partner_login',{partner_id:'p-3',email:'acces.boutique@test.ga'});const P=__MOCKDB.partners.find(x=>x.id==='p-3');return{linked:P.profile_id===r.profile_id,ce:P.contact_email}});
ok('Entreprise existante : accès créé et lié, contact_email existant conservé (jamais vidé)',acc3.linked&&acc3.ce==='boutique@exemple.ga',JSON.stringify(acc3));
// e-mail déjà utilisé
const dup=await p.evaluate(async()=>{try{await window.FEDB.admin('create_partner',{company_name:'X Y',contact_name:'X Y',contact_phone:'+241 066 00 00 00',email:'gts@test.ga'});return'accepté'}catch(e){return e.message}});
ok('Supabase : e-mail déjà utilisé → message clair',/déjà utilisée/.test(dup),dup);
// désactivation : livreur avec colis refusé, livreur libre accepté (profil + connexion bloquée)
const busyD=await p.evaluate(async()=>{try{await window.FEDB.admin('set_active',{kind:'driver',id:'d-1',active:false});return'accepté'}catch(e){return e.message}});
ok('Supabase : livreur qui transporte des colis → désactivation refusée',/réaffectez/.test(busyD),busyD);
const jd=await p.evaluate(()=>S.livreurs.find(l=>l.nom==='Junior Mve').id);
await p.evaluate(()=>{UF.tab='driver';R.utilisateurs()});await p.waitForTimeout(200);
await p.click(`[data-ua="off"][data-id="${jd}"]`);await p.waitForTimeout(150);await p.click('#ufOk');await p.waitForTimeout(900);
ok('Supabase : livreur désactivé (is_active=false, connexion bloquée, hors service)',await p.evaluate(id=>{const d=__MOCKDB.drivers.find(x=>x.id===id);const pr=__MOCKDB.profiles.find(x=>x.id===d.profile_id);return pr.is_active===false&&__MOCKDB._auth['junior@test.ga'].banned===true&&d.is_on_duty===false&&LV(id).active===false},jd));
// jamais un manager
const mgr=await p.evaluate(async()=>{__MOCKDB.drivers.push({id:'d-x',profile_id:'u-mgr',vehicle_type:'Moto',vehicle_plate:null,zone:null,is_on_duty:false,consent_at:null});
 const out=[];for(const a of [['set_active',{kind:'driver',id:'d-x',active:false}],['reset_password',{kind:'driver',id:'d-x'}],['update_driver',{driver_id:'d-x',full_name:'X Y',phone:'+241 077 00 00 00',vehicle_type:'Moto'}]]){try{await window.FEDB.admin(a[0],a[1]);out.push('accepté')}catch(e){out.push(e.message)}}
 __MOCKDB.drivers=__MOCKDB.drivers.filter(x=>x.id!=='d-x');return{out,active:__MOCKDB.profiles.find(x=>x.id==='u-mgr').is_active!==false}});
ok('Supabase : aucun compte manager ne peut être modifié, désactivé ou réinitialisé (dernier manager protégé)',mgr.out.every(x=>/ne peut pas être géré/.test(x))&&mgr.active,JSON.stringify(mgr));
await p.evaluate(()=>logout());await p.waitForTimeout(500);
await login(p,'junior@test.ga',st1,800);
ok('Supabase : compte désactivé → connexion refusée (message en français)',/désactivé/.test(await loginErr(p)),await loginErr(p));
// première connexion : le mot de passe provisoire n'ouvre JAMAIS de session (imposé par le serveur)
const byp=await p.evaluate(async t=>{const sb=window.supabase.createClient(FE_CONFIG.supabaseUrl,FE_CONFIG.supabaseAnonKey);
 const r=await sb.auth.signInWithPassword({email:'pharmacie@test.ga',password:t});const u=await sb.auth.updateUser({data:{fe_pending:false,must_change_password:false}});
 const q=await sb.from('parcels').select('id');return{signErr:r.error&&r.error.message,session:!!(r.data&&r.data.session),upd:u.error&&u.error.message,pend:__MOCKDB._auth['pharmacie@test.ga'].app.fe_pending}},st2);
ok('Contournement impossible : le mot de passe provisoire n\'ouvre aucune session (requête directe)',!!byp.signErr&&!byp.session,JSON.stringify(byp));
ok('Contournement impossible : sans session, l\'utilisateur ne peut pas effacer l\'obligation',!!byp.upd&&byp.pend===true,JSON.stringify(byp));
const sel0=await p.evaluate(()=>(window.__MOCKSEL||[]).filter(x=>x.t==='parcels').length);
await login(p,'pharmacie@test.ga',st2,900);
ok('Supabase : première connexion → nouveau mot de passe exigé, aucune donnée chargée, aucune session',!!(await p.$('#pw1'))&&await p.evaluate(n=>!AUTH&&!localStorage.getItem('__mocksession')&&(window.__MOCKSEL||[]).filter(x=>x.t==='parcels').length===n,sel0));
await p.reload();await p.waitForTimeout(900);
ok('Après actualisation : retour à la connexion, toujours aucune session',!(await p.$('#pw1'))&&await p.evaluate(()=>!AUTH&&!localStorage.getItem('__mocksession')&&cur==='login'));
await login(p,'pharmacie@test.ga',st2,900);
ok('Reconnexion avec le mot de passe provisoire → le changement est de nouveau exigé',!!(await p.$('#pw1')));
await p.fill('#pw1','court1');await p.fill('#pw2','court1');await p.click('#pwGo');await p.waitForTimeout(200);
ok('Mot de passe trop simple refusé',/trop simple/.test(await p.$eval('#login',e=>e.textContent)));
const srvWeak=await p.evaluate(async t=>{try{await window.FEDB.firstLogin('pharmacie@test.ga',t,'abcdefghij');return'accepté'}catch(e){return e.code}},st2);
ok('Serveur : mot de passe faible refusé même en contournant le formulaire',srvWeak==='mot_de_passe_faible',srvWeak);
await p.fill('#pw1','Pharmacie2026x');await p.fill('#pw2','Pharmacie2026x');await p.click('#pwGo');await p.waitForTimeout(1200);
const fl=await p.evaluate(()=>{const a=__MOCKDB._auth['pharmacie@test.ga'];return{role:AUTH&&AUTH.role,cur,pend:a.app.fe_pending,banned:a.banned,co:PA(AUTH.partnerId)?.company_name,pass:a.pass==='Pharmacie2026x'}});
ok('Supabase : mot de passe remplacé par le serveur, compte débloqué, espace partenaire de SA propre entreprise',fl.role==='partner'&&fl.cur==='partenaire'&&fl.pend===false&&fl.banned===false&&fl.co==='Pharmacie du Port'&&fl.pass,JSON.stringify(fl));
const reuse=await p.evaluate(async t=>{try{await window.FEDB.firstLogin('pharmacie@test.ga',t,'Autre2026xyz');return'accepté'}catch(e){return e.code}},st2);
ok('Le mot de passe provisoire ne sert plus après la première connexion',reuse==='identifiants_invalides',reuse);
const exist=await p.evaluate(async()=>{try{await window.FEDB.firstLogin('gts@test.ga','secret');return'accepté'}catch(e){return e.code}});
ok('Comptes existants non concernés (pas d\'obligation, connexion normale inchangée)',exist==='identifiants_invalides');
// 5 essais faux → bloqué, même avec le bon mot de passe ensuite
const lock=await p.evaluate(async()=>{const out=[];for(let i=0;i<5;i++){try{await window.FEDB.firstLogin('pirate@test.ga','Mauvais'+i)}catch(e){out.push(e.code)}}return out});
ok('5 essais faux → blocage (trop_de_tentatives)',lock.slice(0,4).every(x=>x==='identifiants_invalides')&&lock[4]==='trop_de_tentatives',JSON.stringify(lock));
const lock2=await p.evaluate(async()=>{const t=__MOCKDB._auth['pirate@test.ga'].app.fe_temp;try{await window.FEDB.firstLogin('pirate@test.ga',t);return'accepté'}catch(e){return e.code}});
ok('Bloqué : même le bon mot de passe provisoire est refusé (nouveau mot de passe du manager nécessaire)',lock2==='trop_de_tentatives',lock2);
ok('Supabase : partenaire sans rubrique de gestion',!(await nav(p)).includes('utilisateurs'));
const pd=await p.evaluate(async()=>{const out=[];for(const a of [['list',{}],['create_partner',{company_name:'Pirate SA',contact_name:'Pi Rate',contact_phone:'+241 066 00 00 09',email:'pirate2@test.ga'}],['set_active',{kind:'partner',id:'p-1',active:false}]]){try{await window.FEDB.admin(a[0],a[1]);out.push('accepté')}catch(e){out.push(e.message)}}return out});
ok('Supabase : partenaire → toute action de gestion refusée par le serveur (requête directe)',pd.every(x=>/réservée à un manager/.test(x)),JSON.stringify(pd));
await p.evaluate(()=>logout());await p.waitForTimeout(500);
await login(p,'rodrigue@test.ga','secret',1500);
const dd=await p.evaluate(async()=>{try{await window.FEDB.admin('reset_password',{kind:'driver',id:'d-2'});return'accepté'}catch(e){return e.message}});
ok('Supabase : livreur → action de gestion refusée par le serveur',/réservée à un manager/.test(dd),dd);
await c.close();

ok('Aucune erreur JavaScript',errs.length===0,errs.join(' | '));
await b.close();
console.log(`\n${pass} réussis, ${fail} échoués`);process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
