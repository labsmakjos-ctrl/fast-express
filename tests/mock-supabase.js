/* Faux Supabase EN MÉMOIRE pour les tests : n'accepte que les colonnes confirmées par le client. */
(function(){
const ALLOWED={
 profiles:['id','full_name','phone','role'],
 partners:['id','company_name','contact_name','contact_phone','profile_id'],
 drivers:['id','profile_id','vehicle_type','vehicle_plate','zone','is_on_duty','consent_at'],
 driver_locations:['id','driver_id','lat','lng','accuracy','speed','heading','battery_level','is_charging','recorded_at','created_at'],
 parcels:['id','tracking_number','tracking_token','confirmation_code','client_name','client_phone','delivery_address','status','driver_id','partner_id','delivery_lat','delivery_lng','precision','proof_photo_url','postponed_date'],
 parcel_events:['id','parcel_id','author_id','author_role','status','reason','lat','lng','created_at'],
};
const STATUSES=['pending','picked_up','in_transit','delivered','postponed','cancelled'];
const LOG=window.__MOCKLOG=[];
const now=Date.now();const iso=t=>new Date(t).toISOString();
const DB=window.__MOCKDB=JSON.parse(localStorage.getItem('__mockdb')||'null')||{
 profiles:[{id:'u-mgr',full_name:'Aurélie Moussavou',phone:'+241 077 20 14 58',role:'manager'},{id:'u-d1',full_name:'Rodrigue Ondo',phone:'+241 077 11 22 33',role:'driver'},{id:'u-d2',full_name:'Prisca Mba',phone:'+241 066 44 55 66',role:'driver'},{id:'u-p1',full_name:'Nadège Obame',phone:'+241 074 10 20 30',role:'partner'}],
 partners:[{id:'p-0',company_name:'Comptoir agence',contact_name:'Accueil',contact_phone:'+241 011 44 20 20',profile_id:null},{id:'p-1',company_name:'Gabon Tech Store',contact_name:'Nadège Obame',contact_phone:'+241 074 10 20 30',profile_id:'u-p1'}],
 drivers:[{id:'d-1',profile_id:'u-d1',vehicle_type:'Moto',vehicle_plate:'EE-123-AA',zone:'Glass',is_on_duty:true,consent_at:iso(now-9e8)},{id:'d-2',profile_id:'u-d2',vehicle_type:'Scooter',vehicle_plate:'GE-456-BC',zone:'Nzeng-Ayong',is_on_duty:true,consent_at:null}],
 driver_locations:[{id:1,driver_id:'d-1',lat:0.379,lng:9.444,accuracy:10,speed:null,heading:null,battery_level:80,is_charging:false,recorded_at:iso(now-3e5),created_at:iso(now-3e5)}],
 parcels:[
  {id:'a1',tracking_number:'FE-26-20001',tracking_token:'tok-a1',confirmation_code:'1111',client_name:'Gaëlle Nguema',client_phone:'+241 066 00 00 01',delivery_address:'Derrière la pharmacie',status:'pending',driver_id:null,partner_id:'p-1',delivery_lat:0.3780,delivery_lng:9.4620,precision:null,proof_photo_url:null,postponed_date:null},
  {id:'a2',tracking_number:'FE-26-20002',tracking_token:'tok-a2',confirmation_code:'2222',client_name:'Junior Ella',client_phone:'+241 066 00 00 02',delivery_address:'Face au marché',status:'pending',driver_id:'d-1',partner_id:'p-0',delivery_lat:0.3940,delivery_lng:9.4570,precision:null,proof_photo_url:null,postponed_date:null},
  {id:'a3',tracking_number:'FE-26-20003',tracking_token:'tok-a3',confirmation_code:'3333',client_name:'Chancelle Ovono',client_phone:'+241 066 00 00 03',delivery_address:'Immeuble blanc',status:'postponed',driver_id:'d-1',partner_id:'p-1',delivery_lat:0.4170,delivery_lng:9.4860,precision:null,proof_photo_url:null,postponed_date:null},
  {id:'a4',tracking_number:'FE-26-20004',tracking_token:'tok-a4',confirmation_code:'4444',client_name:'Brice Ndong',client_phone:'+241 066 00 00 04',delivery_address:'Villa jaune',status:'postponed',driver_id:'d-2',partner_id:'p-1',delivery_lat:0.4110,delivery_lng:9.4330,precision:null,proof_photo_url:null,postponed_date:iso(now+864e5)},
  {id:'a5',tracking_number:'FE-26-20005',tracking_token:'tok-a5',confirmation_code:'5555',client_name:'Merveille Obame',client_phone:'+241 066 00 00 05',delivery_address:'Rond-point',status:'delivered',driver_id:'d-2',partner_id:'p-1',delivery_lat:null,delivery_lng:null,precision:null,proof_photo_url:null,postponed_date:null}],
 parcel_events:[{id:1,parcel_id:'a2',author_id:'u-mgr',author_role:'manager',status:'pending',reason:'Attribué manuellement à Rodrigue Ondo',lat:null,lng:null,created_at:iso(now-36e5)},{id:2,parcel_id:'a3',author_id:'u-d1',author_role:'driver',status:'postponed',reason:'Échec : Destinataire injoignable',lat:0.41,lng:9.48,created_at:iso(now-18e5)}],
};
const USERS={'manager@test.ga':'u-mgr','rodrigue@test.ga':'u-d1','prisca@test.ga':'u-d2','gts@test.ga':'u-p1'};
const persist=()=>localStorage.setItem('__mockdb',JSON.stringify(DB));
const err=m=>({data:null,error:{message:m}});
function badCols(t,cols){return cols.filter(c=>!ALLOWED[t].includes(c))}
const listeners=[];
class Q{
 constructor(t){this.t=t;this.op='select';this.f=[];this.ord=null;this.lim=null;this.one=null;this.cols=null}
 select(c){if(this.op==='select'||this.op==='insert'){this.cols=c}if(this.op==='select')this.cols=c;return this}
 insert(r){this.op='insert';this.rows=Array.isArray(r)?r:[r];return this}
 update(p){this.op='update';this.patch=p;return this}
 eq(c,v){this.f.push([c,'eq',v]);return this}
 in(c,v){this.f.push([c,'in',v]);return this}
 order(c,o){this.ord=[c,o&&o.ascending!==false];return this}
 limit(n){this.lim=n;return this}
 maybeSingle(){this.one='maybe';return this}
 single(){this.one='single';return this}
 then(res,rej){return Promise.resolve(this.exec()).then(res,rej)}
 exec(){
  const t=this.t;if(!ALLOWED[t])return err('relation "'+t+'" does not exist');
  const used=[...this.f.map(x=>x[0]),...(this.ord?[this.ord[0]]:[])];
  const selCols=(this.cols||'*')==='*'?ALLOWED[t]:this.cols.split(',').map(s=>s.trim()).filter(Boolean);
  const bad=badCols(t,[...used,...selCols]);if(bad.length){LOG.push({t,op:this.op,error:'colonne inconnue '+bad});return err('column '+t+'.'+bad[0]+' does not exist')}
  const match=r=>this.f.every(([c,o,v])=>o==='eq'?r[c]===v:v.includes(r[c]));
  if(this.op==='select'){let rows=DB[t].filter(match);if(this.ord){const [c,a]=this.ord;rows=rows.slice().sort((x,y)=>(x[c]>y[c]?1:x[c]<y[c]?-1:0)*(a?1:-1))}if(this.lim)rows=rows.slice(0,this.lim);rows=rows.map(r=>Object.fromEntries(selCols.map(c=>[c,r[c]??null])));
   if(this.one)return{data:rows[0]||null,error:this.one==='single'&&!rows[0]?{message:'no rows'}:null};return{data:rows,error:null}}
  if(this.op==='insert'){const out=[];for(const r of this.rows){const b=badCols(t,Object.keys(r));if(b.length){LOG.push({t,op:'insert',error:'colonne inconnue '+b});return err('column "'+b[0]+'" of relation "'+t+'" does not exist')}
    if((t==='parcels'||t==='parcel_events')&&r.status&&!STATUSES.includes(r.status)){LOG.push({t,op:'insert',error:'statut '+r.status});return err('violates check constraint status')}
    const row=Object.assign({},r);if(!row.id)row.id=t==='parcels'?'n'+Math.random().toString(36).slice(2,9):DB[t].length+1;if(ALLOWED[t].includes('created_at')&&!row.created_at)row.created_at=new Date().toISOString();DB[t].push(row);out.push(row);LOG.push({t,op:'insert',row});
    listeners.forEach(l=>l(t,'INSERT',row))}
   persist();const sc=(this.cols||'id').split(',');const d=out.map(r=>Object.fromEntries(sc.map(c=>[c,r[c]])));return{data:this.one?d[0]:d,error:null}}
  if(this.op==='update'){const b=badCols(t,Object.keys(this.patch));if(b.length){LOG.push({t,op:'update',error:'colonne inconnue '+b});return err('column "'+b[0]+'" does not exist')}
   if(t==='parcels'&&this.patch.status&&!STATUSES.includes(this.patch.status)){LOG.push({t,op:'update',error:'statut '+this.patch.status});return err('violates check constraint status')}
   const rows=DB[t].filter(match);rows.forEach(r=>{Object.assign(r,this.patch);listeners.forEach(l=>l(t,'UPDATE',r))});LOG.push({t,op:'update',patch:this.patch,n:rows.length});persist();return{data:null,error:null}}
 }
}
let session=JSON.parse(localStorage.getItem('__mocksession')||'null');
const client={
 from:t=>new Q(t),
 auth:{
  async signInWithPassword({email,password}){const id=USERS[email];if(!id||password!=='secret')return{data:{},error:{message:'Invalid login credentials'}};session={user:{id,email}};localStorage.setItem('__mocksession',JSON.stringify(session));return{data:{user:session.user,session},error:null}},
  async getSession(){return{data:{session},error:null}},
  async signOut(){session=null;localStorage.removeItem('__mocksession');return{error:null}}},
 channel(){const ch={hs:[],on(ev,f,cb){this.hs.push([f,cb]);return this},subscribe(){listeners.push((t,e,row)=>this.hs.forEach(([f,cb])=>{if(f.table===t&&(f.event==='*'||f.event===e))setTimeout(()=>cb({new:row,eventType:e}),10)}));window.__CH=this;return this}};return ch},
 removeChannel(){},
 storage:{from:b=>({async upload(path){LOG.push({t:'storage',bucket:b,path});return{data:{path},error:null}},async createSignedUrls(ps){return{data:ps.map(p=>({path:p,signedUrl:'data:image/gif;base64,R0lGODlhAQABAAAAACw='})),error:null}}})},
 async rpc(){return err('function does not exist')},
};
window.supabase={createClient:(url,key)=>{window.__KEY=key;return client}};
})();
