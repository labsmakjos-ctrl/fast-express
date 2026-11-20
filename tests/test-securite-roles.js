/* Règles de sécurité simulées (état APRÈS supabase/08, proposition non exécutée) — faux Supabase uniquement.
   A. GPS : un livreur enregistre SA position ; jamais celle d'un autre (requête directe comprise).
      Reproduction de la règle défectueuse (driver_id comparé à auth.uid()) → message clair.
   B. Création des colis : manager uniquement ; partenaire refusé même par requête directe. */
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
const D=__dirname+'/';const SB='http://localhost:8765/index.html?mode=supabase';
let pass=0,fail=0;const ok=(n,c,i='')=>{c?pass++:fail++;console.log((c?'OK   ':'ÉCHEC')+' '+n+(i?' — '+String(i).slice(0,220):''))};
(async()=>{
const b=await chromium.launch();const errs=[];
const realCfg=fs.readFileSync(path.join(__dirname,'..','js','config.js'),'utf8');
if(!/mode: 'demo'/.test(realCfg))throw new Error('config.js : le site doit rester en démo par défaut');
const cfg=realCfg.replace(/supabaseAnonKey: '[^']*'/,"supabaseAnonKey: 'sb_publishable_TEST'");
const mock=fs.readFileSync(D+'mock-supabase.js','utf8');
async function ctxNew(){const c=await b.newContext({viewport:{width:1200,height:850},permissions:['geolocation'],geolocation:{latitude:0.3801,longitude:9.4452,accuracy:9}});
 await c.route('**/js/config.js',r=>r.fulfill({contentType:'application/javascript',body:cfg}));
 await c.route('**/vendor/supabase.js',r=>r.fulfill({contentType:'application/javascript',body:mock}));
 await c.route(/basemaps\.cartocdn|openstreetmap|arcgisonline/,r=>r.fulfill({status:204,body:''}));return c}
const watch=pg=>{pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|ERR_|row-level security|refusée par RLS|Position non enregistrée/.test(m.text()))errs.push(m.text())})};
const login=async(p,email)=>{await p.fill('#lg1',email);await p.fill('#lg2','secret');await p.click('#lgGo');await p.waitForTimeout(1500)};
const direct=(p,table,row)=>p.evaluate(async([t,r])=>{const sb=window.supabase.createClient(FE_CONFIG.supabaseUrl,FE_CONFIG.supabaseAnonKey);const x=await sb.from(t).insert(r);return x.error?x.error.message:'accepté'},[table,row]);
const pos=id=>({driver_id:id,lat:0.39,lng:9.45,accuracy:10,speed:null,heading:null,battery_level:null,is_charging:null,recorded_at:new Date().toISOString()});

