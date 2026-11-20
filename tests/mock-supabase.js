/* Faux Supabase EN MÉMOIRE pour les tests : n'accepte que les colonnes confirmées par le client. */
(function(){
const ALLOWED={
 profiles:['id','full_name','phone','role','is_active','created_at','updated_at'],
 partners:['id','company_name','contact_name','contact_phone','contact_email','profile_id'],
 drivers:['id','profile_id','vehicle_type','vehicle_plate','zone','is_on_duty','consent_at'],
 driver_locations:['id','driver_id','lat','lng','accuracy','speed','heading','battery_level','is_charging','recorded_at','created_at'],
 parcels:['id','tracking_number','tracking_token','confirmation_code','client_name','client_phone','delivery_address','status','driver_id','partner_id','delivery_lat','delivery_lng','proof_photo_url','postponed_date','created_at','updated_at','delivered_at','postponed_reason','cancellation_reason'],
 parcel_events:['id','parcel_id','author_id','author_role','status','reason','lat','lng','created_at','metadata'],
};
const STATUSES=['pending','picked_up','in_transit','delivered','postponed','cancelled'];
const LOG=window.__MOCKLOG=[];
const now=Date.now();const iso=t=>new Date(t).toISOString();
const DB=window.__MOCKDB=JSON.parse(localStorage.getItem('__mockdb')||'null')||{
 profiles:[{id:'u-mgr',full_name:'Aurélie Moussavou',phone:'+241 077 20 14 58',role:'manager'},{id:'u-d1',full_name:'Rodrigue Ondo',phone:'+241 077 11 22 33',role:'driver'},{id:'u-d2',full_name:'Prisca Mba',phone:'+241 066 44 55 66',role:'driver'},{id:'u-p1',full_name:'Nadège Obame',phone:'+241 074 10 20 30',role:'partner',is_active:true},{id:'u-off',full_name:'Compte Désactivé',phone:'',role:'driver',is_active:false},{id:'u-p2',full_name:'Partenaire Bloqué',phone:'',role:'partner',is_active:true}],
 partners:[{id:'p-0',company_name:'Comptoir agence',contact_name:'Accueil',contact_phone:'+241 011 44 20 20',contact_email:'agence@test.ga',profile_id:null},{id:'p-1',company_name:'Gabon Tech Store',contact_name:'Nadège Obame',contact_phone:'+241 074 10 20 30',contact_email:'contact@gts.ga',profile_id:'u-p1'},{id:'p-2',company_name:'Boutique Bloquée',contact_name:'X',contact_phone:'',contact_email:'x@bloquee.ga',profile_id:'u-p2'}],
 drivers:[{id:'d-1',profile_id:'u-d1',vehicle_type:'Moto',vehicle_plate:'EE-123-AA',zone:'Glass',is_on_duty:true,consent_at:iso(now-9e8)},{id:'d-2',profile_id:'u-d2',vehicle_type:'Scooter',vehicle_plate:'GE-456-BC',zone:'Nzeng-Ayong',is_on_duty:true,consent_at:null}],
 driver_locations:[{id:1,driver_id:'d-1',lat:0.379,lng:9.444,accuracy:10,speed:null,heading:null,battery_level:80,is_charging:false,recorded_at:iso(now-3e5),created_at:iso(now-3e5)}],
 parcels:[
  {id:'a1',tracking_number:'FE-26-20001',tracking_token:'tok-a1',confirmation_code:'1111',client_name:'Gaëlle Nguema',client_phone:'+241 066 00 00 01',delivery_address:'Derrière la pharmacie',status:'pending',driver_id:null,partner_id:'p-1',delivery_lat:0.3780,delivery_lng:9.4620,proof_photo_url:null,postponed_date:null},
  {id:'a2',tracking_number:'FE-26-20002',tracking_token:'tok-a2',confirmation_code:'2222',client_name:'Junior Ella',client_phone:'+241 066 00 00 02',delivery_address:'Face au marché',status:'pending',driver_id:'d-1',partner_id:'p-0',delivery_lat:0.3940,delivery_lng:9.4570,proof_photo_url:null,postponed_date:null},
  {id:'a3',tracking_number:'FE-26-20003',tracking_token:'tok-a3',confirmation_code:'3333',client_name:'Chancelle Ovono',client_phone:'+241 066 00 00 03',delivery_address:'Immeuble blanc',status:'postponed',driver_id:'d-1',partner_id:'p-1',delivery_lat:0.4170,delivery_lng:9.4860,proof_photo_url:null,postponed_date:null},
  {id:'a4',tracking_number:'FE-26-20004',tracking_token:'tok-a4',confirmation_code:'4444',client_name:'Brice Ndong',client_phone:'+241 066 00 00 04',delivery_address:'Villa jaune',status:'postponed',driver_id:'d-2',partner_id:'p-1',delivery_lat:0.4110,delivery_lng:9.4330,proof_photo_url:null,postponed_date:iso(now+864e5)},
  {id:'a5',tracking_number:'FE-26-20005',tracking_token:'tok-a5',confirmation_code:'5555',client_name:'Merveille Obame',client_phone:'+241 066 00 00 05',delivery_address:'Rond-point',status:'delivered',driver_id:'d-2',partner_id:'p-1',delivery_lat:null,delivery_lng:null,proof_photo_url:null,postponed_date:null}],
 parcel_events:[{id:1,parcel_id:'a2',author_id:'u-mgr',author_role:'manager',status:'pending',reason:'Attribué manuellement à Rodrigue Ondo',lat:null,lng:null,created_at:iso(now-36e5)},{id:2,parcel_id:'a3',author_id:'u-d1',author_role:'driver',status:'postponed',reason:'Échec : Destinataire injoignable',lat:0.41,lng:9.48,created_at:iso(now-18e5)}],
};
const USERS={'manager@test.ga':'u-mgr','rodrigue@test.ga':'u-d1','prisca@test.ga':'u-d2','gts@test.ga':'u-p1','off@test.ga':'u-off','bloque@test.ga':'u-p2'};
window.__MOCKUSERS=USERS;
/* Comptes de connexion simulés (auth.users) : mot de passe par défaut « secret », métadonnées, blocage */
if(!DB._auth){DB._auth={};Object.entries(USERS).forEach(([m,id])=>{DB._auth[m]={id,pass:'secret',meta:{},banned:false}})}
const AU=()=>DB._auth;const auByid=id=>Object.entries(AU()).find(([m,a])=>a.id===id);
const persist=()=>localStorage.setItem('__mockdb',JSON.stringify(DB));
const err=m=>({data:null,error:{message:m}});
function badCols(t,cols){return cols.filter(c=>!ALLOWED[t].includes(c))}
const listeners=[];
const PGBC=new BroadcastChannel('mockpg');
PGBC.onmessage=({data:m})=>{const tb=DB[m.t];if(!tb)return;const i=tb.findIndex(r=>r.id===m.row.id);if(i>=0)tb[i]=Object.assign({},m.row);else tb.push(Object.assign({},m.row));
 if(window.__PG_DOWN)return;listeners.forEach(l=>l(m.t,m.e,m.row))};
class Q{
 constructor(t){this.t=t;this.op='select';this.f=[];this.ord=null;this.lim=null;this.one=null;this.cols=null}
 select(c){this.cols=c;return this}
 insert(r){this.op='insert';this.rows=Array.isArray(r)?r:[r];return this}
 update(p){this.op='update';this.patch=p;return this}
 eq(c,v){this.f.push([c,'eq',v]);return this}
 in(c,v){this.f.push([c,'in',v]);return this}
 gt(c,v){this.f.push([c,'gt',v]);return this}
 order(c,o){this.ord=[c,o&&o.ascending!==false];return this}
 limit(n){this.lim=n;return this}
 maybeSingle(){this.one='maybe';return this}
 single(){this.one='single';return this}
 then(res,rej){return Promise.resolve(this.exec()).then(res,rej)}
 exec(){
  const t=this.t;if(!navigator.onLine){LOG.push({t,op:this.op,offline:true});return err('TypeError: Failed to fetch')}
  if(!ALLOWED[t])return err('relation "'+t+'" does not exist');
  const uid=session&&session.user.id;const prof=DB.profiles.find(p=>p.id===uid);
  if(this.op==='select'&&prof&&prof.role==='partner'&&(t==='drivers'||t==='driver_locations'))return{data:null,error:{code:'42501',message:'permission denied for table '+t}};
  if(this.op==='select'&&uid==='u-p2'&&t==='parcels')return{data:null,error:{code:'42501',message:'permission denied for table parcels'}};
  const used=[...this.f.map(x=>x[0]),...(this.ord?[this.ord[0]]:[])];
  const selCols=(this.cols||'*')==='*'?ALLOWED[t]:this.cols.split(',').map(s=>s.trim()).filter(Boolean);
  if(window.__COL_PROTECT&&t==='parcels'){const w=this.op==='select'?[...used,...selCols]:this.op==='insert'?this.rows.flatMap(r=>Object.keys(r)):this.op==='update'?Object.keys(this.patch):[];
   if(w.includes('confirmation_code')){LOG.push({t,op:this.op,error:'colonne protégée'});return{data:null,error:{code:'42501',message:'permission denied for table parcels'}}}}
  const bad=badCols(t,[...used,...selCols]);if(bad.length){LOG.push({t,op:this.op,error:'colonne inconnue '+bad});return err('column '+t+'.'+bad[0]+' does not exist')}
  const match=r=>this.f.every(([c,o,v])=>o==='eq'?r[c]===v:o==='gt'?r[c]>v:v.includes(r[c]));
  const rlsVisible=r=>!(t==='parcels'&&prof&&prof.role==='partner')||DB.partners.some(x=>x.id===r.partner_id&&x.profile_id===uid);
  if(this.op==='select'){(window.__MOCKSEL=window.__MOCKSEL||[]).push({t,uid:uid||null});(window.__MOCKCOLS=window.__MOCKCOLS||[]).push({t,cols:String(this.cols||'*')});let rows=DB[t].filter(match).filter(rlsVisible);if(this.ord){const [c,a]=this.ord;rows=rows.slice().sort((x,y)=>(x[c]>y[c]?1:x[c]<y[c]?-1:0)*(a?1:-1))}if(this.lim)rows=rows.slice(0,this.lim);rows=rows.map(r=>Object.fromEntries(selCols.map(c=>[c,r[c]??null])));
   if(this.one)return{data:rows[0]||null,error:this.one==='single'&&!rows[0]?{message:'no rows'}:null};return{data:rows,error:null}}
  /* RLS simulée = état APRÈS supabase/08 (proposition non exécutée) :
     driver_locations : un livreur actif insère uniquement pour SA fiche drivers ; personne d'autre.
       __LOC_POLICY='broken' reproduit une règle qui compare driver_id à auth.uid() (cause probable du refus réel).
     parcels : création réservée au manager actif (__PARCEL_INSERT_OPEN=true reproduit une base sans cette règle). */
  if(this.op==='insert'&&t==='driver_locations'){const rlsErr={data:null,error:{code:'42501',message:'new row violates row-level security policy for table "driver_locations"'}};
   const own=prof&&prof.role==='driver'&&prof.is_active!==false?DB.drivers.filter(d=>d.profile_id===uid).map(d=>d.id):[];
   const okRow=r=>window.__LOC_POLICY==='broken'?r.driver_id===uid:own.includes(r.driver_id);
   if(!this.rows.every(okRow)){LOG.push({t,op:'insert',rls:true,rows:this.rows.map(r=>r.driver_id)});return rlsErr}}
  if(this.op==='insert'&&t==='parcels'&&!window.__PARCEL_INSERT_OPEN&&!(prof&&prof.role==='manager'&&prof.is_active!==false)){
   LOG.push({t,op:'insert',rls:true});return{data:null,error:{code:'42501',message:'new row violates row-level security policy for table "parcels"'}}}
  if(this.op==='insert'&&window.__FAIL_INSERT&&t==='parcels'){LOG.push({t,op:'insert',error:'panne simulée'});return err('simulated failure')}
  if(this.op==='insert'){window.__REQ=(window.__REQ||[]);window.__REQ.push({t,n:this.rows.length});const out=[];for(const r of this.rows){const b=badCols(t,Object.keys(r));if(b.length){LOG.push({t,op:'insert',error:'colonne inconnue '+b});return err('column "'+b[0]+'" of relation "'+t+'" does not exist')}
    if((t==='parcels'||t==='parcel_events')&&r.status&&!STATUSES.includes(r.status)){LOG.push({t,op:'insert',error:'statut '+r.status});return err('violates check constraint status')}
    if(t==='parcels'&&DB.parcels.some(x=>x.tracking_number===r.tracking_number)){LOG.push({t,op:'insert',dup:r.tracking_number});return{data:null,error:{code:'23505',message:'duplicate key value violates unique constraint "parcels_tracking_number_key"',details:'Key (tracking_number)=('+r.tracking_number+') already exists.'}}}
    const row=Object.assign({},r);if(t==='parcels'&&window.__HAS_CODE_RPC&&(row.confirmation_code==null||String(row.confirmation_code).trim()===''))row.confirmation_code=String(1000+crypto.getRandomValues(new Uint32Array(1))[0]%9000);if(!row.id)row.id=t==='parcels'?'n'+Math.random().toString(36).slice(2,9):DB[t].length+1;if(ALLOWED[t].includes('created_at')&&!row.created_at)row.created_at=new Date().toISOString();DB[t].push(row);out.push(row);LOG.push({t,op:'insert',row,sent:Object.keys(r)});
    listeners.forEach(l=>l(t,'INSERT',row));PGBC.postMessage({t,e:'INSERT',row})}
   persist();const sc=(this.cols||'id').split(',');const d=out.map(r=>Object.fromEntries(sc.map(c=>[c,r[c]])));return{data:this.one?d[0]:d,error:null}}
  if(this.op==='update'){const b=badCols(t,Object.keys(this.patch));if(b.length){LOG.push({t,op:'update',error:'colonne inconnue '+b});return err('column "'+b[0]+'" does not exist')}
   if(t==='parcels'&&this.patch.status&&!STATUSES.includes(this.patch.status)){LOG.push({t,op:'update',error:'statut '+this.patch.status});return err('violates check constraint status')}
   let rows=DB[t].filter(match);
   // RLS simulée sur partners : manager = tout ; partenaire = sa fiche seulement SI la politique 07 est « installée » (__PARTNER_UPD_POLICY) ; sinon 0 ligne, sans erreur (comme PostgREST)
   if(t==='partners'&&!(prof&&prof.role==='manager'))rows=window.__PARTNER_UPD_POLICY&&prof&&prof.role==='partner'?rows.filter(r=>r.profile_id===uid):[];
   if(t==='partners'&&window.__PARTNER_UPD_POLICY&&prof&&prof.role==='partner'&&('company_name' in this.patch||'profile_id' in this.patch||'id' in this.patch)){LOG.push({t,op:'update',error:'garde-fou 07'});return err('Seul FAST EXPRESS peut modifier le nom, le compte ou l\'identifiant de l\'entreprise')}
   rows.forEach(r=>{Object.assign(r,this.patch);listeners.forEach(l=>l(t,'UPDATE',r));PGBC.postMessage({t,e:'UPDATE',row:r})});LOG.push({t,op:'update',patch:this.patch,n:rows.length});persist();
   if(this.cols){const sc=this.cols.split(',').map(x=>x.trim());return{data:rows.map(r=>Object.fromEntries(sc.map(c=>[c,r[c]??null]))),error:null}}return{data:null,error:null}}
 }
}
/* Même logique que public.track_parcel (SQL validé) : jeton UUID, un seul colis, champs publics seulement,
   position du livreur seulement si colis in_transit + livreur en service + position < 10 min. */
function trackParcel(tok){
 if(typeof tok!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tok))return null;
 const m=DB.parcels.filter(p=>p.tracking_token===tok);if(m.length!==1)return null;const p=m[0];
 const st={pending:p.driver_id?'attribue':'en_attente',picked_up:'recupere',in_transit:'en_cours',delivered:'livre',postponed:p.postponed_date?'reporte':'echec',cancelled:'annule'}[p.status]||'inconnu';
 const pa=DB.partners.find(x=>x.id===p.partner_id);let drv=null,veh=null,pos=null;
 if(p.driver_id&&['pending','picked_up','in_transit'].includes(p.status)){const d=DB.drivers.find(x=>x.id===p.driver_id);const pr=d&&DB.profiles.find(x=>x.id===d.profile_id);
  drv=pr&&pr.full_name?String(pr.full_name).trim().split(' ')[0]||null:null;veh=d?d.vehicle_type:null}
 if(p.status==='in_transit'&&p.driver_id){const d=DB.drivers.find(x=>x.id===p.driver_id);
  const l=d&&d.is_on_duty===true?DB.driver_locations.filter(x=>x.driver_id===p.driver_id).sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at))[0]:null;const n=Date.now();
  if(l&&l.lat>=-90&&l.lat<=90&&l.lng>=-180&&l.lng<=180&&Date.parse(l.created_at)>=n-6e5&&Date.parse(l.recorded_at)>=n-6e5&&Date.parse(l.recorded_at)<=n+12e4)
   pos={lat:Math.round(l.lat*1e5)/1e5,lng:Math.round(l.lng*1e5)/1e5,accuracy_m:l.accuracy>=0&&l.accuracy<=1e5?Math.round(l.accuracy):null,recorded_at:l.recorded_at}}
 const ev=DB.parcel_events.filter(e=>e.parcel_id===p.id).sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at)).slice(0,100).reverse().map(e=>{const r=e.reason||'';
  return{status:{pending:/^(Attribué|Réaffecté|Confié)/.test(r)?'attribue':'en_attente',picked_up:'recupere',in_transit:'en_cours',delivered:'livre',postponed:/^Échec/.test(r)?'echec':'reporte',cancelled:'annule'}[e.status]||'inconnu',at:e.created_at}});
 return{tracking_number:p.tracking_number,status:st,created_at:p.created_at||null,delivered_at:p.delivered_at||null,postponed_date:p.postponed_date?String(p.postponed_date).slice(0,10):null,
  partner_name:pa?pa.company_name:null,driver_first_name:drv,vehicle_type:veh,driver_position:pos,events:ev,server_time:new Date().toISOString()}}