/* ---------- A. GPS du livreur ---------- */
let c=await ctxNew();let p=await c.newPage();watch(p);
await p.goto(SB);await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(500);
ok('Envoi GPS toujours réglé sur 2 minutes',await p.evaluate(()=>CFG.gpsIntervalMs===120000));
await login(p,'rodrigue@test.ga');
const own=await p.evaluate(()=>__MOCKLOG.filter(x=>x.t==='driver_locations'));
ok('Livreur : sa propre position est enregistrée (driver_id = sa fiche drivers, pas son compte)',own.some(x=>x.op==='insert'&&x.row&&x.row.driver_id==='d-1')&&!own.some(x=>x.rls),JSON.stringify(own).slice(0,200));
const n2=await p.evaluate(()=>__MOCKDB.driver_locations.filter(x=>x.driver_id==='d-2').length);
ok('Livreur : requête directe au nom d\'un autre livreur → refusée (RLS)',/row-level security/.test(await direct(p,'driver_locations',pos('d-2'))));
ok('Livreur : requête directe en lot (sa position + celle d\'un autre) → tout est refusé',/row-level security/.test(await direct(p,'driver_locations',[pos('d-1'),pos('d-2')])));
const viaApp=await p.evaluate(async r=>{try{await window.FEDB.run('location',{id:'d-2'},r);return'accepté'}catch(e){return e.message}},pos('d-2'));
ok('Livreur : même par l\'application, aucune position pour un autre livreur',/Position non enregistrée/.test(viaApp),viaApp);
ok('Aucune position ajoutée pour l\'autre livreur',await p.evaluate(()=>__MOCKDB.driver_locations.filter(x=>x.driver_id==='d-2').length)===n2);
// règle défectueuse (cause probable de l'erreur réelle) : message clair au livreur
await p.evaluate(()=>{window.__LOC_POLICY='broken'});
await p.evaluate(()=>{GPS.sentTs=0;GPS.last={coords:{latitude:0.381,longitude:9.446,accuracy:8,speed:null,heading:null},timestamp:Date.now()};return gpsSend()});await p.waitForTimeout(500);
const bro=await p.evaluate(()=>({err:GPS.sendErr,ui:document.querySelector('#drv').textContent}));
ok('Règle défectueuse (driver_id = auth.uid()) : reproduit le refus « row-level security »',await p.evaluate(()=>__MOCKLOG.some(x=>x.t==='driver_locations'&&x.rls)));
ok('Refus RLS : message clair en français pour le livreur',/Position non enregistrée : Supabase refuse/.test(bro.err)&&/Position non enregistrée/.test(bro.ui),bro.err);
await p.evaluate(()=>{window.__LOC_POLICY=null});
await p.evaluate(()=>logout());await p.waitForTimeout(500);
// partenaire et manager : aucune écriture directe dans driver_locations
await login(p,'gts@test.ga');
ok('Partenaire : requête directe dans driver_locations → refusée',/row-level security/.test(await direct(p,'driver_locations',pos('d-1'))));
ok('Partenaire : aucune lecture de driver_locations (accès refusé, suivi via track_parcel)',await p.evaluate(async()=>{const sb=window.supabase.createClient(FE_CONFIG.supabaseUrl,FE_CONFIG.supabaseAnonKey);const r=await sb.from('driver_locations').select('driver_id');return!!r.error}));
await p.evaluate(()=>logout());await p.waitForTimeout(500);
await login(p,'manager@test.ga');
ok('Manager : lit toujours les positions des livreurs',await p.evaluate(()=>!!LV('d-1')&&!!LV('d-1').posAt));
ok('Manager : ne peut pas inscrire une position au nom d\'un livreur',/row-level security/.test(await direct(p,'driver_locations',pos('d-1'))));

/* ---------- B. Création des colis ---------- */
const row=n=>({tracking_number:'FE-TEST-'+n,tracking_token:'9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c'+String(n).padStart(2,'0'),client_name:'Test '+n,client_phone:'',delivery_address:'x',status:'pending',partner_id:'p-1'});
ok('Manager : création directe acceptée',(await direct(p,'parcels',row(1)))==='accepté');
await p.evaluate(()=>logout());await p.waitForTimeout(500);
await login(p,'gts@test.ga');
ok('Partenaire : création directe refusée (RLS)',/row-level security/.test(await direct(p,'parcels',row(2))));
ok('Partenaire : bouton et formulaire de création absents',await p.evaluate(()=>{newColisModal();return document.querySelector('#newBtn').hidden&&!document.querySelector('#modal').classList.contains('on')}));
ok('Partenaire : ne voit que ses colis',await p.evaluate(()=>S.colis.length>0&&S.colis.every(x=>x.partnerId==='p-1')));
await p.evaluate(()=>logout());await p.waitForTimeout(500);
await login(p,'rodrigue@test.ga');
ok('Livreur : création directe de colis refusée',/row-level security/.test(await direct(p,'parcels',row(3))));
ok('Aucun colis créé par le partenaire ni le livreur',await p.evaluate(()=>__MOCKDB.parcels.filter(x=>/FE-TEST-/.test(x.tracking_number)).map(x=>x.tracking_number).join()==='FE-TEST-1'));
await c.close();

ok('Aucune erreur JavaScript',errs.length===0,errs.join(' | '));
await b.close();
console.log(`\n${pass} réussis, ${fail} échoués`);process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