/* Même logique que la proposition supabase/05a_verification_code_serveur.sql */
const ATTEMPTS=window.__ATTEMPTS=[];
function refus(code,status=400){const e=new Error(code);e.code=code;e.status=status;throw e}
function adminFn(b){
 const uid=session&&session.user.id;
 if(b.action!=='first_login'){if(!uid)refus('non_connecte',401);   // seule la première connexion est publique
  const me=DB.profiles.find(p=>p.id===uid);if(!me||me.role!=='manager'||me.is_active===false)refus('reserve_au_manager',403)}
 const txt=(v,min,max,c)=>{const s=typeof v==='string'?v.trim().replace(/\s+/g,' '):'';if(s.length<min||s.length>max)refus(c);return s};
 const mail=v=>{const s=txt(v,5,160,'email_invalide').toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s))refus('email_invalide');return s};
 const tel=v=>{const s=txt(v,8,30,'telephone_invalide');if(s.replace(/\D/g,'').length<8)refus('telephone_invalide');return s};
 const tmp=()=>{const A='ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';const a=crypto.getRandomValues(new Uint32Array(12));const s=[...a].map(x=>A[x%A.length]).join('');return/\d/.test(s)&&/[A-Z]/.test(s)&&/[a-z]/.test(s)?s:tmp()};
 const unusable=()=>'X'+Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2);
 const pend=(a,pw)=>Object.assign(a,{pass:unusable(),banned:true,app:{fe_pending:true,fe_temp:pw,fe_attempts:0}});
 const login=(m,name,t,role)=>{if(AU()[m])refus('email_deja_utilise',409);const id='u-'+Math.random().toString(36).slice(2,10);const pw=tmp();
  AU()[m]=pend({id,meta:{full_name:name}},pw);DB.profiles.push({id,full_name:name,phone:t,role,is_active:true});return{id,pw}};
 const NOTNULL={drivers:['profile_id','vehicle_type','zone'],partners:['company_name','contact_name','contact_phone','contact_email']};
 const nn=(t,r)=>{const m=NOTNULL[t].find(c=>r[c]==null);if(m){LOG.push({t,op:'insert',error:'not null '+m});refus('creation_fiche_impossible',500)}};
 const managed=(pid,role)=>{const p=DB.profiles.find(x=>x.id===pid);if(!p)refus('compte_introuvable',404);if(p.role!==role)refus('role_incompatible',403);return p};
 const setMail=(pid,m)=>{if(!m)return;const e=auByid(pid);if(!e||e[0]===m)return;if(AU()[m])refus('email_deja_utilise',409);AU()[m]=e[1];delete AU()[e[0]]};
 const out=(()=>{switch(b.action){
  case 'list':{const ids=new Set(DB.profiles.filter(p=>['driver','partner'].includes(p.role)).map(p=>p.id));
   return{accounts:Object.entries(AU()).filter(([m,a])=>ids.has(a.id)).map(([m,a])=>({id:a.id,email:m,last_sign_in_at:null,blocked:!!a.banned,must_change_password:!!(a.app&&a.app.fe_pending),locked:!!(a.app&&a.app.fe_pending&&a.app.fe_attempts>=5)}))}}
  case 'create_driver':{const n=txt(b.full_name,2,80,'nom_invalide'),t=tel(b.phone),m=mail(b.email),v=txt(b.vehicle_type,2,40,'vehicule_invalide'),z=txt(b.zone,2,40,'zone_invalide');const {id,pw}=login(m,n,t,'driver');
   const d={id:'d-'+Math.random().toString(36).slice(2,8),profile_id:id,vehicle_type:v,vehicle_plate:b.vehicle_plate||null,zone:z,is_on_duty:false,consent_at:null};nn('drivers',d);DB.drivers.push(d);return{profile_id:id,driver_id:d.id,email:m,temp_password:pw}}
  case 'create_partner':{const co=txt(b.company_name,2,100,'entreprise_invalide'),n=txt(b.contact_name,2,80,'nom_invalide'),t=tel(b.contact_phone),m=mail(b.email);const {id,pw}=login(m,n,t,'partner');
   const p={id:'p-'+Math.random().toString(36).slice(2,8),company_name:co,contact_name:n,contact_phone:t,contact_email:m,profile_id:id};nn('partners',p);DB.partners.push(p);return{profile_id:id,partner_id:p.id,email:m,temp_password:pw}}
  case 'create_partner_login':{const p=DB.partners.find(x=>x.id===b.partner_id);if(!p)refus('partenaire_introuvable',404);if(p.profile_id)refus('partenaire_a_deja_un_compte',409);
   const n=txt(b.contact_name||p.contact_name,2,80,'nom_invalide'),t=tel(b.contact_phone||p.contact_phone),m=mail(b.email);const {id,pw}=login(m,n,t,'partner');Object.assign(p,{profile_id:id,contact_name:n,contact_phone:t});return{profile_id:id,partner_id:p.id,email:m,temp_password:pw}}
  case 'update_driver':{const d=DB.drivers.find(x=>x.id===b.driver_id);if(!d||!d.profile_id)refus('livreur_introuvable',404);const pr=managed(d.profile_id,'driver');
   const n=txt(b.full_name,2,80,'nom_invalide'),t=tel(b.phone),v=txt(b.vehicle_type,2,40,'vehicule_invalide'),z=txt(b.zone,2,40,'zone_invalide');setMail(d.profile_id,b.email?mail(b.email):null);
   Object.assign(pr,{full_name:n,phone:t});Object.assign(d,{vehicle_type:v,vehicle_plate:b.vehicle_plate||null,zone:z});return{}}
  case 'update_partner':{const p=DB.partners.find(x=>x.id===b.partner_id);if(!p)refus('partenaire_introuvable',404);
   const co=txt(b.company_name,2,100,'entreprise_invalide'),n=txt(b.contact_name,2,80,'nom_invalide'),t=tel(b.contact_phone);
   if(p.profile_id){const pr=managed(p.profile_id,'partner');setMail(p.profile_id,b.email?mail(b.email):null);Object.assign(pr,{full_name:n,phone:t})}
   Object.assign(p,{company_name:co,contact_name:n,contact_phone:t});return{}}
  case 'set_active':{const kind=b.kind==='driver'?'driver':b.kind==='partner'?'partner':refus('type_invalide');if(typeof b.active!=='boolean')refus('etat_invalide');
   const row=(kind==='driver'?DB.drivers:DB.partners).find(x=>x.id===b.id);if(!row)refus('compte_introuvable',404);if(!row.profile_id)refus('pas_de_compte',409);
   const pr=managed(row.profile_id,kind);
   if(kind==='driver'&&!b.active){if(DB.parcels.some(x=>x.driver_id===row.id&&['pending','picked_up','in_transit'].includes(x.status)))refus('livreur_a_des_colis',409);row.is_on_duty=false}
   pr.is_active=b.active;const e=auByid(row.profile_id);if(e)e[1].banned=!b.active||!!(e[1].app&&e[1].app.fe_pending);return{active:b.active}}
  case 'reset_password':{const kind=b.kind==='driver'?'driver':b.kind==='partner'?'partner':refus('type_invalide');
   const row=(kind==='driver'?DB.drivers:DB.partners).find(x=>x.id===b.id);if(!row||!row.profile_id)refus('pas_de_compte',409);managed(row.profile_id,kind);
   const e=auByid(row.profile_id);const pw=tmp();pend(e[1],pw);return{temp_password:pw}}
  case 'first_login':{const m=mail(b.email);const temp=typeof b.temp_password==='string'?b.temp_password:'';const a=AU()[m];
   if(!temp||!a||!a.app||a.app.fe_pending!==true)refus('identifiants_invalides',401);
   if(a.app.fe_attempts>=5)refus('trop_de_tentatives',429);
   if(temp!==a.app.fe_temp){a.app.fe_attempts++;persist();if(a.app.fe_attempts>=5)refus('trop_de_tentatives',429);refus('identifiants_invalides',401)}
   const pr=DB.profiles.find(x=>x.id===a.id);if(!pr||pr.is_active!==true||!['driver','partner'].includes(pr.role))refus('compte_desactive',403);
   if(b.new_password==null)return{pending:true};
   const np=typeof b.new_password==='string'?b.new_password:'';if(!(np.length>=10&&/[A-Za-z]/.test(np)&&/\d/.test(np)))refus('mot_de_passe_faible');if(np===temp)refus('mot_de_passe_identique');
   Object.assign(a,{pass:np,banned:false,app:{fe_pending:false,fe_temp:null,fe_attempts:0}});return{done:true}}
  default:refus('action_inconnue')}})();
 persist();return out}
function confirmDelivery(a){
 const uid=session&&session.user.id;const no=e=>({ok:false,error:e});if(!uid)return no('not_allowed');
 const pr=DB.profiles.find(x=>x.id===uid);if(!pr||pr.is_active===false||pr.role==null||!['manager','driver'].includes(pr.role))return no('not_allowed');
 const p=DB.parcels.find(x=>x.id===a.p_parcel_id);if(!p)return no('not_found');
 if(pr.role==='driver'&&!DB.drivers.some(d=>d.profile_id===uid&&d.id===p.driver_id))return no('not_allowed');
 if(p.status==null||p.status!=='in_transit')return no('bad_status');
 if(typeof a.p_code!=='string'||!/^[0-9]{4}$/.test(a.p_code))return no('bad_code');
 const lastReset=Math.max(0,...ATTEMPTS.filter(x=>x.parcel_id===p.id&&x.kind==='reset').map(x=>x.t));
 const fails=ATTEMPTS.filter(x=>x.parcel_id===p.id&&x.kind==='fail'&&Date.now()-x.t<9e5&&x.t>lastReset).length;if(fails>=5)return no('locked');
 if(p.confirmation_code==null||String(p.confirmation_code).trim()!==a.p_code){ATTEMPTS.push({parcel_id:p.id,kind:'fail',t:Date.now()});return{ok:false,error:'code_incorrect',remaining:Math.max(5-fails-1,0)}}
 ATTEMPTS.push({parcel_id:p.id,kind:'success',t:Date.now()});
 Object.assign(p,{status:'delivered',delivered_at:new Date().toISOString(),updated_at:new Date().toISOString()});LOG.push({t:'parcels',op:'rpc_update',row:p});
 const ev={id:DB.parcel_events.length+1,parcel_id:p.id,status:'delivered',reason:'Remis au destinataire · code vérifié par le serveur',author_id:uid,author_role:pr.role,lat:a.p_lat??null,lng:a.p_lng??null,created_at:new Date().toISOString()};
 DB.parcel_events.push(ev);LOG.push({t:'parcel_events',op:'rpc_insert',row:ev});persist();
 listeners.forEach(l=>l('parcels','UPDATE',p));PGBC.postMessage({t:'parcels',e:'UPDATE',row:p});return{ok:true}}
let session=JSON.parse(localStorage.getItem('__mocksession')||'null');const AUTHL=window.__AUTHL=[];
const client={
 from:t=>new Q(t),
 auth:{
  async signInWithPassword({email,password}){const a=AU()[String(email||'').toLowerCase()];if(!a||password!==a.pass)return{data:{},error:{message:'Invalid login credentials'}};
   if(a.banned)return{data:{},error:{message:'User is banned'}};
   session={user:{id:a.id,email:String(email).toLowerCase(),user_metadata:Object.assign({},a.meta)}};localStorage.setItem('__mocksession',JSON.stringify(session));return{data:{user:session.user,session},error:null}},
  async updateUser({password,data}){if(!session)return{data:null,error:{message:'Auth session missing!'}};const e=auByid(session.user.id);if(!e)return{data:null,error:{message:'User not found'}};
   if(password!=null){if(password===e[1].pass)return{data:null,error:{message:'New password should be different from the old password.'}};if(String(password).length<6)return{data:null,error:{message:'Password should be at least 6 characters.'}};e[1].pass=password}
   if(data)Object.assign(e[1].meta,data);session.user.user_metadata=Object.assign({},e[1].meta);localStorage.setItem('__mocksession',JSON.stringify(session));persist();(window.__AUTHUPD=window.__AUTHUPD||[]).push({id:e[0],password:password!=null,data});return{data:{user:session.user},error:null}},
  async getSession(){return{data:{session},error:null}},
  async signOut(){const had=!!session;session=null;localStorage.removeItem('__mocksession');if(had)AUTHL.forEach(f=>setTimeout(()=>f('SIGNED_OUT',null),0));return{error:null}},
  onAuthStateChange(f){AUTHL.push(f);return{data:{subscription:{unsubscribe(){}}}}}},
 channel(name,opts){const key=opts&&opts.config&&opts.config.presence&&opts.config.presence.key;
  const ch={name,key,hs:[],rt:[],pres:{},mine:null,bc:null,
   on(ev,f,cb){if(ev==='postgres_changes')this.hs.push([f,cb]);else this.rt.push([ev,f,cb]);return this},
   subscribe(statusCb){
    if(this.hs.length){listeners.push((t,e,row)=>!window.__PG_DOWN&&this.hs.forEach(([f,cb])=>{if(f.table===t&&(f.event==='*'||f.event===e))setTimeout(()=>cb({new:row,eventType:e}),10)}));window.__CH=this}
    if(this.rt.length){const self=this;window.__RTCH=this;
     if(window.__RT_DOWN){setTimeout(()=>statusCb&&statusCb('CHANNEL_ERROR'),10);return this}
     this.bc=new BroadcastChannel('mockrt:'+name);
     const sync=()=>this.rt.forEach(([ev,f,cb])=>{if(ev==='presence'&&f.event==='sync')cb()});
     this.bc.onmessage=({data:m})=>{
      if(m.kind==='broadcast')self.rt.forEach(([ev,f,cb])=>{if(ev==='broadcast'&&f.event===m.event)cb({payload:m.payload})});
      else if(m.kind==='presence'){if(m.state)self.pres[m.key]=m.state;else delete self.pres[m.key];sync()}
      else if(m.kind==='hello'&&self.mine)self.bc.postMessage({kind:'presence',key:self.key,state:self.mine})};
     this.bc.postMessage({kind:'hello'});setTimeout(()=>statusCb&&statusCb('SUBSCRIBED'),10)}
    return this},
   async send(m){if(window.__RT_DOWN||!this.bc)return'error';LOG.push({t:'realtime',event:m.event,payload:m.payload});this.bc.postMessage({kind:'broadcast',event:m.event,payload:m.payload});return'ok'},
   async track(st){this.mine=st;if(this.bc)this.bc.postMessage({kind:'presence',key:this.key,state:st});return'ok'},
   async untrack(){this.mine=null;if(this.bc)this.bc.postMessage({kind:'presence',key:this.key,state:null});return'ok'},
   presenceState(){const o={};Object.entries(this.pres).forEach(([k,v])=>o[k]=[v]);return o}};
  return ch},
 removeChannel(ch){if(ch&&ch.bc){try{ch.bc.close()}catch(e){}ch.bc=null}},
/* Même logique que supabase/functions/admin-users/index.ts (fonction serveur simulée) */
 functions:{async invoke(name,{body}={}){(window.__MOCKFN=window.__MOCKFN||[]).push({name,action:body&&body.action});
  const res=(ok,o,status=200)=>ok?{data:Object.assign({ok:true},o),error:null}:{data:null,error:{message:'Edge Function returned a non-2xx status code',context:{status,json:async()=>({ok:false,error:o})}}};
  if(!navigator.onLine)return{data:null,error:{message:'Failed to send a request to the Edge Function'}};
  if(name!=='admin-users')return{data:null,error:{message:'Function not found'}};
  try{return res(true,adminFn(body||{}))}catch(e){return res(false,e.code||'erreur_serveur',e.status||500)}}},
 storage:{from:b=>({async upload(path){LOG.push({t:'storage',bucket:b,path});return{data:{path},error:null}},async createSignedUrls(ps){return{data:ps.map(p=>({path:p,signedUrl:'data:image/gif;base64,R0lGODlhAQABAAAAACw='})),error:null}}})},
 async rpc(name,args){(window.__MOCKRPC=window.__MOCKRPC||[]).push({name,args});
  if(!navigator.onLine)return err('TypeError: Failed to fetch');
  if(window.__RPC_DOWN)return err('Service indisponible');
  if(name==='get_delivery_code'){if(!window.__HAS_CODE_RPC)return err('Could not find the function public.get_delivery_code');
   const uid=session&&session.user.id;const pr=uid&&DB.profiles.find(x=>x.id===uid);if(!pr||pr.is_active===false||pr.role!=='manager')return{data:null,error:null};
   const p=DB.parcels.find(x=>x.id===(args&&args.p_parcel_id));return{data:p&&['pending','picked_up','in_transit','postponed'].includes(p.status)&&p.confirmation_code!=null?String(p.confirmation_code).trim():null,error:null}}
  if(name==='confirm_delivery'){if(!window.__HAS_CONFIRM_RPC)return err('Could not find the function public.confirm_delivery');return{data:confirmDelivery(args||{}),error:null}}
  if(name!=='track_parcel')return err('function does not exist');
  return{data:trackParcel(args&&args.p_token),error:null}},
};
window.supabase={createClient:(url,key)=>{window.__KEY=key;return client}};
})();
