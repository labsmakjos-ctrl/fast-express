/* =========================================================
   FAST EXPRESS — prototype de démonstration (données fictives)
   ========================================================= */
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const NF=new Intl.NumberFormat('fr-FR');
const fcfa=n=>NF.format(Math.round(n))+' FCFA';
const MIN=6e4,H=36e5,D=864e5;
const sod=t=>{const d=new Date(t);d.setHours(0,0,0,0);return d.getTime()};
const hm=t=>new Date(t).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
function dayLabel(t){const diff=Math.round((sod(Date.now())-sod(t))/D);if(diff===0)return"Aujourd'hui";if(diff===1)return'Hier';const s=new Date(t).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'});return s[0].toUpperCase()+s.slice(1)}
function ago(t){const s=(Date.now()-t)/1e3;if(s<60)return"à l'instant";if(s<3600)return`il y a ${Math.floor(s/60)} min`;if(s<6*3600)return`il y a ${Math.floor(s/3600)} h`;return(sod(t)===sod(Date.now())?"aujourd'hui":dayLabel(t).toLowerCase())+' à '+hm(t)}

/* ---------- Logo officiel (image fournie, intégrée telle quelle) ---------- */
const LOGO='assets/logo.png';
/* Image 175×140 : le disque blanc est centré en x=94 ; on recadre en cercle sans déformer */
const logoHtml=sz=>`<span class="brandlogo" style="width:${sz}px;height:${sz}px"><img src="${LOGO}" alt="Logo FAST EXPRESS Delivery" style="left:${-(94-70)*sz/140}px"></span>`;
function mountLogos(root=document){root.querySelectorAll('[data-logo]').forEach(el=>{const sz=+el.dataset.logo;el.outerHTML=logoHtml(sz).replace('class="brandlogo"','class="'+el.className+'"')})}

/* ---------- Icônes ---------- */
const I={
grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
box:'<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
route:'<circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="5" r="2.5"/><path d="M8.5 19H16a3.5 3.5 0 000-7H8a3.5 3.5 0 010-7h7.5"/>',
users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 010 6.8M18.5 14.8c1.6.8 2.6 2.6 3 5.2"/>',
map:'<path d="M9 4L3 6.5v13.5L9 17.5l6 2.5 6-2.5V4l-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>',
clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
chat:'<path d="M20.5 11.5a8.5 8.5 0 01-12.6 7.4L3.5 20.5l1.6-4.2A8.5 8.5 0 1120.5 11.5z"/>',
phone:'<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
search:'<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
plus:'<path d="M12 5v14M5 12h14"/>',
x:'<path d="M6 6l12 12M18 6L6 18"/>',
check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
alert:'<path d="M12 3.5l9.5 16.5h-19z"/><path d="M12 10v4.5M12 17.5v.01"/>',
truck:'<path d="M2.5 6.5h11v10h-11zM13.5 10h4.5l3.5 3.5v3h-8"/><circle cx="7" cy="17.5" r="2"/><circle cx="17.5" cy="17.5" r="2"/>',
pin:'<path d="M12 21s-7-6.2-7-11.5a7 7 0 0114 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
bolt:'<path d="M13 2.5L4.5 13.5H12l-1 8 8.5-11H12z"/>',
refresh:'<path d="M20 11a8 8 0 00-14.5-4.5L4 8M4 4v4h4M4 13a8 8 0 0014.5 4.5L20 16M20 20v-4h-4"/>',
send:'<path d="M21 3L10 14M21 3l-7 18-4-7-7-4z"/>',
star:'<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',
eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
cash:'<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>',
call:'<path d="M5 3.5h3.5l1.8 4.5-2.3 1.4a11 11 0 006.6 6.6l1.4-2.3 4.5 1.8V19a2 2 0 01-2 2A16.5 16.5 0 013 5.5a2 2 0 012-2z"/>',
gauge:'<path d="M4 18a8 8 0 1116 0"/><path d="M12 18l4-6"/>',
};
const ic=(n,s=18)=>`<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n]}</svg>`;

/* ---------- Référentiels ---------- */
const CFG=window.FE_CONFIG||{};
const MODE=CFG.mode==='supabase'?'supabase':'demo';
/* Colonnes facultatives : en mode Supabase, une fonctionnalité n'est affichée que si sa colonne est confirmée dans config.js */
const OPT=((CFG.optionalColumns||{}).parcels)||{};
const HAS={cod:MODE==='demo'||!!OPT.codAmount,type:MODE==='demo'||!!OPT.parcelType,weight:MODE==='demo'||!!OPT.weight,fee:MODE==='demo'||!!OPT.deliveryFee};
/* Utilisateur connecté : {userId, role:'manager'|'driver'|'partner', name, driverId, partnerId} */
let AUTH=null;
const isMgr=()=>AUTH?.role==='manager';
const isDriver=()=>AUTH?.role==='driver';
const isPartner=()=>AUTH?.role==='partner';
const me0=()=>AUTH?(AUTH.role==='manager'?AUTH.name.replace(/^(\S)\S*\s/,'$1. '):AUTH.name):'Système';
/* Coordonnées APPROXIMATIVES des centres de quartiers de Libreville (démonstration, à vérifier sur le terrain).
   Les calculs internes utilisent des coordonnées planes x,y (1 unité = 34 m) dérivées de la latitude et de la longitude. */
const GEO0={lat:0.56,lng:9.30},UNIT_KM=0.034,KX=111.32*Math.cos(0.4*Math.PI/180)/UNIT_KM,KY=110.57/UNIT_KM;
const toXY=(lat,lng)=>({x:(lng-GEO0.lng)*KX,y:(GEO0.lat-lat)*KY});
const toLL=(x,y)=>({lat:+(GEO0.lat-y/KY).toFixed(6),lng:+(GEO0.lng+x/KX).toFixed(6)});
const ZONES=[['Akanda',0.5250,9.4060],['Angondjé',0.4930,9.4170],['Okala',0.4620,9.4430],['Charbonnages',0.4450,9.4260],
 ['Atong Abè',0.4420,9.4740],['Batterie IV',0.4260,9.4310],['Haut de Gué-Gué',0.4210,9.4500],['Louis',0.4110,9.4330],
 ['Nzeng-Ayong',0.4170,9.4860],['Plaine Orety',0.3990,9.4390],['Mont-Bouët',0.3940,9.4570],['Nombakélé',0.3880,9.4520],
 ['PK8',0.4100,9.5150],['Bellevue',0.3860,9.4790],['Glass',0.3780,9.4430],['Akébé',0.3780,9.4620],
 ['Sotega',0.3700,9.4900],['Oloumi',0.3650,9.4520],['Lalala',0.3560,9.4730],['Owendo',0.2970,9.5040]]
 .map(([n,lat,lng])=>({n,lat,lng,...toXY(lat,lng)}));
const ZI=Object.fromEntries(ZONES.map(z=>[z.n,z]));
const HQ={n:'Agence FAST EXPRESS · Glass',lat:0.3765,lng:9.4455,...toXY(0.3765,9.4455)};
/* Décision 5 : le quartier n'est déduit des coordonnées que si elles sont proches d'un centre de quartier connu */
const ZONE_RADIUS=(CFG.zoneRadiusKm||1.2)/UNIT_KM;
function zoneOf(p){if(!p||!Number.isFinite(p.x))return null;let best=null,bd=Infinity;ZONES.forEach(z=>{const d=Math.hypot(z.x-p.x,z.y-p.y);if(d<bd){bd=d;best=z}});return bd<=ZONE_RADIUS?best.n:null}
const zoneLabel=c=>c.zone||'Quartier non déterminé';
const REPERES=['Derrière la pharmacie, portail bleu','Face à la station-service, 2e ruelle','À côté de l\'école publique','Près du marché, boutique d\'angle','Immeuble blanc, 1er étage, porte 3','Ruelle après la boulangerie','Face au maquis « Chez Tantine »','Après le carrefour, maison à clôture verte','Derrière l\'église, villa jaune','En face de la cabine téléphonique','Résidence Les Palmiers, bâtiment B','À 50 m du rond-point, côté gauche'];
const PRE=['Jean-Marc','Prisca','Ulrich','Aurélie','Davy','Christelle','Rodrigue','Fabrice','Stéphanie','Landry','Gaëlle','Hervé','Nadège','Yannick','Sandrine','Brice','Murielle','Arnaud','Ornella','Cédric','Joëlle','Guy-Roger','Laetitia','Franck','Merveille','Junior','Chancelle','Wilfried'];
const NOM=['Ndong','Mba','Nzé','Moussavou','Obiang','Mintsa','Ondo','Nguema','Boussougou','Mabika','Ella','Essono','Koumba','Mouele','Nzamba','Bekale','Obame','Mavoungou','Ntoutoume','Ovono','Makaya','Engone','Mihindou','Biyogo'];
const EXP=['Élégance Couture','Gabon Tech Store','Saveurs du Komo','Pharmacie des Charbonnages','Kiosque Numérique','Atelier Okoumé','Beauté Équatoriale','Librairie Ozavino'];
const COMPTOIR_NAME='Comptoir agence';
const TYPES={standard:'Colis standard',document:'Document',fragile:'Fragile',express:'Express (2 h)'};
/* Statuts de l'interface. Correspondance avec la colonne parcels.status de Supabase :
   en_attente / attribue → pending (sans / avec livreur) · recupere → picked_up · en_cours → in_transit
   livre → delivered · reporte → postponed (avec postponed_date) · echec → postponed (sans date) · annule → cancelled */
const ST={
 en_attente:{l:'En attente',c:'p-neutral'},attribue:{l:'Attribué',c:'p-info'},recupere:{l:'Colis récupéré',c:'p-info'},
 en_cours:{l:'En cours de livraison',c:'p-gold'},livre:{l:'Livré',c:'p-ok'},echec:{l:'Échec',c:'p-bad'},
 reporte:{l:'Reporté',c:'p-warn'},annule:{l:'Annulé',c:'p-muted'}};
const DB_STATUS={en_attente:'pending',attribue:'pending',recupere:'picked_up',en_cours:'in_transit',livre:'delivered',echec:'postponed',reporte:'postponed',annule:'cancelled'};
const ACTIVE=['attribue','recupere','en_cours'];
const MOTIFS_REP=['Destinataire absent','Destinataire injoignable','Client demande un autre créneau','Adresse introuvable ou incomplète','Accès impossible (pluie, route coupée)','Paiement non disponible'];
const MOTIFS_ANN=['Refusé par le destinataire','Commande annulée par le client','Colis endommagé','Erreur de destinataire'];
const MOTIFS=['Destinataire injoignable','Absent à l\'adresse','Adresse introuvable','Refus du colis','Paiement non disponible'];
const CRENEAUX=['Demain matin (8 h – 12 h)','Demain après-midi (14 h – 18 h)','Après-demain','À convenir avec le client'];
/* Date et heure enregistrées dans postponed_date pour chaque créneau */
function creneauDate(label,base=Date.now()){const d=new Date(base);d.setHours(0,0,0,0);const i=CRENEAUX.indexOf(label);
 if(i===0){d.setDate(d.getDate()+1);d.setHours(8)}else if(i===1){d.setDate(d.getDate()+1);d.setHours(14)}else if(i===2){d.setDate(d.getDate()+2);d.setHours(8)}else{d.setDate(d.getDate()+1);d.setHours(12)}return d.getTime()}
const creneauLabel=t=>{if(!t)return'À convenir avec le client';const d=new Date(t);return d.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})+' à partir de '+d.getHours()+' h'};
/* Décision 3 : deux états seulement (colonne drivers.is_on_duty) */
const LST={disponible:{l:'En service',c:'p-ok'},hors_service:{l:'Hors service',c:'p-neutral'}};
const onDuty=l=>l.statut==='disponible';
/* Décision 4 : capacité provisoire selon le type de véhicule (drivers.vehicle_type) */
const CAPACITIES=Object.assign({moto:5,scooter:4,voiture:8,velo:3},CFG.capacities||{});
const vehicleKind=v=>/voiture|car|toyota|suzuki|auto/i.test(v||'')?'voiture':/scoot/i.test(v||'')?'scooter':/v[ée]lo|bike/i.test(v||'')?'velo':'moto';
const CAP_DEF=v=>CAPACITIES[vehicleKind(v)];
const capOf=l=>CAP_DEF(l.vehicule);
const AVC=['#0e8a65','#1d5ea8','#b5651d','#7a3fa0','#c13d2b','#2b7a8a','#8a6d1d','#46596b'];
const DEF_TPL={
 creation:{l:'Colis enregistré',on:true,t:'Bonjour {prenom}, votre colis {code} expédié par {expediteur} a bien été enregistré par FAST EXPRESS. Suivez-le ici : {lien}'},
 attribue:{l:'Livreur attribué',on:true,t:'Votre colis {code} est confié à {livreur} ({tel_livreur}). Livraison prévue aujourd\'hui ({zone}).'},
 recupere:{l:'Colis récupéré',on:false,t:'{livreur} a récupéré votre colis {code} à l\'agence. Il vous préviendra au départ.'},
 en_cours:{l:'En route',on:true,t:'{livreur} est en route vers vous ({adresse}). Votre code de livraison : {otp}. Montant à régler : {cod}.'},
 livre:{l:'Colis livré',on:true,t:'Votre colis {code} a été livré à {heure}. Merci de votre confiance, l\'équipe FAST EXPRESS.'},
 echec:{l:'Échec de livraison',on:true,t:'Nous n\'avons pas pu livrer votre colis {code} ({motif}). Répondez à ce message pour choisir un nouveau créneau.'},
 reporte:{l:'Livraison reportée',on:true,t:'Votre livraison {code} est reportée ({motif}). Nouveau créneau proposé : {creneau}. Répondez à ce message pour le modifier.'},
 annule:{l:'Colis annulé',on:true,t:'Votre colis {code} a été annulé ({motif}). Contactez {expediteur} pour plus d\'informations.'}};

/* ---------- Aléatoire déterministe ---------- */
let _s=1;const rnd=()=>{_s=(_s*16807)%2147483647;return(_s-1)/2147483646};
const ri=(a,b)=>a+Math.floor(rnd()*(b-a+1));const pick=a=>a[Math.floor(rnd()*a.length)];
const tel=()=>`+241 0${pick(['77','74','66','62','65','76'])} ${ri(10,99)} ${ri(10,99)} ${ri(10,99)}`;
const person=()=>pick(PRE)+' '+pick(NOM);
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const km=u=>u*UNIT_KM;
function fraisCalc(pt,type,poids){let f=1500+Math.round(km(dist(pt||HQ,HQ))*180/100)*100;if(type==='express')f+=1500;if(type==='fragile')f+=1000;if(poids>5)f+=1000;if(poids>15)f+=1500;return Math.round(f/500)*500}
const initials=n=>String(n||'?').split(/[\s-]+/).filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase();
const first=n=>String(n||'').split(' ')[0];
const uuid=()=>(crypto.randomUUID?crypto.randomUUID():'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return(c==='x'?r:(r&3|8)).toString(16)}));
const slug=s=>String(s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'.').replace(/^\.|\.$/g,'');

/* ---------- État ---------- */
const KEY='fastexpress-app-v1';
/* Secteur de travail : le quartier principal et les quartiers voisins (≈ 3 km) */
const secteur=zone=>{const z=ZI[zone];if(!z)return zone?[zone]:[];return ZONES.filter(o=>dist(o,z)<=95).sort((a,b)=>dist(a,z)-dist(b,z)).map(o=>o.n)};
function migrate(o){
 if(!o.settings)o.settings={autoCreate:true};
 Object.keys(DEF_TPL).forEach(k=>{if(!o.tpl[k])o.tpl[k]=JSON.parse(JSON.stringify(DEF_TPL[k]))});
 return o}
let S;
let _storeOK=true;
function save(){
 if(MODE==='supabase')return; // en mode Supabase, les données vivent dans la base, pas dans le navigateur
 for(let k=0;k<25;k++){
  try{localStorage.setItem(KEY,JSON.stringify(S));_storeOK=true;return}
  catch(e){ // stockage plein : on retire l'image de la plus ancienne preuve (les informations restent)
   const old=S.colis.filter(c=>c.preuve&&c.preuve.img).sort((a,b)=>a.preuve.t-b.preuve.t)[0];
   if(!old||k===24){_storeOK=false;return}
   old.preuve.img=null;old.preuve.retiree=true}}}
function storageOK(){if(MODE==='supabase')return true;try{return _storeOK&&JSON.parse(localStorage.getItem(KEY)||'null')?.seq===S.seq}catch(e){return false}}
function load(){if(MODE==='supabase')return null;try{const r=localStorage.getItem(KEY);if(r){const o=JSON.parse(r);if(o&&o.colis&&o.v===3)return migrate(o)}}catch(e){}return null}
const DEMO_PASSWORD=CFG.demoPassword||'demo2026';

function seed(){
 _s=20261101;const now=Date.now();
 const st={v:3,settings:{autoCreate:true},colis:[],livreurs:[],partners:[],users:[],log:[],wa:{},tpl:JSON.parse(JSON.stringify(DEF_TPL)),seq:18420,sim:true,read:{}};
 // comptes de démonstration (en mode Supabase, ils viennent de profiles)
 st.users.push({id:'U0',email:'manager@fastexpress.demo',role:'manager',full_name:'Aurélie Moussavou',phone:'+241 077 20 14 58'});
 // partenaires : le premier est le « Comptoir agence » (décision 6)
 st.partners.push({id:'P0',company_name:COMPTOIR_NAME,contact_name:'Accueil de l\'agence de Glass',contact_phone:'+241 011 44 20 20',profileId:null});
 EXP.forEach((n,i)=>{const pid='UP'+(i+1);const p={id:'P'+(i+1),company_name:n,contact_name:person(),contact_phone:tel(),profileId:i<3?pid:null};
  if(i<3)st.users.push({id:pid,email:slug(n)+'@fastexpress.demo',role:'partner',full_name:p.contact_name,phone:p.contact_phone});st.partners.push(p)});
 const LVD=[['Rodrigue Ondo','Moto Yamaha Crypton','Nzeng-Ayong',4.9],['Prisca Mba','Scooter Honda','Glass',4.8],['Davy Obiang','Moto Haojue','Angondjé',4.6],['Landry Mabika','Voiture Toyota Vitz','Owendo',4.7],['Christelle Mintsa','Scooter Honda','Louis',4.9],['Hervé Nzamba','Moto Yamaha Crypton','PK8',4.4],['Yannick Essono','Moto Haojue','Okala',4.5],['Ornella Koumba','Voiture Suzuki Alto','Mont-Bouët',4.8]];
 LVD.forEach((l,i)=>{const z=ZI[l[2]];const uid='UD'+(i+1);const phone=tel();
  st.users.push({id:uid,email:slug(l[0])+'@fastexpress.demo',role:'driver',full_name:l[0],phone});
  st.livreurs.push({id:'L'+(i+1),profileId:uid,nom:l[0],tel:phone,vehicule:l[1],plaque:`${pick(['EE','GE','AB'])}-${ri(100,999)}-${pick(['AA','BC','DF','HK'])}`,zone:l[2],zones:secteur(l[2]),statut:i===6?'hors_service':'disponible',consentAt:i===7?null:now-ri(5,60)*D,note:l[3],couleur:AVC[i],pos:{x:z.x+ri(-8,8),y:z.y+ri(-8,8)},posAt:now-ri(1,9)*MIN,depuis:pick(['mars 2024','janv. 2025','juin 2023','sept. 2024','févr. 2026'])})});
 const actifs=st.livreurs.filter(l=>l.statut==='disponible');
 const PATH={en_attente:[],attribue:['attribue'],recupere:['attribue','recupere'],en_cours:['attribue','recupere','en_cours'],livre:['attribue','recupere','en_cours','livre'],echec:['attribue','recupere','en_cours','echec'],reporte:['attribue','recupere','en_cours','reporte'],annule:['annule']};
 const mk=(dayAgo,statut,opt={})=>{
  const zn=pick(ZONES);let lat=zn.lat+(rnd()-.5)*.007,lng=zn.lng+(rnd()-.5)*.007;
  if(opt.at){lat=opt.at[0];lng=opt.at[1]}
  const p=toXY(lat,lng);const zone=zoneOf(p);
  const type=rnd()<.55?'standard':pick(['document','fragile','express','standard']);const poids=type==='document'?0.3:Math.round((0.5+rnd()*rnd()*18)*10)/10;
  const cod=rnd()<.55?Math.round(ri(8,170)*500):0;
  const best=actifs.slice().sort((a,b)=>dist(a.pos,p)-dist(b.pos,p));
  const L=rnd()<.7?best[0]:pick(best.slice(0,3));
  const steps=PATH[statut];const durs=steps.map(()=>ri(12,50)*MIN);const total=durs.reduce((a,b)=>a+b,0);
  let created=dayAgo?sod(now)-dayAgo*D+ri(7*60+30,17*60)*MIN:Math.max(sod(now)+7*H,now-total-ri(4,140)*MIN);
  if(!dayAgo&&created+total>now)created=now-total-ri(2,20)*MIN;
  const partner=rnd()<.2?st.partners[0]:pick(st.partners.slice(1));const dest=person();
  const c={id:'C'+st.seq,dbId:null,code:'FE-26-'+(st.seq++),token:uuid(),partnerId:partner.id,exp:{nom:partner.company_name,tel:partner.contact_phone},dest:{nom:dest,tel:tel()},zone,x:p.x,y:p.y,adresse:pick(REPERES),type,poids,cod,frais:fraisCalc(p,type,poids),statut,livreurId:null,createdAt:created,otp:String(ri(1000,9999)),hist:[],motif:'',postponedDate:null};
  let t=created;c.hist.push({t,s:'en_attente',note:partner.id==='P0'?`Déposé au comptoir de l'agence de Glass par ${person()}`:`Enregistré par ${partner.company_name}`});
  steps.forEach((s,k)=>{t+=durs[k];
   if(s==='attribue'){c.livreurId=L.id;c.hist.push({t,s,note:`Confié à ${L.nom}`,by:'A. Moussavou'})}
   else if(s==='recupere')c.hist.push({t,s,note:'Colis récupéré à l\'agence',by:L.nom});
   else if(s==='en_cours')c.hist.push({t,s,note:'En route vers le destinataire',by:L.nom});
   else if(s==='livre')c.hist.push({t,s,note:`Remis en main propre à ${first(dest)}${cod?' · '+fcfa(cod)+' encaissés':''}`,by:L.nom});
   else if(s==='echec'){c.motif=pick(MOTIFS);c.hist.push({t,s,note:c.motif,by:L.nom})}
   else if(s==='reporte'){c.motif=pick(MOTIFS_REP);const cr=pick(CRENEAUX.slice(0,3));c.postponedDate=creneauDate(cr,t);c.report={creneau:creneauLabel(c.postponedDate),t,by:L.nom};c.hist.push({t,s,note:`${c.motif} · Nouveau créneau : ${c.report.creneau}`,by:L.nom})}
   else if(s==='annule'){c.motif='Commande annulée par le client';c.hist.push({t,s,note:c.motif,by:'A. Moussavou'})}});
  st.colis.push(c);return c};
 for(let d=6;d>=1;d--){const n=ri(10,16);for(let i=0;i<n;i++){const r=rnd();mk(d,r<.85?'livre':r<.92?'echec':r<.97?'reporte':'annule')}}
 const today=['livre','livre','livre','livre','livre','echec','reporte','en_cours','en_cours','en_cours','recupere','recupere','attribue','attribue','en_attente','en_attente','en_attente','en_attente'];
 const todays=today.map(s=>mk(0,s));
 // deux colis en périphérie : coordonnées éloignées de tout centre de quartier connu → quartier non déterminé
 todays.push(mk(0,'en_attente',{at:[0.3905,9.5600]}),mk(0,'attribue',{at:[0.4800,9.4950]}));
 st.colis.sort((a,b)=>b.createdAt-a.createdAt);
 // positions des livreurs en tournée
 st.colis.forEach(c=>{if(c.statut==='en_cours'){const l=st.livreurs.find(x=>x.id===c.livreurId);const f=.35+rnd()*.4;l.pos={x:l.pos.x+(c.x-l.pos.x)*f,y:l.pos.y+(c.y-l.pos.y)*f}}});
 // journal
 st.colis.forEach(c=>c.hist.forEach((h,i)=>{const L=st.livreurs.find(x=>x.id===c.livreurId);st.log.push({t:h.t,type:i===0?'creation':h.s==='attribue'?'attribution':h.s==='livre'?'livre':h.s==='echec'?'echec':h.s==='reporte'||h.s==='annule'?'probleme':'statut',code:c.code,text:logText(c,h,L),who:h.by||(i===0?'Accueil agence':'Système')})}));
 // WhatsApp
 S=st;
 todays.slice().sort((a,b)=>a.createdAt-b.createdAt).forEach(c=>c.hist.forEach(h=>{const k=h.s==='en_attente'?'creation':h.s;if(st.tpl[k])pushWA(c,k,h.t,true)}));
 const ex=todays.filter(c=>c.statut==='en_cours');
 ex.slice(0,2).forEach((c,i)=>{const th=st.wa[c.dest.tel];if(th)th.msgs.push({dir:'in',text:i?'D\'accord, je suis au bureau jusqu\'à 17 h.':'Merci, je suis à la maison. Appelez en arrivant au portail svp.',t:c.hist.at(-1).t+ri(2,9)*MIN})});
 Object.keys(st.wa).forEach(k=>st.read[k]=st.wa[k].msgs.length);
 ex.slice(0,2).forEach(c=>{if(st.read[c.dest.tel])st.read[c.dest.tel]--});
 st.log.sort((a,b)=>b.t-a.t);
 return st;
}
function logText(c,h,L){
 if(h.s==='en_attente')return`Nouveau colis de ${c.exp.nom} pour ${c.dest.nom} (${zoneLabel(c)})`;
 if(h.s==='attribue')return`Attribué à ${L?L.nom:'un livreur'}`;
 if(h.s==='recupere')return`Colis récupéré à l'agence par ${L?first(L.nom):'le livreur'}`;
 if(h.s==='en_cours')return`${L?first(L.nom):'Le livreur'} est en route vers ${zoneLabel(c)}`;
 if(h.s==='livre')return`Livré à ${c.dest.nom}${c.cod?' · '+fcfa(c.cod)+' encaissés':''}${c.preuve&&Math.abs(c.preuve.t-h.t)<5000?' · photo de preuve jointe':''}`;
 if(h.s==='echec')return`Échec de livraison : ${h.note}`;
 if(h.s==='annule')return`Colis annulé : ${h.note}`;
 if(h.s==='reporte')return`Livraison reportée : ${h.note}`;
 return h.note}

/* ---------- Helpers de données ---------- */
const LV=id=>S.livreurs.find(l=>l.id===id);
const CO=code=>S.colis.find(c=>c.code.toLowerCase()===String(code).trim().toLowerCase());
const charge=l=>S.colis.filter(c=>c.livreurId===l.id&&ACTIVE.includes(c.statut)).length;
const PA=id=>S.partners.find(p=>p.id===id);
const isToday=t=>sod(t)===sod(Date.now());
const badge=s=>`<span class="pill ${ST[s].c}">${ST[s].l}</span>`;
const lbadge=s=>`<span class="pill ${(LST[s]||LST.hors_service).c}">${(LST[s]||LST.hors_service).l}</span>`;
const lstate=l=>l.statut==='disponible'&&charge(l)>=capOf(l)?'<span class="pill p-bad">Capacité atteinte</span>':l.statut==='disponible'&&charge(l)?'<span class="pill p-gold">En tournée</span>':lbadge(l.statut);
const av=(l,size=36)=>`<span class="av" style="background:${l.couleur};width:${size}px;height:${size}px;font-size:${Math.round(size*.36)}px">${initials(l.nom)}</span>`;
function log(type,code,text,who){S.log.unshift({t:Date.now(),type,code,text,who:who||me0()})}
const trackUrl=c=>(CFG.trackingBaseUrl||location.origin+location.pathname)+'?suivi='+encodeURIComponent(c.token||c.code);
/* Synchronisation avec Supabase : chaque action locale est envoyée à la base (aucun effet en mode démo).
   En cas d'erreur, les données sont rechargées depuis Supabase pour rester exactes. */
function remote(op,...args){
 if(MODE!=='supabase'||!window.FEDB)return Promise.resolve();
 return window.FEDB.run(op,...args).catch(err=>{console.error('[Supabase]',op,err);
  toast('Supabase : '+esc(err.message||'erreur inconnue')+' · données rechargées','warn');
  return window.FEDB.reload().then(()=>refresh()).catch(()=>{})})}
function fill(t,c,extra={}){const L=LV(c.livreurId);const m={prenom:first(c.dest.nom),nom:c.dest.nom,code:c.code,expediteur:c.exp.nom,livreur:L?L.nom:'notre livreur',tel_livreur:L?L.tel:'',zone:zoneLabel(c),adresse:c.adresse+(c.zone?', '+c.zone:''),lien:trackUrl(c),otp:c.otp,cod:c.cod?fcfa(c.cod):'rien, déjà payé',heure:hm(extra.t||Date.now()),motif:(c.motif||'').toLowerCase(),creneau:(c.report?.creneau||'à convenir').toLowerCase(),...extra};return t.replace(/\{(\w+)\}/g,(a,k)=>m[k]??a)}
function pushWA(c,key,t=Date.now(),silent=false){
 const tp=S.tpl[key];if(!tp||!tp.on)return false;
 const k=c.dest.tel;if(!S.wa[k])S.wa[k]={nom:c.dest.nom,msgs:[]};
 S.wa[k].msgs.push({dir:'out',text:fill(tp.t,c,{t}),t,key,code:c.code});
 if(!silent){log('notif',c.code,`WhatsApp « ${tp.l} » envoyé à ${c.dest.nom}`,'Système');S.read[k]=S.wa[k].msgs.length}
 return true}

/* ---------- Actions métier ---------- */
function nextCode(){let code;do{code='FE-26-'+(S.seq++)}while(S.colis.some(c=>c.code===code));return code}
function createColis(d){
 const code=nextCode();
 const P=PA(d.partnerId)||S.partners[0];const pt=d.point;
 const c={id:'C'+code.slice(6),dbId:null,code,token:uuid(),partnerId:P.id,exp:{nom:P.company_name,tel:P.contact_phone},dest:{nom:d.destNom,tel:d.destTel},zone:d.zone||zoneOf(pt),x:pt.x,y:pt.y,precision:d.precision||null,adresse:d.adresse,type:d.type,poids:d.poids,cod:d.cod,frais:fraisCalc(pt,d.type,d.poids),statut:'en_attente',livreurId:null,createdAt:Date.now(),otp:String(1000+Math.floor(Math.random()*9000)),hist:[{t:Date.now(),s:'en_attente',note:P.company_name===COMPTOIR_NAME?`Déposé au comptoir de l'agence de Glass${d.depositor?' par '+d.depositor:''}`:`Enregistré par ${P.company_name}`,by:d.who||me0()}],motif:'',postponedDate:null};
 S.colis.unshift(c);log('creation',c.code,logText(c,c.hist[0]),d.who);
 const sent=pushWA(c,'creation');
 save();remote('createParcel',c);return{c,sent}}
/* =========================================================
   ATTRIBUTION AUTOMATIQUE INTELLIGENTE
   Règles : 1-2) seuls les livreurs « Disponible » ; 6) jamais au-delà de la capacité ;
   3) moins de colis actifs ; 4) zone de travail ; 5) proximité (positions de démonstration de la carte).
   Score = pénalités additionnées : le plus petit score gagne.
   ========================================================= */
const POIDS={charge:10,secteur:8,horsZone:20,km:1.5};
const fmt1=n=>n.toFixed(1).replace('.',',');
function evaluer(c,l){
 const load=charge(l)-(c.livreurId===l.id&&ACTIVE.includes(c.statut)?1:0),cap=capOf(l);
 if(l.statut!=='disponible')return{l,ok:false,load,cap,why:LST[l.statut]?.l||'Indisponible'};
 if(load>=cap)return{l,ok:false,load,cap,why:`Capacité maximale atteinte (${load}/${cap})`};
 const z={x:c.x,y:c.y};
 const zm=!c.zone?'inconnu':l.zone===c.zone?'principale':(l.zones||[]).includes(c.zone)?'secteur':'hors';
 const hasPos=!!(!c.noCoords&&Number.isFinite(z.x)&&l.pos&&Number.isFinite(l.pos.x)&&Number.isFinite(l.pos.y));
 const d=hasPos?km(dist(l.pos,z)):null;
 const parts={charge:load*POIDS.charge,zone:zm==='principale'?0:zm==='secteur'?POIDS.secteur:zm==='inconnu'?POIDS.secteur:POIDS.horsZone,dist:d==null?0:d*POIDS.km};
 return{l,ok:true,load,cap,zm,d,parts,score:Math.round((parts.charge+parts.zone+parts.dist)*10)/10};
}
function classer(c){
 const all=S.livreurs.map(l=>evaluer(c,l));
 const ok=all.filter(x=>x.ok).sort((a,b)=>a.score-b.score||(b.l.note||0)-(a.l.note||0)||a.l.nom.localeCompare(b.l.nom,'fr'));
 const ko=all.filter(x=>!x.ok);
 return{ok,ko};
}
function zoneTxt(e,c){return e.zm==='inconnu'?`quartier non déterminé, choix fait sur la distance réelle (basé à ${e.l.zone})`:e.zm==='principale'?`travaille sur ${c.zone}, sa zone principale`:e.zm==='secteur'?`${c.zone} fait partie de son secteur (basé à ${e.l.zone})`:`hors de son secteur (basé à ${e.l.zone})`}
function raison(e,c,rk){
 const p=[zoneTxt(e,c),`${e.load} colis actif${e.load>1?'s':''} sur ${e.cap}`];
 if(e.d!=null)p.push(`à ${fmt1(e.d)} km${MODE==='supabase'?' de sa dernière position GPS':' selon la carte de démonstration'}`);
 let r=p.join(' · ')+`. Score ${fmt1(e.score)}`;
 const second=rk.ok.find(x=>x.l.id!==e.l.id);
 r+=second?`, devant ${second.l.nom} (${fmt1(second.score)}).`:', seul livreur éligible.';
 return r;
}
function resumeExclus(ko){
 if(!S.livreurs.length)return'aucun livreur dans l\'équipe';
 const g={};ko.forEach(x=>{const k=x.why.startsWith('Capacité')?'capacité maximale atteinte':x.why.toLowerCase();g[k]=(g[k]||0)+1});
 const pl={'absent':'absents','indisponible':'indisponibles','capacité maximale atteinte':'à capacité maximale'};
 return Object.entries(g).map(([k,n])=>`${n} ${n>1&&pl[k]?pl[k]:k}`).join(', ');
}
/* Attribution (automatique ou manuelle). info = {mode:'auto'|'manuel', reason, score} */
function assign(c,l,who,info={}){who=who||me0();
 if(!c||!l)return false;
 const prev=c.livreurId?LV(c.livreurId):null;
 if(prev&&prev.id===l.id)return false;
 const t=Date.now(),mode=info.mode||'manuel';
 c.livreurId=l.id;c.statut='attribue';c.motif='';c.alerte='';
 const reason=info.reason||(prev?`Réaffecté manuellement de ${prev.nom} à ${l.nom}.`:`Choisi manuellement par ${who}.`);
 c.attrib={mode,reason,score:info.score??null,t,by:who,prev:prev?prev.nom:null};
 c.hist.push({t,s:'attribue',note:prev?`Réaffecté de ${prev.nom} à ${l.nom}`:`Confié à ${l.nom}`});
 log('attribution',c.code,prev?`Réaffecté de ${prev.nom} à ${l.nom} (${mode==='auto'?'automatique':'manuel'})`:mode==='auto'?`Attribué automatiquement à ${l.nom} : ${reason}`:`Attribué manuellement à ${l.nom}`,who);
 c.hist.at(-1).reasonFull=prev?`Réaffecté de ${prev.nom} à ${l.nom}`:mode==='auto'?`Attribué automatiquement à ${l.nom} : ${reason}`:`Attribué manuellement à ${l.nom}`;
 pushWA(c,'attribue');save();remote('status',c,c.hist.at(-1));return true;
}
/* Réaffectation / attribution manuelle par le responsable : mêmes garde-fous (statut, capacité) */
function manualAssign(c,l,who){who=who||me0();
 if(!c||!l)return{ok:false,msg:'Choisissez un livreur dans la liste.'};
 if(!['en_attente','attribue'].includes(c.statut))return{ok:false,msg:`${c.code} ne peut plus être réaffecté (${ST[c.statut].l.toLowerCase()}).`};
 if(c.livreurId===l.id)return{ok:false,msg:`${c.code} est déjà confié à ${l.nom}.`};
 const e=evaluer(c,l);
 if(!e.ok)return{ok:false,msg:`Impossible de confier ${c.code} à ${l.nom} : ${e.why.toLowerCase()}.`};
 const prev=c.livreurId?LV(c.livreurId):null;
 assign(c,l,who,{mode:'manuel',reason:prev?`Réaffecté manuellement de ${prev.nom} à ${l.nom} par ${who}.`:`Choisi manuellement par ${who} (${zoneTxt(e,c)}, ${e.load}/${e.cap} colis actifs).`});
 return{ok:true,msg:`${c.code} ${prev?'réaffecté':'attribué'} à ${l.nom}`};
}
/* Attribution automatique d'un colis : jamais deux fois le même colis */
function smartAssign(c,who='Attribution automatique'){
 if(!c)return{fail:true,why:'Colis introuvable'};
 if(c.statut!=='en_attente'||c.livreurId)return{c,skip:true,why:'Déjà attribué'};
 const rk=classer(c),best=rk.ok[0];
 if(!best){
  const why=resumeExclus(rk.ko);const msg=`Aucun livreur disponible (${why})`;
  if(c.alerte!==msg){c.alerte=msg;log('alerte',c.code,`Attribution automatique impossible : ${why}. Colis maintenu en attente.`,who)}
  save();return{c,fail:true,why:msg};
 }
 const reason=raison(best,c,rk);
 assign(c,best.l,who,{mode:'auto',reason,score:best.score});
 return{c,l:best.l,reason,score:best.score};
}
/* Attribution groupée : express d'abord puis les plus anciens ; la charge est recalculée après chaque attribution */
let autoBusy=false,lastRun=null;
function autoAssignBatch(list,who='Attribution automatique'){
 if(autoBusy)return null;autoBusy=true;
 try{
  const seen=new Set();
  const order=list.filter(c=>c&&c.statut==='en_attente'&&!c.livreurId&&!seen.has(c.code)&&seen.add(c.code))
   .sort((a,b)=>(b.type==='express')-(a.type==='express')||a.createdAt-b.createdAt);
  const res=order.map(c=>smartAssign(c,who));
  lastRun={t:Date.now(),res};return res;
 }finally{autoBusy=false}
}
function batchToast(res){
 if(!res)return;const ok=res.filter(r=>r.l).length,ko=res.filter(r=>r.fail).length;
 if(!res.length){toast('Aucun colis en attente à attribuer');return}
 if(ok)toast(`${ok} colis attribué${ok>1?'s':''} automatiquement`);
 if(ok&&S.tpl.attribue.on)toast(`${ok} destinataire${ok>1?'s':''} prévenu${ok>1?'s':''} sur WhatsApp`,'wa');
 if(ko)toast(`${ko} colis maintenu${ko>1?'s':''} en attente : aucun livreur disponible`,'warn');
}
const bestFor=c=>classer(c).ok;
function autoAssign(list){const r=autoAssignBatch(list)||[];return r.filter(x=>x.l).length}
function setStatus(c,s,note,who,opts={}){
 const L=LV(c.livreurId);who=who||me0();const now=Date.now();
 if(s==='echec')c.motif=note||MOTIFS[0];
 if(s==='annule'||s==='reporte')c.motif=note||'';
 if(s==='reporte'){c.postponedDate=opts.date||creneauDate(opts.creneau,now);c.report={creneau:creneauLabel(c.postponedDate),t:now,by:who}}
 if(s==='echec')c.postponedDate=null;
 c.statut=s;
 const n=s==='recupere'?'Colis récupéré à l\'agence':s==='en_cours'?'En route vers le destinataire':s==='livre'?`Remis en main propre à ${first(c.dest.nom)}${c.cod?' · '+fcfa(c.cod)+' encaissés':''}${c.preuve&&now-c.preuve.t<5000?' · photo de preuve jointe':''}`:s==='reporte'?`${note} · Nouveau créneau : ${c.report.creneau}`:note||'';
 const h={t:now,s,note:n,by:who,lat:opts.lat,lng:opts.lng};c.hist.push(h);
 if(s==='en_attente'){c.livreurId=null;c.report=null;c.postponedDate=null;h.note=note||'Reprogrammé, en attente d\'un livreur';log('statut',c.code,`Reprogrammé : ${h.note}`,who)}
 else log(s==='livre'?'livre':s==='echec'?'echec':s==='reporte'||s==='annule'?'probleme':'statut',c.code,logText(c,h,L),who);
 if(S.tpl[s])pushWA(c,s);
 save();remote('status',c,h)}

/* ---------- UI : toasts, modal, drawer ---------- */
function toast(msg,kind=''){const t=document.createElement('div');t.className='toast '+(kind==='wa'?'twa':kind==='warn'?'twarn':kind);t.innerHTML=(kind==='wa'?ic('chat',16):kind==='warn'?ic('alert',16):ic('check',16))+`<span>${msg}</span>`;const tc=$('#toasts');tc.appendChild(t);while(tc.children.length>(document.body.classList.contains('drv-mode')?2:4))tc.firstElementChild.remove();setTimeout(()=>t.remove(),3600)}
function waToast(c,key){if(S.tpl[key]&&S.tpl[key].on)toast(`WhatsApp envoyé à ${esc(first(c.dest.nom))} · ${esc(S.tpl[key].l)}`,'wa')}
const overlay=$('#overlay'),drawer=$('#drawer'),modal=$('#modal');
function closeAll(){overlay.classList.remove('on');drawer.classList.remove('on');modal.classList.remove('on');openCode=null}
overlay.onclick=closeAll;
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeAll()});
function openModal(html){modal.innerHTML=html;modal.classList.add('on');overlay.classList.add('on');drawer.classList.remove('on');setTimeout(()=>{const f=modal.querySelector('input,select');f&&f.focus()},60)}

let openCode=null;
function openColis(code){const c=CO(code);if(!c){toast('Aucun colis ne correspond à ce numéro');return}openCode=c.code;renderDrawer();drawer.classList.add('on');overlay.classList.add('on');modal.classList.remove('on')}
function stepsHtml(c){
 const order=['en_attente','attribue','recupere','en_cours','livre'];const bad=['echec','reporte','annule'].includes(c.statut);const lab=['Enregistré','Livreur attribué','Colis récupéré','En livraison',bad?ST[c.statut].l:'Livré'];
 let idx=order.indexOf(c.statut);if(bad)idx=4;
 return`<div class="steps">${order.map((s,i)=>`<div class="step ${i<=idx?(bad&&i===4?'fail':'done'):''}"><i></i>${lab[i]}</div>`).join('')}</div>`}
function tlHtml(c,pub=false){const hs=c.hist.slice().reverse();return`<div class="tl">${hs.map((h,i)=>`<div class="tl-i ${i===0?(['echec','annule','reporte'].includes(h.s)?'bad':'last'):''}"><b>${ST[h.s].l}</b><p>${esc(pub&&h.s==='attribue'?'Un livreur FAST EXPRESS a été désigné':h.note)}</p><small>${dayLabel(h.t)} · ${hm(h.t)}</small></div>`).join('')}</div>`}
function renderDrawer(){
 const c=CO(openCode);if(!c)return;const L=LV(c.livreurId);
 const ev=S.livreurs.map(l=>evaluer(c,l));
 const opts=ev.map(e=>e.l.id===c.livreurId?`<option value="${e.l.id}" selected>${esc(e.l.nom)} (actuel)</option>`:`<option value="${e.l.id}" ${e.ok?'':'disabled'}>${esc(e.l.nom)} · ${e.ok?`${e.load}/${e.cap} actifs${e.d!=null?' · '+fmt1(e.d)+' km':''}`:esc(e.why)}</option>`).join('');
 const rk0=!c.livreurId&&c.statut==='en_attente'?classer(c):null;
 let acts='';
 const mgr=isMgr();
 if(mgr&&c.statut==='attribue')acts+=`<button class="btn pri" data-a="recupere">${ic('box',16)}Marquer récupéré</button>`;
 if(mgr&&c.statut==='recupere')acts+=`<button class="btn pri" data-a="en_cours">${ic('truck',16)}Marquer en livraison</button>`;
 if(mgr&&c.statut==='en_cours')acts+=`<button class="btn pri" data-a="livre">${ic('check',16)}Confirmer la livraison</button><button class="btn danger" data-a="echec">${ic('alert',16)}Signaler un échec</button>`;
 if(mgr&&(c.statut==='echec'||c.statut==='reporte'))acts+=`<button class="btn pri" data-a="reprog">${ic('refresh',16)}Reprogrammer</button>`;
 if((mgr&&['en_attente','attribue','recupere'].includes(c.statut))||(isPartner()&&c.statut==='en_attente'))acts+=`<button class="btn danger" data-a="annule">${ic('x',16)}Annuler le colis</button>`;
 drawer.innerHTML=`
 <div class="dr-h"><div class="stack" style="gap:6px"><span class="mono" style="font-size:20px;font-weight:600">${c.code}</span><div class="row wrap">${badge(c.statut)}${HAS.type?`<span class="tag">${TYPES[c.type]}</span>`:''}${HAS.cod?(c.cod?`<span class="tag cod">À encaisser ${fcfa(c.cod)}</span>`:'<span class="tag">Prépayé</span>'):''}</div></div><button class="x" id="drX" aria-label="Fermer">${ic('x')}</button></div>
 <div class="dr-b">
  ${stepsHtml(c)}
  ${['echec','reporte','annule'].includes(c.statut)&&c.motif?`<div class="banner" style="background:var(--bad-soft);color:var(--bad)">${ic('alert',16)}<span>${ST[c.statut].l} · Motif : ${esc(c.motif)}${c.statut==='reporte'&&c.report?` · Nouveau créneau : ${esc(c.report.creneau)}`:''}${c.hist.at(-1).by?` · Signalé par ${esc(c.hist.at(-1).by)}`:''}</span></div>`:''}
  ${c.statut==='en_attente'&&c.alerte?`<div class="banner" style="background:var(--bad-soft);color:var(--bad)">${ic('alert',16)}<span>${esc(c.alerte)}</span></div>`:''}
  ${['en_attente',...ACTIVE].includes(c.statut)&&(mgr||c.livreurId)?`<div class="box"><h3>${c.livreurId?'Livreur':'Attribuer un livreur'}</h3>
   ${L?`<div class="row" style="margin-bottom:12px">${av(L)}<div style="min-width:0"><b>${esc(L.nom)}</b><div class="small muted">${esc(L.vehicule)} · ${esc(L.tel)}</div></div></div>`:''}
   ${mgr&&['en_attente','attribue'].includes(c.statut)?`<div class="row"><select class="select" id="drL" aria-label="Choisir un livreur">${c.livreurId?'':'<option value="">Choisir un livreur…</option>'}${opts}</select><button class="btn ${c.livreurId?'':'pri'}" id="drAssign">${c.livreurId?'Changer':'Attribuer'}</button></div>
   ${rk0?(rk0.ok[0]?`<div class="sugg">${ic('star',14)}<span class="why">Suggestion : <b>${esc(rk0.ok[0].l.nom)}</b>. ${esc(raison(rk0.ok[0],c,rk0))}</span></div><button class="btn sm gold" id="drAuto" style="margin-top:10px">${ic('bolt',14)}Attribuer automatiquement</button>`:`<div class="sugg none">${ic('alert',14)}<span>Aucun livreur disponible : ${esc(resumeExclus(rk0.ko))}. Le colis reste en attente.</span></div>`):''}`:''}
   ${c.attrib&&c.livreurId?`<div class="attrbox" style="margin-top:12px"><div class="small" style="font-weight:700">${c.attrib.mode==='auto'?'Choix automatique':'Choix manuel'} · ${hm(c.attrib.t)}</div><div class="why">${esc(c.attrib.reason)}</div></div>`:''}
  </div>`:''}
  ${acts?`<div class="row wrap">${acts}</div>`:''}
  <div id="drSub"></div>
  <div class="box"><h3>Destinataire</h3><dl class="kv"><dt>Nom</dt><dd><b>${esc(c.dest.nom)}</b></dd><dt>Téléphone</dt><dd class="num">${esc(c.dest.tel)}</dd><dt>Quartier</dt><dd>${c.zone?esc(c.zone):'<span class="faint">Non déterminé</span>'}</dd><dt>Repère</dt><dd>${esc(c.adresse)}</dd><dt>Coordonnées</dt><dd class="num">${(()=>{const g=toLL(c.x,c.y);return`${g.lat.toFixed(5)}, ${g.lng.toFixed(5)}`})()} <a class="lnk" style="font-family:var(--f-body)" href="${mapsUrl(c)}" target="_blank" rel="noopener">Google Maps</a></dd>${mgr?`<dt>Code de remise</dt><dd><span class="otp">${c.otp}</span></dd>`:''}${c.statut==='reporte'&&c.postponedDate?`<dt>Nouvelle date</dt><dd>${esc(creneauLabel(c.postponedDate))}</dd>`:''}</dl></div>
  <div class="box"><h3>Expédition</h3><dl class="kv"><dt>Expéditeur</dt><dd>${esc(c.exp.nom)}</dd><dt>Téléphone</dt><dd class="num">${esc(c.exp.tel)}</dd>${HAS.weight&&c.poids?`<dt>Poids</dt><dd class="num">${String(c.poids).replace('.',',')} kg</dd>`:''}${HAS.fee?`<dt>Frais</dt><dd class="num">${fcfa(c.frais)}</dd>`:`<dt>Frais estimés</dt><dd class="num">${fcfa(c.frais)}</dd>`}<dt>Distance agence</dt><dd class="num">${km(dist(c,HQ)).toFixed(1).replace('.',',')} km</dd><dt>Enregistré</dt><dd>${dayLabel(c.createdAt)} à ${hm(c.createdAt)}</dd></dl></div>
  ${c.preuve?`<div class="box"><h3>Preuve de livraison</h3>${c.preuve.img?`<div class="proof"><img src="${c.preuve.img}" alt="Photo de preuve de livraison de ${c.code}"><small>Photo prise par ${esc(c.preuve.by)} le ${dayLabel(c.preuve.t).toLowerCase()} à ${hm(c.preuve.t)}</small></div>`:`<p class="small muted" style="margin:0">Photo prise par ${esc(c.preuve.by)} à ${hm(c.preuve.t)}, retirée du stockage local pour libérer de la place.</p>`}</div>`:''}
  <div class="box"><h3>Historique du colis</h3>${tlHtml(c)}</div>
  <div class="row wrap"><button class="btn" id="drPub">${ic('eye',16)}Voir le suivi public</button>${mgr?`<button class="btn" id="drWa">${ic('chat',16)}Conversation WhatsApp</button>`:''}<button class="btn" id="drLink">Copier le lien de suivi</button></div>
 </div>`;
 $('#drX').onclick=closeAll;
 $('#drPub').onclick=()=>{closeAll();pubCode=c.code;go('suivi')};
 const dw=$('#drWa');if(dw)dw.onclick=()=>{closeAll();waSel=c.dest.tel;go('whatsapp')};
 $('#drLink').onclick=()=>{const u=trackUrl(c);navigator.clipboard?.writeText(u).then(()=>toast('Lien de suivi copié'),()=>toast(esc(u),'warn'))};
 const asb=$('#drAssign');if(asb)asb.onclick=()=>{const r=manualAssign(c,LV($('#drL').value));if(!r.ok){toast(esc(r.msg),'warn');return}toast(esc(r.msg));waToast(c,'attribue');refresh()};
 const dra=$('#drAuto');if(dra)dra.onclick=()=>{dra.disabled=true;const r=smartAssign(c);if(r.l){toast(`${c.code} attribué à ${esc(r.l.nom)}`);waToast(c,'attribue')}else toast(esc(r.why||'Attribution impossible'),'warn');refresh()};
 drawer.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>{
  const a=b.dataset.a;const sub=$('#drSub');
  if(a==='echec'){sub.innerHTML=`<div class="box"><h3>Motif de l'échec</h3><div class="row"><select class="select" id="drM">${MOTIFS.map(m=>`<option>${m}</option>`).join('')}</select><button class="btn danger" id="drMok">Valider</button></div></div>`;$('#drMok').onclick=()=>{setStatus(c,'echec',$('#drM').value);toast(`Échec enregistré pour ${c.code}`);waToast(c,'echec');refresh()};return}
  if(a==='annule'){sub.innerHTML=`<div class="box"><h3>Confirmer l'annulation</h3><p class="small muted" style="margin:0 0 10px">Le colis ${c.code} sera retiré des tournées. Cette action est enregistrée dans l'historique.</p><div class="row"><button class="btn danger" id="drCok">Oui, annuler le colis</button><button class="btn ghost" id="drCno">Garder</button></div></div>`;$('#drCno').onclick=()=>sub.innerHTML='';$('#drCok').onclick=()=>{setStatus(c,'annule','Annulé par l\'administrateur');toast(`${c.code} annulé`);refresh()};return}
  if(a==='reprog'){setStatus(c,'en_attente','Reprogrammé après échec');toast(`${c.code} remis en attente d'attribution`);refresh();return}
  setStatus(c,a);toast(`${c.code} : ${ST[a].l}`);waToast(c,a);refresh()});
}

/* ---------- Formulaires ----------
   Le lecteur d'Artifacts affiche la page dans une iframe isolée qui bloque l'envoi
   natif des formulaires : l'événement « submit » n'y est jamais déclenché.
   On branche donc chaque formulaire sur le clic du bouton et sur la touche Entrée. */
function bindForm(form,btn,fn){
 if(!form||!btn)return;
 btn.type='button';
 btn.addEventListener('click',e=>{e.preventDefault();fn()});
 form.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.tagName==='INPUT'&&e.target.type!=='checkbox'){e.preventDefault();fn()}});
 form.addEventListener('submit',e=>{e.preventDefault();fn()});
}
function fieldErr(id,msg){const el=$('#'+id);if(!el)return;el.classList.add('invalid');el.setAttribute('aria-invalid','true');const m=document.createElement('span');m.className='ferr';m.textContent=msg;el.insertAdjacentElement('afterend',m)}
function clearErrs(root){root.querySelectorAll('.invalid').forEach(e=>{e.classList.remove('invalid');e.removeAttribute('aria-invalid')});root.querySelectorAll('.ferr').forEach(e=>e.remove())}
const digits=t=>String(t||'').replace(/\D/g,'');
let savingColis=false,newCode=null;
function newColisModal(){
 const zo=ZONES.map(z=>`<option>${z.n}</option>`).join('');
 const myP=isPartner()?PA(AUTH.partnerId):null;
 const partOpts=S.partners.map(p=>`<option value="${p.id}">${esc(p.company_name)}</option>`).join('');
 openModal(`<form id="ncF" novalidate>
 <div class="md-h"><div><h2>Nouveau colis</h2><p class="small muted" style="margin:2px 0 0">${myP?esc(myP.company_name)+' · envoi via FAST EXPRESS':'Enregistrement à l\'agence de Glass'}</p></div><button type="button" class="x" id="mX" aria-label="Fermer">${ic('x')}</button></div>
 <div class="md-b">
  ${myP?'':`<fieldset class="fs"><legend>Expéditeur</legend><div class="f2"><div class="field"><label for="nc1">Expéditeur *</label><select class="select" id="nc1">${partOpts}</select></div><div class="field" id="nc2F"><label for="nc2">Nom du déposant (comptoir)</label><input class="input" id="nc2" placeholder="Ex. Brice Ndong"></div></div></fieldset>`}
  <fieldset class="fs"><legend>Destinataire</legend><div class="f2"><div class="field"><label for="nc3">Nom complet *</label><input class="input" id="nc3" placeholder="Ex. Gaëlle Nguema" required></div><div class="field"><label for="nc4">Téléphone WhatsApp *</label><input class="input" id="nc4" placeholder="+241 066 00 00 00" required></div></div>
  <div class="f2"><div class="field"><label for="nc5">Quartier</label><select class="select" id="nc5"><option value="">Choisir un quartier…</option>${zo}</select></div><div class="field"><label for="nc12">Coordonnées GPS (facultatif)</label><input class="input mono" id="nc12" placeholder="0.39120, 9.45670" inputmode="decimal"></div></div>
  <div class="field"><label for="nc6">Adresse / point de repère *</label><input class="input" id="nc6" placeholder="Ex. Derrière la pharmacie, portail bleu" required></div>
  <p class="small muted" style="margin:0">Indiquez un quartier, des coordonnées GPS, ou les deux. Sans quartier, il n'est déduit des coordonnées que s'il est certain.</p></fieldset>
  ${HAS.type||HAS.weight||HAS.cod?`<fieldset class="fs"><legend>Colis et paiement</legend><div class="f2">${HAS.type?`<div class="field"><label for="nc7">Type</label><select class="select" id="nc7">${Object.entries(TYPES).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></div>`:''}${HAS.weight?`<div class="field"><label for="nc8">Poids (kg)</label><input class="input" id="nc8" type="number" min="0.1" step="0.1" value="1.5"></div>`:''}</div>
  ${HAS.cod?`<div class="f2"><div class="field"><label for="nc9">Paiement</label><select class="select" id="nc9"><option value="pre">Prépayé par l'expéditeur</option><option value="cod">Paiement à la livraison</option></select></div><div class="field"><label for="nc10">Montant à encaisser (FCFA)</label><input class="input" id="nc10" type="number" min="0" step="500" value="0" disabled></div></div>`:''}</fieldset>`:''}
  ${isMgr()?`<label class="row small" style="cursor:pointer"><input type="checkbox" id="nc11" ${S.settings?.autoCreate!==false?'checked':''} style="accent-color:var(--brand);width:16px;height:16px"> Attribution automatique intelligente au meilleur livreur disponible</label>`:''}
  <div class="quote"><span class="small"><b style="font-size:13px;color:var(--fg);font-family:var(--f-body)">Frais de livraison estimés</b><br><span class="muted" id="ncDist">Choisissez un quartier ou des coordonnées</span></span><b id="ncFee" class="num">—</b></div>
  <div class="errbox" id="ncErr" hidden></div>
 </div>
 <div class="md-f"><button type="button" class="btn ghost" id="mC">Annuler</button><button class="btn pri" type="button" id="ncSave">${ic('plus',16)}Enregistrer le colis</button></div></form>`);
 const q=()=>{const g=readPoint();const t=$('#nc7')?.value||'standard',w=parseFloat($('#nc8')?.value)||0;
  if(!g.point){$('#ncFee').textContent='—';$('#ncDist').textContent=g.err||'Choisissez un quartier ou des coordonnées';return}
  $('#ncFee').textContent=fcfa(fraisCalc(g.point,t,w));$('#ncDist').textContent=`${fmt1(km(dist(g.point,HQ)))} km depuis l'agence · ${g.zone?esc(g.zone):'quartier non déterminé'}`};
 ['nc5','nc7','nc8','nc12'].forEach(id=>{const e=$('#'+id);if(e)e.addEventListener('input',q)});q();
 const n1=$('#nc1');if(n1){const tg=()=>{$('#nc2F').hidden=PA(n1.value)?.company_name!==COMPTOIR_NAME};n1.onchange=tg;tg()}
 const n9=$('#nc9');if(n9)n9.onchange=e=>{const on=e.target.value==='cod';$('#nc10').disabled=!on;if(on&&!+$('#nc10').value)$('#nc10').value=25000;if(!on)$('#nc10').value=0};
 $('#mX').onclick=$('#mC').onclick=closeAll;
 savingColis=false;
 const form=$('#ncF');
 form.addEventListener('input',e=>{if(e.target.classList.contains('invalid')){e.target.classList.remove('invalid');const n=e.target.nextElementSibling;if(n&&n.classList.contains('ferr'))n.remove()}});
 bindForm(form,$('#ncSave'),saveNewColis);
}
/* Position de livraison : coordonnées GPS saisies, sinon centre du quartier choisi */
function parseCoords(t){const m=String(t||'').replace(/;/g,',').match(/^\s*(-?\d+(?:[.,]\d+)?)\s*[, ]\s*(-?\d+(?:[.,]\d+)?)\s*$/);if(!m)return null;const lat=parseFloat(m[1].replace(',','.')),lng=parseFloat(m[2].replace(',','.'));return Number.isFinite(lat)&&Number.isFinite(lng)?{lat,lng}:null}
function readPoint(){
 const zSel=($('#nc5')?.value||'').trim(),raw=($('#nc12')?.value||'').trim();
 if(raw){const g=parseCoords(raw);if(!g)return{err:'Format attendu : latitude, longitude (ex. 0.39120, 9.45670)'};
  if(g.lat<-0.5||g.lat>1.2||g.lng<8.8||g.lng>10.2)return{err:'Ces coordonnées sont hors de la région de Libreville'};
  const point=toXY(g.lat,g.lng);return{point,zone:zSel||zoneOf(point),precision:'gps'}}
 if(zSel&&ZI[zSel])return{point:{x:ZI[zSel].x,y:ZI[zSel].y},zone:zSel,precision:'quartier'};
 return{};
}
/* Lecture des champs du formulaire « Nouveau colis » */
function readColisForm(){
 const v=id=>($('#'+id)?.value||'').trim();
 const poids=HAS.weight?parseFloat(v('nc8').replace(',','.')):null;
 const cod=HAS.cod&&v('nc9')==='cod'?Math.round(parseFloat(v('nc10').replace(',','.'))||0):0;
 const g=readPoint();
 return{partnerId:isPartner()?AUTH.partnerId:v('nc1')||S.partners[0]?.id,depositor:v('nc2'),destNom:v('nc3'),destTel:v('nc4'),zone:g.zone||null,point:g.point||null,precision:g.precision,pointErr:g.err,adresse:v('nc6'),type:HAS.type?v('nc7')||'standard':'standard',poids,cod,payMode:v('nc9'),auto:isMgr()&&!!$('#nc11')?.checked};
}
/* Validation des champs obligatoires ; renvoie la liste des erreurs */
function validateColis(d){
 const e=[];
 if(!PA(d.partnerId))e.push(['nc1','Choisissez l\'expéditeur.']);
 if(d.destNom.length<2)e.push(['nc3','Indiquez le nom du destinataire.']);
 if(digits(d.destTel).length<8)e.push(['nc4','Numéro incomplet (8 chiffres minimum).']);
 if(d.pointErr)e.push(['nc12',d.pointErr]);else if(!d.point)e.push(['nc5','Choisissez un quartier ou saisissez des coordonnées GPS.']);
 if(d.adresse.length<3)e.push(['nc6','Ajoutez un point de repère pour le livreur.']);
 if(HAS.weight&&(!(d.poids>0)||d.poids>100))e.push(['nc8','Poids entre 0,1 et 100 kg.']);
 if(HAS.cod&&d.payMode==='cod'&&!(d.cod>0))e.push(['nc10','Indiquez le montant à encaisser.']);
 return e;
}
function saveNewColis(){
 if(savingColis)return;                      // empêche le double enregistrement
 const form=$('#ncF');if(!form)return;
 clearErrs(form);const box=$('#ncErr');box.hidden=true;
 const d=readColisForm();const errs=validateColis(d);
 if(errs.length){
  errs.forEach(([id,m])=>fieldErr(id,m));
  box.hidden=false;box.innerHTML=ic('alert',16)+`<span>${errs.length===1?'Un champ est à corriger.':errs.length+' champs sont à corriger.'} Les champs marqués d'un * sont obligatoires.</span>`;
  const f=$('#'+errs[0][0]);f.scrollIntoView({block:'center',behavior:'smooth'});f.focus({preventScroll:true});
  return}
 // doublon : même destinataire, même quartier, même repère dans les 2 dernières minutes
 const dup=S.colis.find(c=>Date.now()-c.createdAt<120000&&digits(c.dest.tel)===digits(d.destTel)&&c.zone===d.zone&&c.adresse.toLowerCase()===d.adresse.toLowerCase());
 if(dup){box.hidden=false;box.innerHTML=ic('alert',16)+`<span>Ce colis vient déjà d'être enregistré sous le numéro ${dup.code}. Modifiez le repère s'il s'agit d'un second envoi.</span>`;return}
 savingColis=true;const btn=$('#ncSave');btn.disabled=true;btn.innerHTML=ic('clock',16)+'Enregistrement…';
 try{
  const {c,sent}=createColis(d);
  const ar=d.auto?smartAssign(c):null;
  save();
  const persisted=storageOK();
  // afficher le colis dans la liste : filtres réinitialisés et ligne mise en évidence
  colisF={q:'',s:'tous',z:'',p:'auj'};newCode=c.code;
  closeAll();
  if(cur==='colis')render();else go('colis');
  toast(`Colis ${c.code} enregistré${c.livreurId?' et attribué à '+esc(LV(c.livreurId).nom):''}`);
  if(sent)waToast(c,'creation');
  if(ar&&ar.fail)toast(`${c.code} reste en attente : ${esc(ar.why.toLowerCase())}`,'warn');
  if(!persisted)toast('Stockage local indisponible : le colis restera visible jusqu\'à la fermeture de la page');
 }catch(err){console.error(err);savingColis=false;btn.disabled=false;btn.innerHTML=ic('plus',16)+'Enregistrer le colis';box.hidden=false;box.innerHTML=ic('alert',16)+'<span>L\'enregistrement a échoué. Réessayez.</span>'}
}
function newLivreurModal(){
 if(MODE==='supabase'){openModal(`<div class="md-h"><h2>Ajouter un livreur</h2><button type="button" class="x" id="mX" aria-label="Fermer">${ic('x')}</button></div>
  <div class="md-b"><p style="margin:0">Pour des raisons de sécurité, un compte livreur se crée dans Supabase, pas depuis le navigateur (cela demande la clé secrète).</p>
  <ol class="small" style="margin:0;padding-left:18px;line-height:1.7"><li>Supabase › <b>Authentication › Users › Add user</b> : e-mail et mot de passe du livreur.</li><li>Table <b>profiles</b> : une ligne avec l'identifiant de ce compte, <code>full_name</code>, <code>phone</code> et <code>role = driver</code>.</li><li>Table <b>drivers</b> : une ligne avec <code>profile_id</code>, <code>vehicle_type</code>, <code>vehicle_plate</code> et <code>zone</code>.</li></ol>
  <p class="small muted" style="margin:0">Le livreur apparaît ensuite ici automatiquement.</p></div><div class="md-f"><button class="btn pri" type="button" id="mC">Compris</button></div>`);
  $('#mX').onclick=$('#mC').onclick=closeAll;return}
 openModal(`<form id="nlF" novalidate>
 <div class="md-h"><h2>Ajouter un livreur</h2><button type="button" class="x" id="mX" aria-label="Fermer">${ic('x')}</button></div>
 <div class="md-b">
  <div class="f2"><div class="field"><label for="nl1">Nom complet</label><input class="input" id="nl1" placeholder="Ex. Wilfried Biyogo"></div><div class="field"><label for="nl2">Téléphone</label><input class="input" id="nl2" placeholder="+241 074 00 00 00"></div></div>
  <div class="f2"><div class="field"><label for="nl3">Type de véhicule</label><select class="select" id="nl3"><option>Moto</option><option>Scooter</option><option>Voiture</option><option>Vélo</option></select></div><div class="field"><label for="nl4">Immatriculation</label><input class="input" id="nl4" placeholder="EE-000-AA"></div></div>
  <div class="field"><label for="nl5">Zone de travail principale</label><select class="select" id="nl5">${ZONES.map(z=>`<option>${z.n}</option>`).join('')}</select></div>
  <p class="small muted" style="margin:0" id="nlSect"></p>
  <div class="errbox" id="nlErr" hidden></div>
 </div>
 <div class="md-f"><button type="button" class="btn ghost" id="mC">Annuler</button><button class="btn pri" type="button" id="nlSave">${ic('plus',16)}Ajouter le livreur</button></div></form>`);
 $('#mX').onclick=$('#mC').onclick=closeAll;
 const sec=()=>{$('#nlSect').textContent=`Capacité : ${CAP_DEF($('#nl3').value)} colis actifs (selon le véhicule) · Secteur : `+secteur($('#nl5').value).join(', ')};$('#nl5').onchange=sec;$('#nl3').onchange=sec;sec();
 let nlBusy=false;bindForm($('#nlF'),$('#nlSave'),()=>{if(nlBusy)return;const nom=$('#nl1').value.trim(),t=$('#nl2').value.trim();
  clearErrs($('#nlF'));if(nom.length<2||digits(t).length<8){if(nom.length<2)fieldErr('nl1','Indiquez le nom.');if(digits(t).length<8)fieldErr('nl2','8 chiffres minimum.');const er=$('#nlErr');er.hidden=false;er.innerHTML=ic('alert',16)+'<span>Indiquez le nom et un numéro de téléphone valide.</span>';return}nlBusy=true;
  const z=ZI[$('#nl5').value];const i=S.livreurs.length;const uid='UD'+Date.now();const email=slug(nom)+'@fastexpress.demo';
  S.users.push({id:uid,email,role:'driver',full_name:nom,phone:t});
  const l={id:'L'+(i+1)+'-'+Date.now()%1000,profileId:uid,nom,tel:t,vehicule:$('#nl3').value,plaque:$('#nl4').value.trim().toUpperCase()||'EN COURS',zone:z.n,zones:secteur(z.n),statut:'disponible',consentAt:null,note:5,couleur:AVC[i%AVC.length],pos:{x:z.x,y:z.y},depuis:'nov. 2026'};
  S.livreurs.push(l);log('livreur','',`Nouveau livreur : ${nom} (${z.n})`,me0());save();closeAll();toast(`${esc(nom)} a rejoint l'équipe · connexion : ${esc(email)} / ${esc(DEMO_PASSWORD)}`);refresh()});
}

/* ---------- Navigation ---------- */
const VIEWS=[
 {g:'Pilotage'},
 {id:'tableau',l:'Tableau de bord',i:'grid',sub:()=>`${dayLabel(Date.now())} · ${new Date().toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'})}`},
 {id:'carte',l:'Carte en direct',i:'map',sub:()=>'Positions des livreurs et destinations du jour à Libreville'},
 {g:'Opérations'},
 {id:'colis',l:'Colis',i:'box',sub:()=>'Tous les envois, leur statut et leur historique',cnt:()=>S.colis.filter(c=>c.statut==='en_attente').length},
 {id:'attribution',l:'Attribution',i:'route',sub:()=>'Confiez les colis en attente aux livreurs disponibles'},
 {id:'livreurs',l:'Livreurs',i:'users',sub:()=>'Équipe, disponibilités et performances'},
 {g:'Communication'},
 {id:'whatsapp',l:'Notifications WhatsApp',i:'chat',sub:()=>'Messages automatiques envoyés aux destinataires',cnt:()=>Object.keys(S.wa).reduce((a,k)=>a+Math.max(0,S.wa[k].msgs.length-(S.read[k]||0)),0)},
 {id:'historique',l:'Historique',i:'clock',sub:()=>'Journal complet des événements'},
 {g:'Espaces'},
 {id:'livreur',l:'Espace livreur',i:'phone',sub:()=>'Application mobile des livreurs',demo:true},
 {id:'suivi',l:'Suivi public',i:'eye',sub:()=>'La page que consultent vos clients'}];
/* Espace partenaire (boutiques et entreprises expéditrices) */
const PVIEWS=[{g:'Mon espace'},
 {id:'partenaire',l:'Tableau de bord',i:'grid',sub:()=>PA(AUTH?.partnerId)?.company_name||'Espace partenaire'},
 {id:'colis',l:'Mes colis',i:'box',sub:()=>'Vos envois confiés à FAST EXPRESS'},
 {id:'suivi',l:'Suivi client',i:'eye',sub:()=>'La page que consultent vos clients'}];
const viewsFor=()=>isPartner()?PVIEWS:VIEWS.filter(v=>!(v.demo&&MODE!=='demo'));
let cur='tableau';
function renderNav(){$('#nav').innerHTML=viewsFor().map(v=>v.g?`<div class="nav-h">${v.g}</div>`:`<a href="#${v.id}" class="${v.id===cur?'on':''}" data-v="${v.id}">${ic(v.i,18)}<span>${v.l}</span>${v.cnt&&v.cnt()?`<span class="cnt">${v.cnt()}</span>`:''}</a>`).join('')}
function go(id){if(location.hash!=='#'+id)location.hash=id;else route()}
function route(){let h=location.hash.slice(1);if(h==='mobile')h='livreur';
 const pubQ=new URLSearchParams(location.search).get('suivi');
 if(!AUTH)cur=(h==='suivi'||pubQ)?'suivi':'login';
 else if(isDriver())cur='livreur';
 else{const vs=viewsFor().filter(v=>v.id);cur=vs.find(v=>v.id===h)?h:vs[0].id}closeAll();$('#rail').classList.remove('on');$('#scrim').classList.remove('on');render();window.scrollTo(0,0)}
function render(){
 const login=cur==='login',d=cur==='livreur';
 document.body.classList.toggle('drv-mode',d);document.body.classList.toggle('solo',!AUTH&&cur==='suivi');
 $('#login').hidden=!login;$('.app').hidden=d||login;$('#drv').hidden=!d;
 if(login){renderLogin();return}
 if(d){R.livreur();return}
 const v=[...VIEWS,...PVIEWS].find(x=>x.id===cur);$('#pgTitle').textContent=v.l;$('#pgSub').textContent=v.sub();
 $('#newBtn').hidden=!AUTH||isDriver();renderNav();renderUser();R[cur]();}
function renderUser(){
 const u=$('#userBox');if(!AUTH){u.innerHTML='';return}
 const role={manager:'Responsable des opérations',partner:'Partenaire expéditeur',driver:'Livreur'}[AUTH.role];
 u.innerHTML=`<span class="av" style="background:#0e8a65">${initials(AUTH.name)}</span><div style="min-width:0;flex:1">${esc(AUTH.name)}<small>${role}${MODE==='demo'?' · démo':''}</small></div><button class="rail-btn" id="logoutBtn" type="button" title="Se déconnecter" style="padding:6px 8px">${ic('x',14)}</button>`;
 $('#logoutBtn').onclick=logout;
 const demoOnly=MODE==='demo'&&isMgr();$('#resetBtn').hidden=!demoOnly;$('#simToggle').closest('.sim').hidden=!demoOnly;
}
function refresh(){render();if(openCode&&drawer.classList.contains('on'))renderDrawer()}

/* =========================================================
   VUES
   ========================================================= */
const R={};
let colisF={q:'',s:'tous',z:'',p:'7j'};

/* ---------- Tableau de bord ---------- */
R.tableau=()=>{
 const now=Date.now(),t0=sod(now);
 const tod=S.colis.filter(c=>c.createdAt>=t0),yes=S.colis.filter(c=>c.createdAt>=t0-D&&c.createdAt<t0);
 const livT=S.colis.filter(c=>c.statut==='livre'&&c.hist.at(-1).t>=t0);
 const enc=S.colis.filter(c=>c.statut==='en_cours'),att=S.colis.filter(c=>c.statut==='attribue'||c.statut==='recupere'),wait=S.colis.filter(c=>c.statut==='en_attente');
 const w7=S.colis.filter(c=>c.createdAt>=t0-6*D);const done7=w7.filter(c=>c.statut==='livre'||c.statut==='echec');
 const rate=done7.length?w7.filter(c=>c.statut==='livre').length/done7.length*100:0;
 const ca7=w7.filter(c=>c.statut==='livre').reduce((a,c)=>a+c.frais,0);
 const codT=livT.reduce((a,c)=>a+c.cod,0);
 const dlt=tod.length-yes.length;
 // 7 jours
 const days=[];for(let i=6;i>=0;i--){const d0=t0-i*D;const cs=S.colis.filter(c=>c.createdAt>=d0&&c.createdAt<d0+D);days.push({d:d0,ok:cs.filter(c=>c.statut==='livre').length,ko:cs.filter(c=>c.statut==='echec').length,other:cs.filter(c=>!['livre','echec','annule'].includes(c.statut)).length})}
 const mx=Math.max(...days.map(d=>d.ok+d.ko+d.other),1);const top=Math.ceil(mx/5)*5;
 const W=640,Hh=220,pl=30,pb=26,pt=10,bw=(W-pl-10)/7;
 const yS=v=>pt+(Hh-pt-pb)*(1-v/top);
 let bars='';for(let g=0;g<=top;g+=top/5){bars+=`<line x1="${pl}" x2="${W-6}" y1="${yS(g)}" y2="${yS(g)}" stroke="var(--line)" stroke-dasharray="${g?'3 4':''}"/><text x="${pl-8}" y="${yS(g)+4}" text-anchor="end">${g}</text>`}
 days.forEach((d,i)=>{const x=pl+i*bw+bw*.22,w=bw*.56;let y=yS(0);const seg=(v,col)=>{if(!v)return'';const h=yS(0)-yS(v);const top2=y-h;const r=`<rect x="${x}" y="${top2}" width="${w}" height="${h}" fill="${col}" rx="3"><title>${v}</title></rect>`;y=top2;return r};
  bars+=seg(d.ok,'var(--brand)')+seg(d.ko,'var(--bad)')+seg(d.other,'var(--gold)');
  const lab=i===6?"Auj.":new Date(d.d).toLocaleDateString('fr-FR',{weekday:'short'}).replace('.','');
  bars+=`<text x="${x+w/2}" y="${Hh-8}" text-anchor="middle" style="${i===6?'fill:var(--fg);font-weight:700':''}">${lab}</text><text x="${x+w/2}" y="${y-6}" text-anchor="middle" style="fill:var(--muted);font-weight:600">${d.ok+d.ko+d.other}</text>`});
 // donut
 const cnt={};Object.keys(ST).forEach(k=>cnt[k]=tod.filter(c=>c.statut===k).length);
 const DC={livre:'var(--ok)',en_cours:'var(--gold)',recupere:'var(--brand-2)',attribue:'var(--blue)',en_attente:'var(--line-2)',reporte:'var(--warn)',echec:'var(--bad)',annule:'var(--faint)'};
 const tot=tod.length||1;let a0=0;const R0=60,C=2*Math.PI*R0;
 const arcs=Object.keys(DC).map(k=>{const f=cnt[k]/tot;const s=`<circle cx="75" cy="75" r="${R0}" fill="none" stroke="${DC[k]}" stroke-width="18" stroke-dasharray="${Math.max(0,f*C-2)} ${C}" stroke-dashoffset="${-a0*C}" transform="rotate(-90 75 75)"/>`;a0+=f;return f?s:''}).join('');
 // zones
 const zc={};w7.forEach(c=>{const k=zoneLabel(c);zc[k]=(zc[k]||0)+1});const zs=Object.entries(zc).sort((a,b)=>b[1]-a[1]).slice(0,6);const zmax=zs[0]?.[1]||1;
 // classement
 const rk=S.livreurs.map(l=>{const m=w7.filter(c=>c.livreurId===l.id);const ok=m.filter(c=>c.statut==='livre').length;const ko=m.filter(c=>c.statut==='echec').length;return{l,ok,rate:ok+ko?ok/(ok+ko)*100:0}}).sort((a,b)=>b.ok-a.ok).slice(0,5);
 $('#view').innerHTML=`
 <div class="kpis">
  <div class="card kpi hero"><span class="l">${ic('box',15)}Colis aujourd'hui</span><span class="v">${tod.length}</span><span class="d">${dlt>=0?'+':''}${dlt} par rapport à hier</span></div>
  <div class="card kpi"><span class="l">${ic('check',15)}Livrés aujourd'hui</span><span class="v">${livT.length}</span><span class="d">${tod.length?Math.round(livT.length/tod.length*100):0} % du volume du jour</span></div>
  <div class="card kpi"><span class="l">${ic('truck',15)}En cours</span><span class="v">${enc.length+att.length}</span><span class="d">${enc.length} sur la route · ${att.length} attribués ou récupérés</span></div>
  <div class="card kpi"><span class="l">${ic('gauge',15)}Taux de réussite</span><span class="v">${rate.toFixed(1).replace('.',',')}<small> %</small></span><span class="d"><span class="${rate>=90?'up':'down'}">${rate>=90?'Objectif atteint':'Sous l\'objectif'}</span> · cible 90 %</span></div>
  <div class="card kpi"><span class="l">${ic('cash',15)}Chiffre d'affaires 7 j</span><span class="v">${NF.format(Math.round(ca7/1000))}<small> k FCFA</small></span><span class="d">Frais des colis livrés</span></div>
  <div class="card kpi"><span class="l">${ic('cash',15)}Encaissé à la livraison</span><span class="v">${NF.format(Math.round(codT/1000))}<small> k FCFA</small></span><span class="d">Aujourd'hui, à reverser aux expéditeurs</span></div>
 </div>
 <div class="grid dash-a">
  <div class="card"><div class="card-h"><div><h2>Volume des 7 derniers jours</h2><p>Colis enregistrés par jour, selon leur issue</p></div><div class="legend"><span><i style="background:var(--brand)"></i>Livrés</span><span><i style="background:var(--bad)"></i>Échecs</span><span><i style="background:var(--gold)"></i>En cours</span></div></div><div class="card-b chart"><svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Histogramme des livraisons sur 7 jours">${bars}</svg></div></div>
  <div class="card"><div class="card-h"><div><h2>Statuts du jour</h2><p>${tod.length} colis enregistrés aujourd'hui</p></div></div><div class="card-b donut-wrap"><svg viewBox="0 0 150 150" role="img" aria-label="Répartition des statuts"><circle cx="75" cy="75" r="${R0}" fill="none" stroke="var(--surface-2)" stroke-width="18"/>${arcs}<text x="75" y="72" text-anchor="middle" style="font-family:var(--f-display);font-size:30px;font-weight:700;fill:var(--fg)">${tod.length}</text><text x="75" y="92" text-anchor="middle" style="font-size:11px;fill:var(--muted)">colis</text></svg>
   <div class="dl">${Object.keys(DC).filter(k=>cnt[k]).map(k=>`<div><span><i style="background:${DC[k]}"></i>${ST[k].l}</span><b class="num">${cnt[k]}</b></div>`).join('')}</div></div></div>
 </div>
 <div class="grid dash-b">
  <div class="card"><div class="card-h"><div><h2>À attribuer</h2><p>${wait.length} colis attendent un livreur</p></div>${wait.length?`<button class="btn sm gold" id="dAuto">${ic('bolt',15)}Tout attribuer</button>`:''}</div><div class="card-b" style="padding-top:6px">
   ${wait.length?wait.slice(0,6).map(c=>{const b=bestFor(c)[0];return`<div class="todo"><div style="min-width:0;flex:1"><button class="lnk" data-open="${c.code}">${c.code}</button><div class="small" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(c.dest.nom)} · <span class="muted">${esc(c.zone)}</span></div></div><span class="small muted hide-sm">${ago(c.createdAt)}</span>${b?`<button class="btn sm" data-qa="${c.code}" title="Attribuer à ${esc(b.l.nom)}">${ic('arrow',14)}${esc(first(b.l.nom))}</button>`:'<span class="pill p-bad">Aucun livreur</span>'}</div>`}).join(''):`<div class="empty">${ic('check',26)}Tous les colis ont un livreur.</div>`}
  </div></div>
  <div class="card"><div class="card-h"><div><h2>Meilleurs livreurs</h2><p>Livraisons réussies sur 7 jours</p></div></div><div class="card-b" style="padding-top:6px">${rk.map((r,i)=>`<div class="rank"><span class="n">${i+1}</span>${av(r.l,32)}<div style="flex:1;min-width:0"><b class="small" style="font-size:13.5px">${esc(r.l.nom)}</b><div class="small muted">${r.rate.toFixed(0)} % de réussite</div></div><b class="num" style="font-family:var(--f-display);font-size:18px">${r.ok}</b></div>`).join('')}</div></div>
  <div class="card"><div class="card-h"><div><h2>Quartiers les plus livrés</h2><p>Sur 7 jours</p></div></div><div class="card-b"><div class="bar-list">${zs.map(([z,n])=>`<div><div class="t"><span>${esc(z)}</span><b class="num">${n}</b></div><div class="tr"><i style="width:${n/zmax*100}%"></i></div></div>`).join('')}</div></div></div>
 </div>
 <div class="card"><div class="card-h"><div><h2>Activité récente</h2><p>Les derniers événements enregistrés</p></div><button class="btn sm" id="dHist">Tout l'historique ${ic('arrow',14)}</button></div><div class="card-b" style="padding-top:4px"><div class="feed">${S.log.slice(0,7).map(feedItem).join('')}</div></div></div>`;
 bindOpen();
 const au=$('#dAuto');if(au)au.onclick=()=>{au.disabled=true;batchToast(autoAssignBatch(wait));refresh()};
 document.querySelectorAll('[data-qa]').forEach(b=>b.onclick=()=>{b.disabled=true;const c=CO(b.dataset.qa);const r=smartAssign(c);if(r.l){toast(`${c.code} attribué à ${esc(r.l.nom)}`);waToast(c,'attribue')}else toast(esc(r.why||'Attribution impossible'),'warn');refresh()});
 $('#dHist').onclick=()=>go('historique');
};
const LI={probleme:'clock',alerte:'alert',creation:'box',attribution:'route',statut:'truck',livre:'check',echec:'alert',notif:'chat',livreur:'users'};
function feedItem(e){return`<div class="feed-i"><span class="dot d-${e.type}">${ic(LI[e.type]||'clock',15)}</span><div style="min-width:0"><p>${e.code?`<button class="lnk" data-open="${e.code}">${e.code}</button> · `:''}${esc(e.text)}</p><small>${ago(e.t)} · ${esc(e.who)}</small></div></div>`}
function bindOpen(root=document){root.querySelectorAll('[data-open]').forEach(b=>b.onclick=e=>{e.stopPropagation();openColis(b.dataset.open)})}

/* ---------- Colis ---------- */
R.colis=()=>{
 const t0=sod(Date.now());
 const per=c=>colisF.p==='auj'?c.createdAt>=t0:colisF.p==='7j'?c.createdAt>=t0-6*D:true;
 const q=colisF.q.toLowerCase();
 const base=S.colis.filter(c=>(!isPartner()||c.partnerId===AUTH.partnerId)&&per(c)&&(!colisF.z||(colisF.z==='__none'?!c.zone:c.zone===colisF.z))&&(!q||[c.code,c.dest.nom,c.exp.nom,c.dest.tel,zoneLabel(c),LV(c.livreurId)?.nom].join(' ').toLowerCase().includes(q)));
 const list=base.filter(c=>colisF.s==='tous'||c.statut===colisF.s);
 const counts={tous:base.length};Object.keys(ST).forEach(k=>counts[k]=base.filter(c=>c.statut===k).length);
 $('#view').innerHTML=`
 <div class="toolbar">
  <div class="search">${ic('search',16)}<input class="input" id="cQ" placeholder="N° de suivi, nom, téléphone, quartier…" value="${esc(colisF.q)}" aria-label="Rechercher"></div>
  <select class="select" id="cZ" style="width:auto" aria-label="Quartier"><option value="">Tous les quartiers</option>${ZONES.map(z=>`<option ${colisF.z===z.n?'selected':''}>${z.n}</option>`).join('')}<option value="__none" ${colisF.z==='__none'?'selected':''}>Quartier non déterminé</option></select>
  <select class="select" id="cP" style="width:auto" aria-label="Période"><option value="auj" ${colisF.p==='auj'?'selected':''}>Aujourd'hui</option><option value="7j" ${colisF.p==='7j'?'selected':''}>7 derniers jours</option><option value="all" ${colisF.p==='all'?'selected':''}>Tout</option></select>
  <button class="btn pri" id="cNew" style="margin-left:auto">${ic('plus',16)}Nouveau colis</button>
 </div>
 <div class="chips" id="cS">${['tous',...Object.keys(ST)].map(k=>`<button class="chip ${colisF.s===k?'on':''}" data-s="${k}">${k==='tous'?'Tous':ST[k].l}<b>${counts[k]}</b></button>`).join('')}</div>
 <div class="card"><div class="tbl-wrap"><table>
  <thead><tr><th>N° de suivi</th><th>Destinataire</th><th>Quartier</th><th>Livreur</th>${HAS.cod?'<th>Paiement</th>':''}<th>Statut</th><th>Enregistré</th></tr></thead>
  <tbody>${list.slice(0,150).map(c=>{const L=LV(c.livreurId);return`<tr data-c="${c.code}" class="${c.code===newCode?'new':''}"><td><span class="mono" style="font-weight:600">${c.code}</span><span class="sub">${HAS.type?TYPES[c.type]:esc(c.exp.nom)}${HAS.weight&&c.poids?' · '+String(c.poids).replace('.',',')+' kg':''}</span></td><td><b style="font-weight:600">${esc(c.dest.nom)}</b><span class="sub num">${esc(c.dest.tel)}</span></td><td>${esc(c.zone)}<span class="sub" style="max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(c.adresse)}</span></td><td>${L?`<div class="row" style="gap:8px">${av(L,26)}<span style="white-space:nowrap">${esc(L.nom)}</span></div>`:'<span class="faint">Non attribué</span>'}</td>${HAS.cod?`<td>${c.cod?`<span class="tag cod num">${fcfa(c.cod)}</span>`:'<span class="tag">Prépayé</span>'}</td>`:''}<td>${badge(c.statut)}</td><td class="num" style="white-space:nowrap">${isToday(c.createdAt)?hm(c.createdAt):new Date(c.createdAt).toLocaleDateString('fr-FR',{day:'2-digit',month:'short'})}<span class="sub">${isToday(c.createdAt)?ago(c.createdAt):hm(c.createdAt)}</span></td></tr>`}).join('')}</tbody></table>
  ${list.length?'':`<div class="empty">${ic('search',26)}Aucun colis ne correspond à ces filtres.<br><button class="btn sm" id="cReset" style="margin-top:12px">Effacer les filtres</button></div>`}
 </div></div>
 <p class="small muted" style="margin:0">${list.length} colis affichés${list.length>150?' (150 premiers)':''} · Cliquez sur une ligne pour ouvrir le détail.</p>`;
 const qi=$('#cQ');qi.oninput=e=>{colisF.q=e.target.value;const p=e.target.selectionStart;R.colis();const n=$('#cQ');n.focus();n.setSelectionRange(p,p)};
 $('#cZ').onchange=e=>{colisF.z=e.target.value;R.colis()};
 $('#cP').onchange=e=>{colisF.p=e.target.value;R.colis()};
 document.querySelectorAll('#cS [data-s]').forEach(b=>b.onclick=()=>{colisF.s=b.dataset.s;R.colis()});
 document.querySelectorAll('tr[data-c]').forEach(r=>r.onclick=()=>openColis(r.dataset.c));
 $('#cNew').onclick=newColisModal;
 const rs=$('#cReset');if(rs)rs.onclick=()=>{colisF={q:'',s:'tous',z:'',p:'all'};R.colis()};
 if(newCode){const tr=document.querySelector(`tr[data-c="${newCode}"]`);if(tr)tr.scrollIntoView({block:'nearest'});setTimeout(()=>{newCode=null},4000)}
};

/* ---------- Attribution ---------- */
let attSel=new Set();
function lvRow(x,ref,i,n){
 const l=x.l;const best=ref&&x.ok&&i===0;
 const badges=x.ok?[ref?`<span class="score" title="Score : plus il est bas, mieux c'est">${fmt1(x.score)}</span>`:'',ref?`<span class="tag">${x.zm==='principale'?'Zone principale':x.zm==='secteur'?'Dans son secteur':'Hors secteur'}</span>`:`<span class="tag">Secteur ${esc(l.zone)}</span>`,x.d!=null&&ref?`<span class="tag">${fmt1(x.d)} km</span>`:''].join(''):`<span class="pill ${x.why.startsWith('Capacité')?'p-bad':LST[l.statut]?.c||'p-neutral'}">${esc(x.why)}</span>`;
 return`<div class="lv ${best?'best':''} ${x.ok?'':'off'}">${av(l)}<div style="flex:1;min-width:0"><div class="row wrap" style="gap:6px"><b>${esc(l.nom)}</b>${best?'<span class="pill p-gold">Meilleur choix</span>':''}</div>
  <div class="row small" style="margin-top:4px;gap:8px"><span class="load">${Array.from({length:Math.min(x.cap,10)},(_,k)=>`<i class="${k<x.load?(x.load>=x.cap?'h':'f'):''}"></i>`).join('')}</span><span class="muted">${x.load}/${x.cap} colis actifs</span></div>
  <div class="bd">${badges}</div></div>
  <button class="btn sm ${best?'pri':''}" data-to="${l.id}" ${x.ok&&n?'':'disabled'} title="${x.ok?'Attribution manuelle':esc(x.why)}">Attribuer${n>1?` (${n})`:''}</button></div>`;
}
R.attribution=()=>{
 const wait=S.colis.filter(c=>c.statut==='en_attente').sort((a,b)=>(b.type==='express')-(a.type==='express')||a.createdAt-b.createdAt);
 attSel=new Set([...attSel].filter(code=>wait.some(c=>c.code===code)));
 const ref=wait.find(c=>attSel.has(c.code))||null;
 const rk=ref?classer(ref):null;
 const plain=S.livreurs.map(l=>{const load=charge(l),cap=capOf(l);return{l,load,cap,ok:l.statut==='disponible'&&load<cap,why:l.statut!=='disponible'?LST[l.statut].l:`Capacité maximale atteinte (${load}/${cap})`,d:null}});
 const lv=rk?[...rk.ok,...rk.ko]:[...plain.filter(x=>x.ok).sort((a,b)=>a.load/a.cap-b.load/b.cap),...plain.filter(x=>!x.ok)];
 const elig=plain.filter(x=>x.ok).length;
 const preview=new Map(wait.map(c=>[c.code,classer(c).ok[0]||null]));
 const blocked=wait.filter(c=>!preview.get(c.code));
 const n=attSel.size;
 $('#view').innerHTML=`
 <div class="card"><div class="card-b stack" style="gap:14px">
  <div class="auto-h"><div><h2 style="font-size:17px;display:flex;gap:8px;align-items:center">${ic('bolt',18)}Attribution automatique intelligente</h2><p class="small muted" style="margin:4px 0 0">Le système choisit le meilleur livreur disponible pour chaque colis et explique son choix. Le responsable peut toujours réaffecter à la main.</p></div>
   <div class="row wrap" style="gap:10px"><label class="row small" style="gap:8px;font-weight:600;cursor:pointer"><span class="switch"><input type="checkbox" id="aCreate" ${S.settings.autoCreate?'checked':''} aria-label="Attribution automatique dès la création"><i></i></span>Dès la création d'un colis</label>
   <button class="btn gold" id="aAuto" ${wait.length?'':'disabled'}>${ic('bolt',16)}Attribution automatique${n?` (${n})`:wait.length?` (${wait.length})`:''}</button></div></div>
  <div class="rules"><span class="rule">${ic('check',13)}Statut « Disponible » uniquement</span><span class="rule">${ic('alert',13)}Jamais au-delà de la capacité</span><span class="rule">Colis actifs <b>+${POIDS.charge}</b> / colis</span><span class="rule">Secteur voisin <b>+${POIDS.secteur}</b> · hors secteur <b>+${POIDS.horsZone}</b></span><span class="rule">Distance (carte démo) <b>+${fmt1(POIDS.km)}</b> / km</span><span class="rule">Score le plus bas retenu</span></div>
 </div></div>
 ${elig===0?`<div class="banner" style="background:var(--bad-soft);color:var(--bad)">${ic('alert',16)}<span>Aucun livreur n'est disponible actuellement : les colis restent en attente. Passez un livreur en « Disponible » ou augmentez sa capacité dans le module Livreurs.</span></div>`:blocked.length?`<div class="banner" style="background:var(--bad-soft);color:var(--bad)">${ic('alert',16)}<span>${blocked.length} colis ne peu${blocked.length>1?'vent':'t'} pas être attribué${blocked.length>1?'s':''} pour l'instant.</span></div>`:''}
 ${lastRun&&Date.now()-lastRun.t<10*60000&&lastRun.res.length?`<div class="card"><div class="card-h"><div><h2>Résultat de la dernière attribution automatique</h2><p>${hm(lastRun.t)} · ${lastRun.res.filter(r=>r.l).length} attribué(s), ${lastRun.res.filter(r=>r.fail).length} en attente</p></div><button class="btn sm ghost" id="aClose">${ic('x',14)}Masquer</button></div><div class="card-b" style="padding-top:6px">${lastRun.res.map(r=>`<div class="res">${r.l?av(r.l,30):`<span class="dot d-alerte">${ic('alert',15)}</span>`}<div style="min-width:0;flex:1"><div class="row wrap" style="gap:8px"><button class="lnk" data-open="${r.c.code}">${r.c.code}</button><span class="small">${r.l?`→ <b>${esc(r.l.nom)}</b>`:'<b style="color:var(--bad)">Maintenu en attente</b>'}</span>${r.l?`<span class="score">${fmt1(r.score)}</span>`:''}</div><div class="why">${esc(r.l?r.reason:r.why)}</div></div></div>`).join('')}</div></div>`:''}
 <div class="grid att">
  <div class="card"><div class="card-h"><div><h2>Colis en attente</h2><p>${wait.length} colis · express en premier, puis les plus anciens</p></div><button class="btn sm" id="aAll" ${wait.length?'':'disabled'}>${n===wait.length&&wait.length?'Tout désélectionner':'Tout sélectionner'}</button></div>
   <div class="card-b stack">${wait.length?wait.map(c=>{const b=preview.get(c.code);return`<label class="pk ${attSel.has(c.code)?'sel':''}"><input type="checkbox" data-k="${c.code}" ${attSel.has(c.code)?'checked':''}><div style="flex:1;min-width:0"><div class="row between wrap"><span class="mono" style="font-weight:600">${c.code}</span>${c.type==='express'?'<span class="pill p-bad">Express</span>':`<span class="small muted">${ago(c.createdAt)}</span>`}</div><div style="font-weight:600;margin-top:2px">${esc(c.dest.nom)}</div><div class="small muted">${ic('pin',13).replace('class="ic"','class="ic" style="display:inline;vertical-align:-2px"')} ${esc(c.zone)} · ${esc(c.adresse)}</div>
    ${b?`<div class="sugg">${av(b.l,22)}<span>Proposé : <b>${esc(b.l.nom)}</b> · ${b.zm==='principale'?'zone principale':b.zm==='secteur'?'secteur voisin':'hors secteur'} · ${b.load}/${b.cap} actifs</span><span class="score" style="margin-left:auto">${fmt1(b.score)}</span></div>`:`<div class="sugg none">${ic('alert',14)}<span>${esc(c.alerte||'Aucun livreur disponible pour le moment')}</span></div>`}</div></label>`}).join(''):`<div class="empty">${ic('check',28)}Aucun colis en attente. Les nouveaux colis apparaîtront ici.<br><button class="btn sm pri" id="aNew" style="margin-top:12px">${ic('plus',14)}Enregistrer un colis</button></div>`}</div></div>
  <div class="card"><div class="card-h"><div><h2>Livreurs</h2><p>${ref?`Classement pour <b>${esc(ref.code)}</b> (${esc(ref.zone)}) : score le plus bas en tête`:`${elig} livreur${elig>1?'s':''} éligible${elig>1?'s':''} sur ${S.livreurs.length} · sélectionnez un colis pour voir le classement détaillé`}</p></div></div>
   <div class="card-b stack">${lv.map((x,i)=>lvRow(x,ref,i,n)).join('')}</div></div>
 </div>`;
 document.querySelectorAll('[data-k]').forEach(i=>i.onchange=()=>{i.checked?attSel.add(i.dataset.k):attSel.delete(i.dataset.k);R.attribution()});
 const aAll=$('#aAll');if(aAll)aAll.onclick=()=>{attSel=attSel.size===wait.length?new Set():new Set(wait.map(c=>c.code));R.attribution()};
 $('#aCreate').onchange=e=>{S.settings.autoCreate=e.target.checked;log('livreur','',`Attribution automatique à la création ${e.target.checked?'activée':'désactivée'}`,me0());save();toast(e.target.checked?'Les nouveaux colis seront attribués automatiquement':'Les nouveaux colis resteront en attente d\'attribution')};
 $('#aAuto').onclick=e=>{e.currentTarget.disabled=true;const list=attSel.size?wait.filter(c=>attSel.has(c.code)):wait;const res=autoAssignBatch(list);attSel.clear();batchToast(res);refresh()};
 const ac=$('#aClose');if(ac)ac.onclick=()=>{lastRun=null;R.attribution()};
 document.querySelectorAll('[data-to]').forEach(b=>b.onclick=()=>{b.disabled=true;const l=LV(b.dataset.to);const list=wait.filter(c=>attSel.has(c.code));let ok=0,errs=[];list.forEach(c=>{const r=manualAssign(c,l);r.ok?ok++:errs.push(r.msg)});attSel.clear();
  if(ok){toast(`${ok} colis attribué${ok>1?'s':''} manuellement à ${esc(l.nom)}`);if(S.tpl.attribue.on)toast(`${ok} destinataire${ok>1?'s':''} prévenu${ok>1?'s':''} sur WhatsApp`,'wa')}
  if(errs.length)toast(esc(errs.length>1?`${errs.length} colis non attribués : ${l.nom} a atteint sa capacité ou n'est plus disponible`:errs[0]),'warn');refresh()});
 const an=$('#aNew');if(an)an.onclick=newColisModal;
 bindOpen();
};

/* ---------- Livreurs ---------- */
let livF='tous';
R.livreurs=()=>{
 const t0=sod(Date.now());
 const list=S.livreurs.filter(l=>livF==='tous'||l.statut===livF);
 $('#view').innerHTML=`
 <div class="toolbar"><div class="chips">${['tous',...Object.keys(LST)].map(k=>`<button class="chip ${livF===k?'on':''}" data-f="${k}">${k==='tous'?'Tous':LST[k].l}<b>${k==='tous'?S.livreurs.length:S.livreurs.filter(l=>l.statut===k).length}</b></button>`).join('')}</div><button class="btn pri" id="lNew" style="margin-left:auto">${ic('plus',16)}Ajouter un livreur</button></div>
 <div class="grid lgrid">${list.map(l=>{const m=S.colis.filter(c=>c.livreurId===l.id);const today=m.filter(c=>c.statut==='livre'&&c.hist.at(-1).t>=t0).length;const w=m.filter(c=>c.createdAt>=t0-6*D);const ok=w.filter(c=>c.statut==='livre').length,ko=w.filter(c=>c.statut==='echec').length;
  return`<div class="card lcard"><div class="row">${av(l,44)}<div style="flex:1;min-width:0"><b style="font-size:15px">${esc(l.nom)}</b><div class="small muted num">${esc(l.tel)}</div></div>${l.note?`<span class="small" style="display:flex;gap:3px;align-items:center;color:var(--gold-ink);font-weight:700">${ic('star',14)}${String(l.note).replace('.',',')}</span>`:''}</div>
  <div class="row wrap small" style="gap:8px"><span>${esc(l.vehicule)}</span><span class="plate">${esc(l.plaque)}</span></div>
  <div class="small"><span class="muted">Zone principale :</span> <b>${esc(l.zone)}</b><div class="muted" style="margin-top:2px">Secteur : ${esc((l.zones||[]).filter(z=>z!==l.zone).join(', ')||'—')}</div></div>
  <div><div class="row between small"><span class="muted">Colis actifs</span><span class="row" style="gap:6px"><b class="num">${charge(l)}</b><span class="muted">/ ${capOf(l)} max (${vehicleKind(l.vehicule)})</span></span></div><div class="capbar"><i class="${charge(l)>=capOf(l)?'full':charge(l)/capOf(l)>=.75?'high':''}" style="width:${Math.min(100,charge(l)/capOf(l)*100)}%"></i></div></div>
  <div class="row between"><select class="select" data-st="${l.id}" style="width:auto;padding:6px 10px;font-size:13px" aria-label="Statut de ${esc(l.nom)}">${Object.keys(LST).map(k=>`<option value="${k}" ${l.statut===k?'selected':''}>${LST[k].l}</option>`).join('')}</select>${lstate(l)}</div>
  <div class="lstats"><div><b>${charge(l)}</b><span>en cours</span></div><div><b>${today}</b><span>livrés auj.</span></div><div><b>${ok+ko?Math.round(ok/(ok+ko)*100):'–'}${ok+ko?'<small style="font-size:12px"> %</small>':''}</b><span>réussite 7 j</span></div></div>
  <div class="row">${MODE==='demo'?`<button class="btn sm" data-app="${l.id}" style="flex:1;justify-content:center">${ic('phone',14)}Ouvrir son espace</button>`:''}<button class="btn sm" data-map="${l.id}">${ic('map',14)}Carte</button></div></div>`}).join('')}</div>`;
 document.querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{livF=b.dataset.f;R.livreurs()});
 document.querySelectorAll('[data-st]').forEach(s=>s.onchange=()=>{const l=LV(s.dataset.st);const old=l.statut;l.statut=s.value;log('livreur','',`${l.nom} : ${LST[old].l} → ${LST[s.value].l}`,me0());save();remote('duty',l);toast(`${esc(l.nom)} est maintenant « ${LST[s.value].l} »`);refresh()});
 document.querySelectorAll('[data-app]').forEach(b=>b.onclick=()=>{drvOpenAs(b.dataset.app)});
 document.querySelectorAll('[data-map]').forEach(b=>b.onclick=()=>{mapSel={k:'l',id:b.dataset.map};go('carte')});
 $('#lNew').onclick=newLivreurModal;
};

/* ---------- Carte (Leaflet + OpenStreetMap) ---------- */
let mapSel=null,mapLayers={l:true,d:true,z:false},raf=null,LM=null,LMK={},MAPV=null;
const ACT_COL={en_attente:'#8a9893',attribue:'#1d5ea8',recupere:'#0c6c49',en_cours:'#d99a02'};
const llOf=p=>{const g=toLL(p.x,p.y);return[g.lat,g.lng]};
R.carte=()=>{
 const live=S.livreurs.filter(onDuty);
 $('#view').innerHTML=`
 <div class="grid mapgrid">
  <div class="map" id="map">
   <div id="lmap" class="lmap" role="region" aria-label="Carte de Libreville"></div>
   <div class="map-tools">${[['l','Livreurs'],['d','Destinations'],['z','Quartiers']].map(([k,t])=>`<button class="chip ${mapLayers[k]?'on':''}" data-ly="${k}">${t}</button>`).join('')}</div>
   <div class="map-note" id="mapNote" hidden>${ic('alert',16)}<span><b>Fond de carte bloqué sur cette page.</b> Les rues de Libreville (OpenStreetMap) s'affichent dans la version installée sur votre ordinateur ou en ligne sur votre propre adresse https. Les livreurs et les colis restent placés à leur position réelle.</span></div>
   ${window.L?'':`<div class="map-off">${ic('alert',22)}<b>Carte indisponible</b><span class="small">La carte OpenStreetMap a besoin d'une connexion Internet.</span></div>`}
  </div>
  <div class="stack">
   <div class="card"><div class="card-b" id="mapInfo"></div></div>
   <div class="card"><div class="card-h"><h2>Livreurs en service</h2></div><div class="card-b stack" style="gap:2px;padding-top:8px" id="mapList"></div></div>
   <div class="legend" style="padding:0 4px">${[['en_cours','En livraison'],['recupere','Récupéré'],['attribue','Attribué'],['en_attente','En attente']].map(([k,t])=>`<span><i style="background:${ACT_COL[k]};border-radius:50%"></i>${t}</span>`).join('')}</div>
   <p class="small faint" style="margin:0 4px">${MODE==='supabase'?'Positions GPS réelles envoyées par les livreurs en service (toutes les 2 minutes).':'Démo : positions simulées. Les centres de quartiers sont approximatifs.'}</p>
  </div>
 </div>`;
 document.querySelectorAll('[data-ly]').forEach(b=>b.onclick=()=>{mapLayers[b.dataset.ly]=!mapLayers[b.dataset.ly];b.classList.toggle('on',mapLayers[b.dataset.ly]);mapDraw()});
 if(window.L){
  if(LM){try{LM.remove()}catch(e){}}
  LM=L.map('lmap',{zoomControl:true,attributionControl:true});
  let tileFail=0,tileOk=0;
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© les contributeurs d\'OpenStreetMap'})
   .on('tileload',()=>{tileOk++;const n=document.getElementById('mapNote');if(n)n.hidden=true})
   .on('tileerror',()=>{tileFail++;const n=document.getElementById('mapNote');if(n&&!tileOk&&tileFail>=3)n.hidden=false}).addTo(LM);
  if(MAPV)LM.setView(MAPV.c,MAPV.z);else LM.fitBounds(L.latLngBounds(ZONES.map(z=>[z.lat,z.lng])).pad(.05));
  LM.on('moveend',()=>{MAPV={c:LM.getCenter(),z:LM.getZoom()}});
  LM._fe=L.layerGroup().addTo(LM);
 }
 mapDraw();mapInfo();startAnim();
};
/* Dessine (ou redessine) les couches sans recréer la carte : le zoom et la position sont conservés */
function mapDraw(){
 const list=$('#mapList');
 if(list)list.innerHTML=S.livreurs.filter(onDuty).map(l=>{const c=S.colis.find(x=>x.livreurId===l.id&&x.statut==='en_cours');return`<button class="conv" style="padding:8px 4px;border-bottom:1px dashed var(--line)" data-ml="${l.id}">${av(l,30)}<span class="c"><b>${esc(l.nom)}</b><span>${c?`Vers ${esc(zoneLabel(c))} · ${c.code}`:charge(l)?`${charge(l)} colis actifs`:'Disponible · '+esc(l.zone||'')}${l.posAt?` · position ${ago(l.posAt)}`:''}</span></span>${lstate(l)}</button>`}).join('')||'<p class="small muted" style="margin:0">Aucun livreur en service.</p>';
 document.querySelectorAll('[data-ml]').forEach(b=>b.onclick=()=>{mapSel={k:'l',id:b.dataset.ml};mapInfo();const l=LV(b.dataset.ml);if(LM&&l?.pos)LM.panTo(llOf(l.pos))});
 if(!LM||!document.getElementById('lmap'))return;
 const g=LM._fe;g.clearLayers();LMK={};
 if(mapLayers.z)ZONES.forEach(z=>L.circleMarker([z.lat,z.lng],{radius:4,color:'#5a6a64',weight:1,fillColor:'#8a9893',fillOpacity:.8}).bindTooltip(z.n,{permanent:true,direction:'right',className:'ltip'}).addTo(g));
 L.marker([HQ.lat,HQ.lng],{icon:L.divIcon({className:'lhq',html:`<span>${I.bolt?`<svg width="14" height="14" viewBox="0 0 24 24" fill="#efb102"><path d="M13 2.5L4.5 13.5H12l-1 8 8.5-11H12z"/></svg>`:''}</span>`,iconSize:[26,26]}),title:HQ.n}).on('click',()=>{mapSel={k:'hq'};mapInfo()}).addTo(g);
 if(mapLayers.d)S.colis.filter(c=>['en_attente',...ACTIVE].includes(c.statut)&&(!isPartner()||c.partnerId===AUTH.partnerId)).forEach(c=>{
  L.circleMarker(llOf(c),{radius:7,color:'#fff',weight:2,fillColor:ACT_COL[c.statut],fillOpacity:1}).bindTooltip(`${c.code} · ${zoneLabel(c)}`).on('click',()=>{mapSel={k:'c',id:c.code};mapInfo()}).addTo(g)});
 if(mapLayers.l)S.livreurs.filter(l=>onDuty(l)&&l.pos&&Number.isFinite(l.pos.x)).forEach(l=>{
  LMK[l.id]=L.marker(llOf(l.pos),{icon:L.divIcon({className:'lmk'+(mapSel?.k==='l'&&mapSel.id===l.id?' sel':'')+(charge(l)?' busy':''),html:`<span style="background:${l.couleur}">${initials(l.nom)}</span>`,iconSize:[30,30]}),title:l.nom,zIndexOffset:500})
   .on('click',()=>{mapSel={k:'l',id:l.id};mapInfo();mapDraw()}).addTo(g)});
}
function mapInfo(){
 const el=$('#mapInfo');if(!el)return;
 if(mapSel&&mapSel.k==='l'){const l=LV(mapSel.id);if(l){const ms=S.colis.filter(c=>c.livreurId===l.id&&ACTIVE.includes(c.statut));
  el.innerHTML=`<div class="row" style="margin-bottom:12px">${av(l,40)}<div><b>${esc(l.nom)}</b><div class="small muted">${esc(l.vehicule)} · <span class="plate">${esc(l.plaque)}</span></div></div></div><div class="row between small" style="margin-bottom:10px">${lstate(l)}<span class="muted num">${esc(l.tel)}</span></div>${l.posAt?`<p class="small muted" style="margin:0 0 8px">Dernière position : ${ago(l.posAt)}</p>`:''}${ms.length?ms.map(c=>`<div class="todo" style="padding:8px 0"><div style="flex:1;min-width:0"><button class="lnk" data-open="${c.code}">${c.code}</button><div class="small muted">${esc(c.dest.nom)} · ${esc(zoneLabel(c))}</div></div>${badge(c.statut)}</div>`).join(''):'<p class="small muted" style="margin:0">Aucune mission en cours.</p>'}`;bindOpen(el);return}}
 if(mapSel&&mapSel.k==='c'){const c=CO(mapSel.id);if(c){const L2=LV(c.livreurId);el.innerHTML=`<div class="row between" style="margin-bottom:8px"><span class="mono" style="font-weight:600;font-size:15px">${c.code}</span>${badge(c.statut)}</div><b>${esc(c.dest.nom)}</b><p class="small muted" style="margin:2px 0 10px">${esc(zoneLabel(c))} · ${esc(c.adresse)}</p><p class="small" style="margin:0 0 12px">${L2?`Livreur : <b>${esc(L2.nom)}</b>`:'<span class="muted">Aucun livreur attribué</span>'}</p><button class="btn sm pri" data-open="${c.code}">Ouvrir le colis</button>`;bindOpen(el);return}}
 if(mapSel&&mapSel.k==='hq'){el.innerHTML=`<b>${HQ.n}</b><p class="small muted" style="margin:4px 0 0">Comptoir d'enregistrement et entrepôt. Les frais sont calculés selon la distance depuis l'agence.</p>`;return}
 const enc=S.colis.filter(c=>c.statut==='en_cours').length;
 el.innerHTML=`<b style="font-family:var(--f-display);font-size:16px">Libreville en direct</b><p class="small muted" style="margin:4px 0 10px">Cliquez sur un livreur, une destination ou l'agence pour afficher le détail.</p><div class="row wrap small" style="gap:14px"><span><b class="num">${S.livreurs.filter(l=>charge(l)>0).length}</b> livreurs en tournée</span><span><b class="num">${enc}</b> colis sur la route</span></div>`}
function target(l){const c=S.colis.find(x=>x.livreurId===l.id&&x.statut==='en_cours');if(c)return{x:c.x,y:c.y};if(S.colis.some(x=>x.livreurId===l.id&&(x.statut==='attribue'||x.statut==='recupere')))return{x:HQ.x+6,y:HQ.y+4};return null}
function step(l,sp){const t=target(l);if(!t||!l.pos)return;const dx=t.x-l.pos.x,dy=t.y-l.pos.y,d=Math.hypot(dx,dy);if(d<1)return;const s=Math.min(sp,d);l.pos.x+=dx/d*s;l.pos.y+=dy/d*s;l.posAt=Date.now()}
let lastSave=0;
/* Démo uniquement : déplacement simulé des livreurs. En mode Supabase, les positions viennent du GPS. */
function startAnim(){cancelAnimationFrame(raf);if(MODE!=='demo')return;let lastDraw=0;const loop=t=>{if(cur!=='carte')return;S.livreurs.forEach(l=>{if(!onDuty(l))return;step(l,.12);const m=LMK[l.id];if(m&&t-lastDraw>120)m.setLatLng(llOf(l.pos))});if(t-lastDraw>120)lastDraw=t;if(Date.now()-lastSave>5000){lastSave=Date.now();save()}raf=requestAnimationFrame(loop)};if(!matchMedia('(prefers-reduced-motion: reduce)').matches)raf=requestAnimationFrame(loop)}

/* ---------- Historique ---------- */
let histF={t:'tous',q:''};
const HT={tous:'Tous',creation:'Créations',attribution:'Attributions',statut:'Prises en charge',livre:'Livraisons',echec:'Échecs',notif:'WhatsApp',livreur:'Équipe',probleme:'Reports et annulations',alerte:'Alertes'};
R.historique=()=>{
 const q=histF.q.toLowerCase();
 const list=S.log.filter(e=>(histF.t==='tous'||e.type===histF.t)&&(!q||(e.code+' '+e.text+' '+e.who).toLowerCase().includes(q)));
 const groups=[];list.slice(0,400).forEach(e=>{const d=dayLabel(e.t);let g=groups.at(-1);if(!g||g.d!==d)groups.push(g={d,items:[]});g.items.push(e)});
 $('#view').innerHTML=`
 <div class="toolbar"><div class="search">${ic('search',16)}<input class="input" id="hQ" placeholder="Rechercher un colis, un livreur, un client…" value="${esc(histF.q)}" aria-label="Rechercher dans l'historique"></div><span class="small muted">${list.length} événements</span></div>
 <div class="chips">${Object.keys(HT).map(k=>`<button class="chip ${histF.t===k?'on':''}" data-t="${k}">${HT[k]}<b>${k==='tous'?S.log.length:S.log.filter(e=>e.type===k).length}</b></button>`).join('')}</div>
 <div class="card" style="overflow:hidden">${groups.length?groups.map(g=>`<div class="day-h">${g.d} · ${g.items.length}</div>${g.items.map(e=>`<div class="hrow"><span class="t">${hm(e.t)}</span><span class="dot d-${e.type}">${ic(LI[e.type]||'clock',15)}</span><p>${e.code?`<button class="lnk" data-open="${e.code}">${e.code}</button> · `:''}${esc(e.text)}</p><small>${esc(e.who)}</small></div>`).join('')}`).join(''):`<div class="empty">${ic('clock',26)}Aucun événement ne correspond.</div>`}</div>`;
 const qi=$('#hQ');qi.oninput=e=>{histF.q=e.target.value;const p=e.target.selectionStart;R.historique();const n=$('#hQ');n.focus();n.setSelectionRange(p,p)};
 document.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{histF.t=b.dataset.t;R.historique()});
 bindOpen();
};

/* ---------- WhatsApp ---------- */
let waSel=null,waQ='',waTpl=false;
const REPLIES=['Merci beaucoup !','D\'accord, je serai là.','Est-ce qu\'il peut passer après 16 h ?','Bien reçu, merci FAST EXPRESS.','Je suis au travail, il peut laisser au gardien ?','Ok, j\'ai le montant.'];
R.whatsapp=()=>{
 const keys=Object.keys(S.wa).sort((a,b)=>S.wa[b].msgs.at(-1).t-S.wa[a].msgs.at(-1).t);
 if(!waSel||!S.wa[waSel])waSel=keys[0];
 const vis=keys.filter(k=>!waQ||(S.wa[k].nom+' '+k).toLowerCase().includes(waQ.toLowerCase()));
 const th=S.wa[waSel];if(th)S.read[waSel]=th.msgs.length;
 const sent=Object.values(S.wa).reduce((a,t)=>a+t.msgs.filter(m=>m.dir==='out').length,0);
 let lastD='';
 $('#view').innerHTML=`
 <div class="banner">${ic('alert',16)}<span>Simulation : aucun message réel n'est envoyé. ${sent} notifications générées automatiquement à chaque étape des livraisons.</span><button class="btn sm" id="wTplT" style="margin-left:auto">${waTpl?'Masquer':'Modèles de messages'}</button></div>
 <div class="card wa">
  <div class="wa-list"><div class="hd"><div class="search" style="position:relative">${ic('search',16).replace('class="ic"','class="ic" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--faint)"')}<input class="input" id="wQ" placeholder="Rechercher un contact" value="${esc(waQ)}" style="padding-left:34px" aria-label="Rechercher un contact"></div></div>
   <div class="wa-convs">${vis.map(k=>{const t=S.wa[k],m=t.msgs.at(-1),u=t.msgs.length-(S.read[k]||0);return`<button class="conv ${k===waSel?'on':''}" data-w="${esc(k)}"><span class="av" style="background:${AVC[(k.charCodeAt(k.length-1)+k.charCodeAt(k.length-2))%AVC.length]}">${initials(t.nom)}</span><span class="c"><b>${esc(t.nom)}</b><span>${m.dir==='in'?'':'Vous : '}${esc(m.text)}</span></span><span class="m"><span>${isToday(m.t)?hm(m.t):dayLabel(m.t)}</span>${u>0?`<span class="unr">${u}</span>`:''}</span></button>`}).join('')||'<div class="empty small">Aucun contact</div>'}</div></div>
  <div class="chat">${th?`<div class="chat-h"><span class="av" style="background:var(--brand)">${initials(th.nom)}</span><div style="min-width:0;flex:1"><b>${esc(th.nom)}</b><div class="small muted num">${esc(waSel)}</div></div>${th.msgs.find(m=>m.code)?`<button class="btn sm" data-open="${th.msgs.filter(m=>m.code).at(-1).code}">${ic('box',14)}<span class="hide-sm">Voir le colis</span></button>`:''}</div>
   <div class="chat-b" id="chatB">${th.msgs.map(m=>{const d=dayLabel(m.t);const sep=d!==lastD?`<span class="daysep">${d}</span>`:'';lastD=d;return sep+`<div class="bub ${m.dir}">${m.dir==='out'&&m.key?`<span class="lbl">${esc(S.tpl[m.key]?.l||'Message')}</span>`:''}${esc(m.text)}<small>${hm(m.t)}${m.dir==='out'?'<span class="tk">✓✓</span>':''}</small></div>`}).join('')}</div>
   <form class="chat-f" id="wF"><input class="input" id="wIn" placeholder="Écrire un message au client…" autocomplete="off" aria-label="Message"><button class="btn pri" type="button" id="wSend" aria-label="Envoyer">${ic('send',17)}</button></form>`:'<div class="empty">Aucune conversation.</div>'}</div>
  <div class="wa-side ${waTpl?'show':''}"><div><b style="font-family:var(--f-display);font-size:15px">Modèles automatiques</b><p class="small muted" style="margin:2px 0 0">Variables : {prenom} {code} {livreur} {tel_livreur} {zone} {adresse} {otp} {cod} {heure} {motif} {expediteur}</p></div>
   ${Object.entries(S.tpl).map(([k,t])=>`<div class="tpl"><label class="row between small" style="font-weight:700"><span>${esc(t.l)}</span><span class="switch"><input type="checkbox" data-ton="${k}" ${t.on?'checked':''} aria-label="Activer ${esc(t.l)}"><i></i></span></label><textarea class="input" data-tt="${k}" id="tpl-${k}" aria-label="Texte du modèle ${esc(t.l)}">${esc(t.t)}</textarea></div>`).join('')}
   <button class="btn sm" id="wTplR">${ic('refresh',14)}Rétablir les modèles d'origine</button></div>
 </div>`;
 const cb=$('#chatB');if(cb)cb.scrollTop=cb.scrollHeight;
 document.querySelectorAll('[data-w]').forEach(b=>b.onclick=()=>{waSel=b.dataset.w;R.whatsapp();renderNav()});
 const qi=$('#wQ');qi.oninput=e=>{waQ=e.target.value;const p=e.target.selectionStart;R.whatsapp();const n=$('#wQ');n.focus();n.setSelectionRange(p,p)};
 $('#wTplT').onclick=()=>{waTpl=!waTpl;R.whatsapp()};
 document.querySelectorAll('[data-ton]').forEach(i=>i.onchange=()=>{S.tpl[i.dataset.ton].on=i.checked;save();toast(`Message « ${S.tpl[i.dataset.ton].l} » ${i.checked?'activé':'désactivé'}`)});
 document.querySelectorAll('[data-tt]').forEach(t=>t.oninput=()=>{S.tpl[t.dataset.tt].t=t.value;save()});
 $('#wTplR').onclick=()=>{S.tpl=JSON.parse(JSON.stringify(DEF_TPL));save();R.whatsapp();toast('Modèles rétablis')};
 const f=$('#wF');if(f)bindForm(f,$('#wSend'),()=>{const v=$('#wIn').value.trim();if(!v)return;const k=waSel;S.wa[k].msgs.push({dir:'out',text:v,t:Date.now()});S.read[k]=S.wa[k].msgs.length;log('notif',S.wa[k].msgs.filter(m=>m.code).at(-1)?.code||'',`Message manuel envoyé à ${S.wa[k].nom}`,me0());save();R.whatsapp();
  setTimeout(()=>{if(!S.wa[k])return;S.wa[k].msgs.push({dir:'in',text:REPLIES[Math.floor(Math.random()*REPLIES.length)],t:Date.now()});save();if(cur==='whatsapp'&&waSel===k){const keep=$('#wIn')?.value||'';R.whatsapp();const n=$('#wIn');if(n){n.value=keep;n.focus()}}else{renderNav();toast(`Nouveau message de ${esc(first(S.wa[k].nom))}`,'wa')}},2200)});
 bindOpen();
};

/* =========================================================
   ESPACE LIVREUR — application mobile
   Mêmes données que l'administration (S) : aucune copie séparée.
   La session ne mémorise que l'identifiant du livreur connecté.
   ========================================================= */
/* Le livreur affiché est celui du compte connecté. En mode démo, un manager peut prévisualiser l'espace d'un livreur. */
let drvId=null,drvPreview=null,drvTab='missions',drvDetail=null,drvSheet=null,drvPhoto=null,drvHistF='tous',drvBusy=false;
const me=()=>drvId?LV(drvId):null;
const mine=()=>S.colis.filter(c=>c.livreurId===drvId);
const DONE=['livre','reporte','annule','echec'];
const lastT=c=>c.hist.at(-1).t;
function drvTyping(){const a=document.activeElement;return a&&$('#drv').contains(a)&&/INPUT|TEXTAREA|SELECT/.test(a.tagName)}
function drvSetSession(id){drvPreview=id;drvId=id}
function drvLogout(silent){gpsStop();drvSetSession(null);drvTab='missions';drvDetail=null;drvSheet=null;drvPhoto=null;if(!silent){if(isDriver())logout();else go('livreurs')}}
function drvOpenAs(id){const l=LV(id);if(!l||MODE!=='demo')return;drvSetSession(id);drvTab='missions';drvDetail=null;drvSheet=null;go('livreur')}
/* Un livreur ne peut agir que sur ses propres colis */
function myColis(code){const c=CO(code);if(c&&c.livreurId===drvId)return c;toast('Ce colis ne fait plus partie de vos missions','warn');drvDetail=null;drvSheet=null;R.livreur();return null}
const mapsUrl=c=>{const g=toLL(c.x,c.y);return'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(`${g.lat},${g.lng}`)};
function compressImage(file,max=560,q=.62){return new Promise((res,rej)=>{
 if(!file)return rej(new Error('Aucun fichier'));if(!/^image\//.test(file.type))return rej(new Error('Ce fichier n\'est pas une image.'));if(file.size>15e6)return rej(new Error('Image trop lourde (15 Mo maximum).'));
 const fr=new FileReader();fr.onerror=()=>rej(new Error('Lecture impossible.'));
 fr.onload=()=>{const img=new Image();img.onload=()=>{const k=Math.min(1,max/Math.max(img.width,img.height));const cv=document.createElement('canvas');cv.width=Math.max(1,Math.round(img.width*k));cv.height=Math.max(1,Math.round(img.height*k));const g=cv.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,cv.width,cv.height);g.drawImage(img,0,0,cv.width,cv.height);res(cv.toDataURL('image/jpeg',q))};img.onerror=()=>rej(new Error('Image illisible.'));img.src=fr.result};
 fr.readAsDataURL(file)})}

R.livreur=()=>{
 const root=$('#drv');drvId=isDriver()?AUTH.driverId:drvPreview;const l=me();
 if(!l){gpsStop();root.innerHTML=drvLoginHtml();drvBindLogin();return}
 if(drvDetail&&!CO(drvDetail))drvDetail=null;
 const c=drvDetail?CO(drvDetail):null;
 if(c&&c.livreurId!==drvId){drvDetail=null;toast('Ce colis a été réaffecté par l\'agence','warn');return R.livreur()}
 const act=mine().filter(x=>ACTIVE.includes(x.statut));
 const scroll=root.querySelector('.drv-body')?.scrollTop||0;const keepScroll=root.dataset.view===(drvTab+'|'+(drvDetail||''));
 root.dataset.view=drvTab+'|'+(drvDetail||'');
 root.innerHTML=`
 ${isMgr()?`<div class="drv-admin"><button class="btn" id="dvAdmin">${ic('arrow',16).replace('class="ic"','class="ic" style="transform:rotate(180deg)"')}Retour à l'administration</button><p>Aperçu de l'espace de ${esc(l.nom)} (démo). Les actions mettent à jour le tableau de bord en direct.</p></div>`:''}
 <div class="drv-shell">
  <header class="drv-bar">${c?`<button class="back" id="dvBack" aria-label="Retour">${ic('arrow',18).replace('class="ic"','class="ic" style="transform:rotate(180deg)"')}</button><div><b class="mono" style="letter-spacing:0">${c.code}</b><small>${ST[c.statut].l}</small></div>`:`${logoHtml(36)}<div><b>FAST EXPRESS</b><small>Espace livreur</small></div>`}
   <button class="drv-av" id="dvAvail" aria-label="Changer ma disponibilité"><i style="background:${l.statut==='disponible'?'#3fcf9c':'#ef7462'}"></i>${LST[l.statut].l}</button></header>
  <main class="drv-body">${c?drvDetailHtml(c):drvTab==='missions'?drvMissionsHtml(l,act):drvTab==='historique'?drvHistoryHtml(l):drvProfileHtml(l)}</main>
  <nav class="drv-nav">${[['missions','box','Missions',act.length],['historique','clock','Historique',0],['profil','users','Profil',0]].map(([k,i,t,n])=>`<button class="${!c&&drvTab===k?'on':''}" data-dtab="${k}">${ic(i,22)}${t}${n?`<span class="nb">${n}</span>`:''}</button>`).join('')}</nav>
  ${drvSheet?drvSheetHtml():''}
 </div>`;
 if(keepScroll)root.querySelector('.drv-body').scrollTop=scroll;
 drvBind();
 if(gpsWanted())gpsStart();else gpsStop();
};

/* ---------- Connexion ---------- */
function drvLoginHtml(){
 return`<div class="drv-admin"><button class="btn" id="dvAdmin">${ic('arrow',16).replace('class="ic"','class="ic" style="transform:rotate(180deg)"')}Retour à l'administration</button><p>Aperçu de l'espace livreur (démo).</p></div>
 <div class="drv-shell"><div class="drv-login">
  <div class="stack" style="align-items:center;text-align:center;gap:10px">${logoHtml(96)}<h2 style="font-size:22px">Espace livreur</h2><p class="muted" style="margin:0">Choisissez le livreur dont vous voulez voir l'application. Les livreurs, eux, se connectent avec leur propre compte.</p></div>
  <div class="stack" style="gap:8px">${S.livreurs.map(x=>`<button class="acc" data-acc="${x.id}" type="button">${av(x,34)}<span style="flex:1;min-width:0"><b style="display:block">${esc(x.nom)}</b><span class="mono">${esc(x.vehicule)} · ${charge(x)} colis actifs</span></span>${lbadge(x.statut)}</button>`).join('')}</div>
 </div></div>`}
function drvBindLogin(){
 const b=$('#dvAdmin');if(b)b.onclick=()=>go('tableau');
 document.querySelectorAll('[data-acc]').forEach(x=>x.onclick=()=>{drvSetSession(x.dataset.acc);R.livreur()});
}

/* ---------- Écrans ---------- */
function drvMissionCard(c){
 return`<div class="mcard ${c.statut==='en_cours'?'live':''}">
  <div class="row between"><span class="mono" style="font-weight:600">${c.code}</span>${badge(c.statut)}</div>
  <div><b style="font-size:15px">${esc(c.dest.nom)}</b><div class="small muted num">${esc(c.dest.tel)}</div></div>
  <div class="addr">${ic('pin',16)}<span><b>${esc(zoneLabel(c))}</b> · ${esc(c.adresse)}</span></div>
  <div class="row small wrap" style="gap:6px">${HAS.cod?(c.cod?`<span class="tag cod">À encaisser ${fcfa(c.cod)}</span>`:'<span class="tag">Déjà payé</span>'):''}${HAS.type?`<span class="tag">${TYPES[c.type]}</span>`:''}${c.type==='express'?'<span class="pill p-bad">Express</span>':''}</div>
  ${c.statut==='attribue'?`<button class="bigbtn pri" data-pick="${c.code}">${ic('box',18)}J'ai récupéré le colis</button>`:c.statut==='recupere'?`<button class="bigbtn pri" data-start="${c.code}">${ic('truck',18)}Commencer la livraison</button>`:`<button class="bigbtn pri" data-confirm="${c.code}">${ic('check',18)}Confirmer la livraison</button>`}
  <div class="btnrow"><a class="bigbtn" href="${mapsUrl(c)}" target="_blank" rel="noopener" style="min-height:42px;font-size:13.5px">${ic('map',16)}Google Maps</a><button class="bigbtn" data-detail="${c.code}" style="min-height:42px;font-size:13.5px">${ic('eye',16)}Détails</button></div>
 </div>`}
function drvMissionsHtml(l,act){
 const t0=sod(Date.now());const today=mine().filter(c=>DONE.includes(c.statut)&&lastT(c)>=t0);
 const ok=today.filter(c=>c.statut==='livre');const cash=ok.reduce((a,c)=>a+c.cod,0);
 const ord={en_cours:0,recupere:1,attribue:2};act.sort((a,b)=>ord[a.statut]-ord[b.statut]||(b.type==='express')-(a.type==='express')||a.createdAt-b.createdAt);
 return`<section class="drv-hello"><div><span class="small" style="opacity:.85">Bonjour,</span><h2>${esc(l.nom)}</h2></div>
  <div class="drv-kpis"><div><b>${act.length}</b><span>à livrer</span></div><div><b>${ok.length}</b><span>livrés auj.</span></div><div><b>${cash>=1000?NF.format(Math.round(cash/1000))+'k':NF.format(cash)}</b><span>FCFA encaissés</span></div></div></section>
  ${gpsCardHtml(l)}
  ${l.statut!=='disponible'?`<div class="banner">${ic('alert',16)}<span>Vous êtes « Hors service » : l'agence ne vous attribue pas de nouveaux colis. <button class="lnk" id="dvGoAvail" style="font-family:var(--f-body)">Passer en service</button></span></div>`:''}
  <div class="row between"><b style="font-family:var(--f-display);font-size:16px">Mes colis (${act.length})</b><span class="small muted">${charge(l)}/${capOf(l)} colis actifs</span></div>
  ${act.length?act.map(drvMissionCard).join(''):`<div class="empty card">${ic('check',30)}<b style="color:var(--fg)">Aucune mission en cours</b><br>Les colis que l'agence vous attribue apparaîtront ici.</div>`}`}
function drvDetailHtml(c){
 const active=ACTIVE.includes(c.statut);
 return`${stepsHtml(c)}
  ${['reporte','annule','echec'].includes(c.statut)?`<div class="banner" style="background:var(--warn-soft);color:var(--warn)">${ic('alert',16)}<span>${ST[c.statut].l} · ${esc(c.motif)}${c.report&&c.statut==='reporte'?` · ${esc(c.report.creneau)}`:''}</span></div>`:''}
  <div class="mcard"><b class="small" style="text-transform:uppercase;letter-spacing:.1em;color:var(--faint)">Destinataire</b>
   <div><b style="font-size:17px">${esc(c.dest.nom)}</b></div>
   <div class="row between wrap"><span class="num" style="font-size:15px;user-select:all">${esc(c.dest.tel)}</span><span class="row" style="gap:6px"><a class="btn sm" href="tel:${digits(c.dest.tel)}">${ic('call',14)}Appeler</a><button class="btn sm" data-copy="${esc(c.dest.tel)}">Copier</button></span></div>
   <div class="addr">${ic('pin',16)}<span><b>${esc(zoneLabel(c))}</b><br>${esc(c.adresse)}</span></div>
   <a class="bigbtn gold" href="${mapsUrl(c)}" target="_blank" rel="noopener">${ic('map',18)}Ouvrir dans Google Maps</a></div>
  <div class="mcard"><b class="small" style="text-transform:uppercase;letter-spacing:.1em;color:var(--faint)">Colis</b>
   <dl class="kv small">${HAS.type?`<dt>Type</dt><dd>${TYPES[c.type]}</dd>`:''}${HAS.weight&&c.poids?`<dt>Poids</dt><dd>${String(c.poids).replace('.',',')} kg</dd>`:''}${HAS.cod?`<dt>Paiement</dt><dd>${c.cod?`<b>${fcfa(c.cod)}</b> à encaisser`:'Déjà payé'}</dd>`:''}<dt>Expéditeur</dt><dd>${esc(c.exp.nom)}</dd></dl></div>
  ${active?`${c.statut==='attribue'?`<button class="bigbtn pri" data-pick="${c.code}">${ic('box',18)}J'ai récupéré le colis</button>`:c.statut==='recupere'?`<button class="bigbtn pri" data-start="${c.code}">${ic('truck',18)}Commencer la livraison</button>`:`<button class="bigbtn pri" data-confirm="${c.code}">${ic('check',18)}Confirmer la livraison</button>`}
   <button class="bigbtn warn" data-issue="${c.code}">${ic('alert',18)}Signaler un problème</button>`:''}
  ${c.preuve&&c.preuve.img?`<div class="proof"><img src="${c.preuve.img}" alt="Photo de preuve de livraison"><small>Preuve de livraison · ${hm(c.preuve.t)}</small></div>`:''}
  <div class="mcard"><b class="small" style="text-transform:uppercase;letter-spacing:.1em;color:var(--faint)">Historique du colis</b>${tlHtml(c)}</div>`}
function drvHistoryHtml(l){
 const all=mine().filter(c=>DONE.includes(c.statut)).sort((a,b)=>lastT(b)-lastT(a));
 const list=all.filter(c=>drvHistF==='tous'||c.statut===drvHistF);
 const w=all.filter(c=>lastT(c)>=sod(Date.now())-6*D);const ok=w.filter(c=>c.statut==='livre').length;
 let lastD='';
 return`<div class="drv-kpis" style="background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:10px">${[[ok,'livrés sur 7 j'],[w.length?Math.round(ok/w.length*100)+' %':'–','réussite 7 j'],[all.length,'missions terminées']].map(([v,t])=>`<div style="background:var(--surface-2)"><b>${v}</b><span class="muted">${t}</span></div>`).join('')}</div>
  <div class="chips">${[['tous','Toutes'],['livre','Livrées'],['reporte','Reportées'],['annule','Annulées'],['echec','Échecs']].map(([k,t])=>`<button class="chip ${drvHistF===k?'on':''}" data-hf="${k}">${t}<b>${k==='tous'?all.length:all.filter(c=>c.statut===k).length}</b></button>`).join('')}</div>
  ${list.length?list.slice(0,80).map(c=>{const d=dayLabel(lastT(c));const sep=d!==lastD?`<div class="small" style="font-weight:700;color:var(--faint);text-transform:uppercase;letter-spacing:.08em;margin-top:4px">${d}</div>`:'';lastD=d;
   return sep+`<button class="hitem" data-detail="${c.code}">${c.preuve&&c.preuve.img?`<img src="${c.preuve.img}" alt="">`:`<span class="dot d-${c.statut==='livre'?'livre':c.statut==='echec'?'echec':'probleme'}" style="width:44px;height:44px;border-radius:10px">${ic(c.statut==='livre'?'check':'alert',18)}</span>`}<span style="flex:1;min-width:0"><span class="row between"><b class="mono" style="font-size:13px">${c.code}</b><span class="small muted">${hm(lastT(c))}</span></span><span class="small" style="display:block">${esc(c.dest.nom)} · ${esc(c.zone)}</span><span class="row" style="gap:6px;margin-top:4px">${badge(c.statut)}${c.motif&&c.statut!=='livre'?`<span class="small muted" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(c.motif)}</span>`:''}</span></span></button>`}).join(''):`<div class="empty card">${ic('clock',28)}Aucune mission dans cette catégorie.</div>`}`}
function drvProfileHtml(l){
 return`<div class="mcard" style="align-items:center;text-align:center">${av(l,72)}<div><b style="font-size:18px;font-family:var(--f-display)">${esc(l.nom)}</b><div class="muted num">${esc(l.tel)}</div></div>${lstate(l)}</div>
  <div class="mcard"><b class="small" style="text-transform:uppercase;letter-spacing:.1em;color:var(--faint)">Ma disponibilité</b>
   <div class="seg" role="radiogroup" aria-label="Disponibilité">${['disponible','hors_service'].map(k=>`<button role="radio" aria-checked="${l.statut===k}" class="${l.statut===k?'on':''}" data-av="${k}">${LST[k].l}</button>`).join('')}</div>
   <p class="small muted" style="margin:0">${l.statut==='disponible'?'L\'agence peut vous attribuer de nouveaux colis.':'Aucun nouveau colis ne vous sera attribué. Vos colis en cours restent dans vos missions.'}</p></div>
  <div class="mcard"><dl class="kv small"><dt>Téléphone</dt><dd class="num">${esc(l.tel)}</dd><dt>Véhicule</dt><dd>${esc(l.vehicule)}</dd><dt>Plaque</dt><dd><span class="plate">${esc(l.plaque)}</span></dd><dt>Zone principale</dt><dd>${esc(l.zone||'—')}</dd><dt>Capacité</dt><dd>${charge(l)} / ${capOf(l)} colis actifs (${vehicleKind(l.vehicule)})</dd>${l.note?`<dt>Note clients</dt><dd>${String(l.note).replace('.',',')} / 5</dd>`:''}${l.depuis?`<dt>Livreur depuis</dt><dd>${esc(l.depuis)}</dd>`:''}</dl></div>
  ${gpsCardHtml(l,true)}
  <button class="bigbtn" id="dvLogout">${ic('x',18)}${isDriver()?'Se déconnecter':'Quitter l\'aperçu'}</button>`}

/* ---------- Feuilles d'action ---------- */
function drvSheetHtml(){
 const c=CO(drvSheet.code);if(!c)return'';const k=drvSheet.k;
 if(k==='avail'){const l=me();return`<div class="drv-sheet-bg" data-close></div><div class="drv-sheet"><span class="grab"></span><h3>Ma disponibilité</h3><div class="seg">${['disponible','hors_service'].map(x=>`<button class="${l.statut===x?'on':''}" data-av="${x}">${LST[x].l}</button>`).join('')}</div><button class="bigbtn" data-close>Fermer</button></div>`}
 if(k==='confirm')return`<div class="drv-sheet-bg" data-close></div><div class="drv-sheet" role="dialog" aria-label="Confirmer la livraison"><span class="grab"></span>
  <h3>Confirmer la livraison</h3><p class="small muted" style="margin:0">${c.code} · ${esc(c.dest.nom)}. Demandez le code à 4 chiffres reçu par le client sur WhatsApp.</p>
  <input class="input otp-in" id="dsOtp" inputmode="numeric" maxlength="4" placeholder="••••" aria-label="Code de livraison" autocomplete="one-time-code">
  <p class="small faint" style="margin:-4px 0 0;text-align:center">Code pour la démo : <b class="mono">${c.otp}</b></p>
  ${HAS.cod&&c.cod?`<label class="row" style="gap:10px;font-weight:600;font-size:14px;padding:10px 12px;background:var(--gold-soft);border-radius:10px;color:var(--gold-ink)"><input type="checkbox" id="dsCash" style="width:20px;height:20px;accent-color:var(--brand)"> J'ai encaissé ${fcfa(c.cod)}</label>`:''}
  <div class="field"><label>Photo de preuve (facultative)</label>${drvPhoto?`<div class="photo-prev"><img src="${drvPhoto}" alt="Aperçu de la photo de preuve"><button type="button" id="dsPhotoDel">Retirer</button></div>`:`<label class="photo-drop" for="dsPhoto">${ic('eye',20)}<span>Prendre ou choisir une photo<br><small class="faint" style="font-weight:500">Colis remis, portail, signature…</small></span><input type="file" id="dsPhoto" accept="image/*" capture="environment" aria-label="Ajouter une photo de preuve"></label>`}</div>
  <div class="errbox" id="dsErr" hidden></div>
  <button class="bigbtn pri" id="dsOk">${ic('check',18)}Valider la livraison</button><button class="bigbtn" data-close>Retour</button></div>`;
 // report / annulation
 const t=drvSheet.type||'reporte';const mot=t==='reporte'?MOTIFS_REP:t==='echec'?MOTIFS:MOTIFS_ANN;
 return`<div class="drv-sheet-bg" data-close></div><div class="drv-sheet" role="dialog" aria-label="Reporter ou annuler"><span class="grab"></span>
  <h3>Signaler un problème</h3><p class="small muted" style="margin:0">${c.code} · ${esc(c.dest.nom)}</p>
  <div class="seg"><button class="${t==='reporte'?'on':''}" data-itype="reporte">Reporter</button><button class="${t==='echec'?'on':''}" data-itype="echec">Échec</button><button class="${t==='annule'?'on':''}" data-itype="annule">Annuler</button></div>
  <p class="small muted" style="margin:0">${t==='reporte'?'Une nouvelle date de livraison est fixée.':t==='echec'?'La livraison n\'a pas pu se faire. L\'agence fixera une nouvelle date.':'Le colis ne sera pas livré.'}</p>
  <div class="field"><label for="dsMotif">Motif *</label><select class="select" id="dsMotif" style="min-height:46px"><option value="">Choisir un motif…</option>${mot.map(m=>`<option ${drvSheet.motif===m?'selected':''}>${m}</option>`).join('')}<option value="autre" ${drvSheet.motif==='autre'?'selected':''}>Autre motif…</option></select></div>
  <div class="field" id="dsAutreF" ${drvSheet.motif==='autre'?'':'hidden'}><label for="dsAutre">Précisez le motif *</label><textarea class="input" id="dsAutre" maxlength="160" placeholder="Ex. Le client est à l'hôpital, rappeler lundi">${esc(drvSheet.autre||'')}</textarea></div>
  ${t==='echec'?'':t==='reporte'?`<div class="field"><label for="dsCren">Nouveau créneau proposé</label><select class="select" id="dsCren" style="min-height:46px">${CRENEAUX.map(x=>`<option>${x}</option>`).join('')}</select></div>`:`<div class="banner" style="background:var(--bad-soft);color:var(--bad)">${ic('alert',16)}<span>Le colis sera retiré de vos missions et l'expéditeur prévenu.</span></div>`}
  <div class="errbox" id="dsErr" hidden></div>
  <button class="bigbtn ${t==='annule'?'warn':'pri'}" id="dsIssue">${t==='reporte'?'Enregistrer le report':t==='echec'?'Enregistrer l\'échec':'Confirmer l\'annulation'}</button><button class="bigbtn" data-close>Retour</button></div>`}

/* ---------- Actions ---------- */
function drvAct(fn){if(drvBusy)return;drvBusy=true;try{fn()}finally{drvBusy=false}}
const gpsOpts=()=>GPS.last?{lat:GPS.last.coords.latitude,lng:GPS.last.coords.longitude}:{};
function drvPick(code){drvAct(()=>{const c=myColis(code);if(!c)return;if(c.statut!=='attribue'){R.livreur();return}const l=me();setStatus(c,'recupere',null,l.nom,gpsOpts());toast(`${c.code} : colis récupéré`);waToast(c,'recupere');R.livreur()})}
function drvStart(code){drvAct(()=>{const c=myColis(code);if(!c)return;if(c.statut!=='recupere'){R.livreur();return}const l=me();setStatus(c,'en_cours',null,l.nom,gpsOpts());toast(`${c.code} : livraison commencée`);waToast(c,'en_cours');R.livreur()})}
function drvConfirm(){drvAct(()=>{
 const c=myColis(drvSheet.code);if(!c)return;const er=$('#dsErr');const l=me();
 if(c.statut!=='en_cours'){drvSheet=null;R.livreur();return}
 const fail=m=>{er.hidden=false;er.innerHTML=ic('alert',16)+`<span>${m}</span>`};
 if($('#dsOtp').value.trim()!==c.otp)return fail('Code de livraison incorrect. Vérifiez avec le client.');
 if(HAS.cod&&c.cod&&!$('#dsCash').checked)return fail(`Confirmez l'encaissement de ${fcfa(c.cod)}.`);
 if(drvPhoto)c.preuve={img:drvPhoto,t:Date.now(),by:l.nom};
 setStatus(c,'livre',null,l.nom,gpsOpts());
 const kept=storageOK();
 drvSheet=null;drvPhoto=null;drvDetail=null;toast(`${c.code} livré${c.preuve?' · photo enregistrée':''}`);waToast(c,'livre');
 if(c.preuve&&!kept)toast('Stockage local plein : la photo reste visible jusqu\'à la fermeture de la page','warn');
 R.livreur()})}
function drvIssue(){drvAct(()=>{
 const c=myColis(drvSheet.code);if(!c)return;const er=$('#dsErr');const l=me();const t=drvSheet.type||'reporte';
 if(!ACTIVE.includes(c.statut)){drvSheet=null;R.livreur();return}
 const sel=$('#dsMotif').value;const autre=($('#dsAutre')?.value||'').trim();
 const fail=(m,id)=>{er.hidden=false;er.innerHTML=ic('alert',16)+`<span>${m}</span>`;const f=$('#'+id);if(f){f.classList.add('invalid');f.focus()}};
 if(!sel)return fail('Le motif est obligatoire.','dsMotif');
 if(sel==='autre'&&autre.length<5)return fail('Précisez le motif (5 caractères minimum).','dsAutre');
 const motif=sel==='autre'?autre:sel;
 if(t==='reporte')setStatus(c,'reporte',motif,l.nom,{creneau:$('#dsCren').value,...gpsOpts()});else setStatus(c,t,motif,l.nom,gpsOpts());
 drvSheet=null;drvDetail=null;toast(`${c.code} ${t==='reporte'?'reporté':t==='echec'?'en échec':'annulé'} · motif enregistré`);waToast(c,t);R.livreur()})}
function drvSetAvail(v){const l=me();if(!l||!LST[v]||l.statut===v){drvSheet=null;R.livreur();return}const old=l.statut;l.statut=v;log('livreur','',`${l.nom} : ${LST[old].l} → ${LST[v].l} (depuis l'espace livreur)`,l.nom);save();remote('duty',l);drvSheet=null;toast(`Vous êtes maintenant « ${LST[v].l} »${v==='hors_service'?' · partage de position arrêté':''}`);R.livreur()}

function drvBind(){
 const root=$('#drv');const q=sel=>root.querySelectorAll(sel);
 const adm=()=>go('tableau');['#dvAdmin'].forEach(id=>{const b=root.querySelector(id);if(b)b.onclick=adm});
 q('[data-pick]').forEach(b=>b.onclick=()=>{b.disabled=true;drvPick(b.dataset.pick)});
 const gc=root.querySelector('#gpsOk');if(gc)gc.onclick=()=>{const l=me();l.consentAt=Date.now();log('livreur','',`${l.nom} a accepté le partage de sa position`,l.nom);save();remote('consent',l);toast('Merci : votre position sera partagée pendant vos heures de service');R.livreur()};
 const gw=root.querySelector('#gpsOff');if(gw)gw.onclick=()=>{const l=me();l.consentAt=null;gpsStop();log('livreur','',`${l.nom} a retiré son accord de partage de position`,l.nom);save();remote('consent',l);toast('Partage de position désactivé');R.livreur()};
 const gn=root.querySelector('#gpsNow');if(gn)gn.onclick=()=>{GPS.lastSent=0;if(GPS.last)gpsSend();else toast('Position en cours d\'acquisition…')};
 const bk=root.querySelector('#dvBack');if(bk)bk.onclick=()=>{drvDetail=null;R.livreur()};
 q('[data-dtab]').forEach(b=>b.onclick=()=>{drvTab=b.dataset.dtab;drvDetail=null;drvSheet=null;R.livreur();root.querySelector('.drv-body').scrollTop=0});
 q('[data-detail]').forEach(b=>b.onclick=()=>{drvDetail=b.dataset.detail;R.livreur();root.querySelector('.drv-body').scrollTop=0});
 q('[data-start]').forEach(b=>b.onclick=()=>{b.disabled=true;drvStart(b.dataset.start)});
 q('[data-confirm]').forEach(b=>b.onclick=()=>{if(!myColis(b.dataset.confirm))return;drvSheet={k:'confirm',code:b.dataset.confirm};drvPhoto=null;R.livreur()});
 q('[data-issue]').forEach(b=>b.onclick=()=>{if(!myColis(b.dataset.issue))return;drvSheet={k:'issue',code:b.dataset.issue,type:'reporte'};R.livreur()});
 q('[data-hf]').forEach(b=>b.onclick=()=>{drvHistF=b.dataset.hf;R.livreur()});
 q('[data-av]').forEach(b=>b.onclick=()=>drvSetAvail(b.dataset.av));
 q('[data-copy]').forEach(b=>b.onclick=()=>{const v=b.dataset.copy;navigator.clipboard?.writeText(v).then(()=>toast('Numéro copié'),()=>toast('Sélectionnez le numéro pour le copier','warn'))});
 const av0=root.querySelector('#dvAvail');if(av0)av0.onclick=()=>{drvSheet={k:'avail',code:(mine()[0]||S.colis[0]).code};R.livreur()};
 const ga=root.querySelector('#dvGoAvail');if(ga)ga.onclick=()=>drvSetAvail('disponible');
 const lo=root.querySelector('#dvLogout');if(lo)lo.onclick=()=>drvLogout(false);
 q('[data-close]').forEach(b=>b.onclick=()=>{drvSheet=null;drvPhoto=null;R.livreur()});
 if(!drvSheet)return;
 const ok=root.querySelector('#dsOk');if(ok){ok.onclick=drvConfirm;const o=$('#dsOtp');o.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();drvConfirm()}});}
 const ph=root.querySelector('#dsPhoto');if(ph)ph.onchange=async()=>{const f=ph.files[0];const er=$('#dsErr');const otp=$('#dsOtp')?.value||'',cash=$('#dsCash')?.checked;
  try{drvPhoto=await compressImage(f);R.livreur();if($('#dsOtp'))$('#dsOtp').value=otp;if($('#dsCash'))$('#dsCash').checked=!!cash}
  catch(e){er.hidden=false;er.innerHTML=ic('alert',16)+`<span>${esc(e.message)}</span>`}};
 const pd=root.querySelector('#dsPhotoDel');if(pd)pd.onclick=()=>{const otp=$('#dsOtp')?.value||'',cash=$('#dsCash')?.checked;drvPhoto=null;R.livreur();if($('#dsOtp'))$('#dsOtp').value=otp;if($('#dsCash'))$('#dsCash').checked=!!cash};
 q('[data-itype]').forEach(b=>b.onclick=()=>{drvSheet.type=b.dataset.itype;drvSheet.motif='';drvSheet.autre='';R.livreur()});
 const ms=root.querySelector('#dsMotif');if(ms)ms.onchange=()=>{drvSheet.motif=ms.value;$('#dsAutreF').hidden=ms.value!=='autre';ms.classList.remove('invalid');if(ms.value==='autre')$('#dsAutre').focus()};
 const au=root.querySelector('#dsAutre');if(au)au.oninput=()=>{drvSheet.autre=au.value;au.classList.remove('invalid')};
 const is=root.querySelector('#dsIssue');if(is)is.onclick=drvIssue;
}

/* ---------- Partage de la position GPS du livreur ----------
   Uniquement : livreur connecté, « En service », après son accord (drivers.consent_at).
   La position est lue en continu par le téléphone et envoyée au plus toutes les 2 minutes (driver_locations). */
const GPS_MS=CFG.gpsIntervalMs||120000;
const GPS={watch:null,timer:null,last:null,lastSent:0,sentAt:null,err:'',far:false};
const gpsWanted=()=>{const l=me();return!!(l&&isDriver()&&onDuty(l)&&l.consentAt)};
function gpsStart(){
 if(GPS.watch!=null)return;
 if(!('geolocation' in navigator)){GPS.err='Ce téléphone ne permet pas la localisation';return}
 GPS.watch=navigator.geolocation.watchPosition(p=>{GPS.last=p;GPS.err='';if(Date.now()-GPS.lastSent>=GPS_MS)gpsSend()},
  e=>{GPS.err=e.code===1?'Localisation refusée : autorisez-la dans les réglages du navigateur':'Position introuvable pour le moment';gpsPaint()},
  {enableHighAccuracy:true,maximumAge:30000,timeout:45000});
 GPS.timer=setInterval(()=>{if(GPS.last&&Date.now()-GPS.lastSent>=GPS_MS-1000)gpsSend()},15000);
}
function gpsStop(){if(GPS.watch!=null&&navigator.geolocation)navigator.geolocation.clearWatch(GPS.watch);GPS.watch=null;clearInterval(GPS.timer);GPS.timer=null;Object.assign(GPS,{last:null,lastSent:0,sentAt:null,err:'',far:false})}
async function gpsSend(){
 const l=me();if(!l||!GPS.last||!gpsWanted())return;GPS.lastSent=Date.now();
 const c=GPS.last.coords;let bat={};try{const b=navigator.getBattery?await navigator.getBattery():null;if(b)bat={level:Math.round(b.level*100),charging:b.charging}}catch(e){}
 const fix={lat:c.latitude,lng:c.longitude,accuracy:Number.isFinite(c.accuracy)?Math.round(c.accuracy):null,speed:Number.isFinite(c.speed)?c.speed:null,heading:Number.isFinite(c.heading)?c.heading:null,battery_level:bat.level??null,is_charging:bat.charging??null,recorded_at:new Date(GPS.last.timestamp||Date.now()).toISOString()};
 const p=toXY(fix.lat,fix.lng);GPS.far=km(dist(p,HQ))>60;
 if(!GPS.far||MODE==='supabase'){l.pos=p;l.posAt=Date.now()}
 GPS.sentAt=Date.now();remote('location',l,fix);if(MODE==='demo')save();gpsPaint();
}
function gpsCardHtml(l,full){
 if(!l||!isDriver()&&!full)return'';
 if(!l.consentAt)return`<div class="mcard" style="border-color:var(--gold)"><b>Partage de votre position</b><p class="small muted" style="margin:0">Pendant vos heures de service, FAST EXPRESS enregistre votre position toutes les 2 minutes pour organiser les livraisons et informer les clients de votre arrivée. Rien n'est enregistré hors service.</p><button class="bigbtn gold" id="gpsOk">J'accepte le partage de ma position</button></div>`;
 return`<div class="mcard" id="gpsCard">${gpsStatusHtml(l)}${full?`<button class="btn sm ghost" id="gpsOff" style="align-self:flex-start">Retirer mon accord</button>`:''}</div>`}
function gpsStatusHtml(l){
 const on=gpsWanted()&&GPS.watch!=null;
 const txt=!isDriver()?'Aperçu : le partage de position fonctionne sur le téléphone du livreur.':!onDuty(l)?'Hors service : position non partagée.':GPS.err?GPS.err:GPS.sentAt?`Position envoyée à ${hm(GPS.sentAt)}${GPS.last?.coords?.accuracy?` · précision ${Math.round(GPS.last.coords.accuracy)} m`:''}${GPS.far&&MODE==='demo'?' · hors de Libreville (non affichée sur la carte de démo)':''}`:'Recherche de votre position…';
 return`<div class="row between" style="gap:10px"><span class="row" style="gap:8px"><i style="width:9px;height:9px;border-radius:50%;background:${on&&!GPS.err?'var(--ok)':'var(--faint)'}"></i><b class="small">Partage de position ${on&&!GPS.err?'actif':'inactif'}</b></span>${on?`<button class="btn sm" id="gpsNow">Envoyer maintenant</button>`:''}</div><p class="small muted" style="margin:0">${esc(txt)} · toutes les ${Math.round(GPS_MS/60000)} min</p>`}
function gpsPaint(){const el=document.getElementById('gpsCard');const l=me();if(el&&l){el.innerHTML=gpsStatusHtml(l);const gn=el.querySelector('#gpsNow');if(gn)gn.onclick=()=>{GPS.lastSent=0;if(GPS.last)gpsSend()}}}

/* ---------- Suivi public ---------- */
let pubCode='',pubErr='',pubRemote=null;
const pubFind=v=>{v=String(v||'').trim();return CO(v)||S.colis.find(c=>c.token===v)||null};
R.suivi=()=>{
 const q0=new URLSearchParams(location.search).get('suivi');
 if(q0&&!pubCode&&!pubErr&&!pubRemote){const f=pubFind(q0);if(f)pubCode=f.code;else if(MODE==='supabase'&&!AUTH)return suiviRemote(q0);else pubErr=q0}
 if(MODE==='supabase'&&!AUTH&&!pubRemote)return suiviRemote(null);
 const c=pubCode?CO(pubCode):pubRemote;
 const ex=MODE!=='demo'?[]:[S.colis.find(x=>x.statut==='en_cours'),S.colis.find(x=>x.statut==='livre'&&isToday(x.createdAt)),S.colis.find(x=>x.statut==='attribue'),S.colis.find(x=>x.statut==='echec')].filter(Boolean);
 const L=c?LV(c.livreurId):null;
 const head=c?{en_attente:['Votre colis est enregistré','Il sera confié à un livreur très prochainement.'],attribue:['Un livreur prépare votre livraison','Votre colis sera récupéré à l\'agence puis livré.'],recupere:['Votre colis a été récupéré','Le livreur a votre colis et partira bientôt vers vous.'],en_cours:['Votre colis est en route','Le livreur se dirige vers '+zoneLabel(c)+'. Gardez votre téléphone à portée de main.'],livre:['Colis livré','Remis le '+new Date(c.hist.at(-1).t).toLocaleDateString('fr-FR',{day:'numeric',month:'long'})+' à '+hm(c.hist.at(-1).t)+'.'],echec:['Livraison non aboutie','Motif : '+c.motif+'. Notre équipe vous recontacte pour un nouveau créneau.'],annule:['Envoi annulé',(c.motif?'Motif : '+c.motif+'. ':'')+'Contactez l\'expéditeur pour plus d\'informations.'],reporte:['Livraison reportée','Motif : '+c.motif+'. Nouveau créneau : '+(c.report?.creneau||'à convenir')+'.']}[c.statut]:null;
 $('#view').innerHTML=`
 <div class="pub">
  <div class="pub-hero"><span class="stripe"><i></i><i></i><i></i></span>
   <div class="row" style="gap:14px">${logoHtml(76)}<div><b style="font-family:var(--f-display);letter-spacing:.05em;font-size:17px;display:block">FAST EXPRESS</b><span class="small" style="color:var(--rail-muted)">Suivi de colis · Libreville</span></div><span class="small hide-sm" style="color:var(--rail-muted);margin-left:auto">fastexpress.ga/suivi</span></div>
   <h2>Où est mon colis ?</h2><p>Saisissez le numéro de suivi reçu par WhatsApp ou SMS. Il commence par FE-26.</p>
   <form class="pub-form" id="pF"><input id="pIn" value="${esc(pubCode)}" placeholder="FE-26-18421" aria-label="Numéro de suivi" autocomplete="off"><button class="btn gold" type="button" id="pGo">${ic('search',16)}Suivre</button></form>
   <div class="pub-ex">Exemples :${ex.map(x=>`<button data-ex="${x.code}">${x.code}</button>`).join('')}</div>
  </div>
  ${pubErr?`<div class="card"><div class="empty">${ic('alert',28)}<b style="color:var(--fg)">Aucun colis ne correspond à « ${esc(pubErr)} ».</b><br>Vérifiez le numéro (format FE-26-12345) ou contactez l'agence au +241 011 44 20 20.</div></div>`:''}
  ${c?`<div class="pub-res">
   <div class="card"><div class="card-b stack" style="gap:16px"><div class="row between wrap"><span class="mono muted">${c.code}</span>${badge(c.statut)}</div><div><div class="big-st">${head[0]}</div><p class="muted" style="margin:6px 0 0">${esc(head[1])}</p></div>${stepsHtml(c)}
    <dl class="kv"><dt>Destinataire</dt><dd>${esc(first(c.dest.nom))} ${esc(c.dest.nom.split(' ').slice(1).join(' ')[0]||'')}.</dd><dt>Quartier</dt><dd>${esc(zoneLabel(c))}</dd><dt>Expéditeur</dt><dd>${esc(c.exp.nom)}</dd>${L&&ACTIVE.includes(c.statut)?`<dt>Livreur</dt><dd>${esc(first(L.nom))} · ${esc(L.vehicule.split(' ')[0])}</dd>`:''}${HAS.cod&&c.cod&&c.statut!=='livre'?`<dt>À régler</dt><dd><b>${fcfa(c.cod)}</b> en espèces ou Mobile Money</dd>`:''}</dl>
    ${c.statut==='en_cours'?`<div class="quote"><span class="small"><b style="font-size:13px;color:var(--fg);font-family:var(--f-body)">Arrivée estimée</b><br><span class="muted">Selon la circulation à Libreville</span></span><b class="num">${hm(c.hist.at(-1).t+35*MIN)} – ${hm(c.hist.at(-1).t+65*MIN)}</b></div>`:''}
   </div></div>
   <div class="card"><div class="card-h"><h2>Étapes</h2></div><div class="card-b">${tlHtml(c,true)}</div></div>
  </div>`:!pubErr?`<div class="card"><div class="empty">${ic('box',28)}Entrez un numéro de suivi ou choisissez un exemple ci-dessus.</div></div>`:''}
 </div>`;
 bindForm($('#pF'),$('#pGo'),()=>{const v=$('#pIn').value.trim();if(!v)return;const f=pubFind(v)||pubFind(v.toUpperCase());if(f){pubCode=f.code;pubErr=''}else{pubCode='';pubErr=v}R.suivi()});
 document.querySelectorAll('[data-ex]').forEach(b=>b.onclick=()=>{pubCode=b.dataset.ex;pubErr='';R.suivi()});
};

/* Suivi public en mode Supabase sans connexion : uniquement par une fonction serveur sécurisée (jamais d'accès direct aux tables) */
async function suiviRemote(token){
 const v=$('#view');
 const shell=inner=>`<div class="pub"><div class="pub-hero"><span class="stripe"><i></i><i></i><i></i></span><div class="row" style="gap:14px">${logoHtml(76)}<div><b style="font-family:var(--f-display);letter-spacing:.05em;font-size:17px;display:block">FAST EXPRESS</b><span class="small" style="color:var(--rail-muted)">Suivi de colis · Libreville</span></div></div><h2>Où est mon colis ?</h2><p>Ouvrez le lien de suivi reçu par WhatsApp ou SMS.</p></div>${inner}</div>`;
 if(!CFG.trackingRpc){v.innerHTML=shell(`<div class="card"><div class="empty">${ic('clock',28)}<b style="color:var(--fg)">Le suivi public sera activé prochainement.</b><br>Il passera par une fonction sécurisée de Supabase, qui ne montre que les informations utiles au client.</div></div>`);return}
 if(!token){v.innerHTML=shell(`<div class="card"><div class="empty">${ic('box',28)}Utilisez le lien de suivi reçu avec votre colis.</div></div>`);return}
 v.innerHTML=shell(`<div class="card"><div class="empty">Recherche de votre colis…</div></div>`);
 try{const c=await window.FEDB.track(token);if(!c){v.innerHTML=shell(`<div class="card"><div class="empty">${ic('alert',28)}Ce lien de suivi n'est pas valide.</div></div>`);return}
  pubRemote=c;pubCode='';pubErr='';R.suivi()}catch(e){v.innerHTML=shell(`<div class="card"><div class="empty">${ic('alert',28)}Suivi momentanément indisponible.</div></div>`)}
}

/* =========================================================
   Espace partenaire : tableau de bord
   ========================================================= */
R.partenaire=()=>{
 const P=PA(AUTH.partnerId);const mine=S.colis.filter(c=>c.partnerId===AUTH.partnerId);const t0=sod(Date.now());
 const w7=mine.filter(c=>c.createdAt>=t0-6*D);const done=w7.filter(c=>['livre','echec'].includes(c.statut));const ok=w7.filter(c=>c.statut==='livre');
 const act=mine.filter(c=>['en_attente',...ACTIVE].includes(c.statut));
 const cash=HAS.cod?mine.filter(c=>c.statut==='livre'&&lastT(c)>=t0-6*D).reduce((a,c)=>a+c.cod,0):0;
 $('#view').innerHTML=`
 <div class="kpis" style="grid-template-columns:repeat(4,minmax(0,1fr))">
  <div class="card kpi hero"><span class="l">${ic('box',15)}Colis en cours</span><span class="v">${act.length}</span><span class="d">${act.filter(c=>c.statut==='en_cours').length} sur la route</span></div>
  <div class="card kpi"><span class="l">${ic('check',15)}Livrés sur 7 jours</span><span class="v">${ok.length}</span><span class="d">${w7.length} colis confiés</span></div>
  <div class="card kpi"><span class="l">${ic('gauge',15)}Taux de réussite</span><span class="v">${done.length?Math.round(ok.length/done.length*100):'–'}<small> %</small></span><span class="d">Sur 7 jours</span></div>
  <div class="card kpi"><span class="l">${ic('cash',15)}${HAS.cod?'Encaissé pour vous':'Colis reportés'}</span><span class="v">${HAS.cod?NF.format(Math.round(cash/1000))+'<small> k FCFA</small>':w7.filter(c=>c.statut==='reporte').length}</span><span class="d">${HAS.cod?'Paiements à la livraison, 7 jours':'Sur 7 jours'}</span></div>
 </div>
 <div class="card"><div class="card-h"><div><h2>Vos colis en cours</h2><p>${esc(P?.company_name||'')} · suivi en temps réel</p></div><button class="btn pri" id="pNew">${ic('plus',16)}Nouveau colis</button></div>
  <div class="tbl-wrap"><table><thead><tr><th>N° de suivi</th><th>Destinataire</th><th>Quartier</th><th>Statut</th><th>Dernière étape</th></tr></thead>
  <tbody>${act.map(c=>`<tr data-c="${c.code}"><td class="mono" style="font-weight:600">${c.code}</td><td>${esc(c.dest.nom)}<span class="sub num">${esc(c.dest.tel)}</span></td><td>${esc(zoneLabel(c))}</td><td>${badge(c.statut)}</td><td class="small muted">${ago(lastT(c))}</td></tr>`).join('')}</tbody></table>
  ${act.length?'':`<div class="empty">${ic('box',26)}Aucun colis en cours. Créez un envoi avec « Nouveau colis ».</div>`}</div></div>
 <div class="card"><div class="card-h"><div><h2>Dernières livraisons</h2><p>Les 8 derniers colis terminés</p></div></div><div class="card-b" style="padding-top:6px">${mine.filter(c=>!['en_attente',...ACTIVE].includes(c.statut)).sort((a,b)=>lastT(b)-lastT(a)).slice(0,8).map(c=>`<div class="todo"><button class="lnk" data-open="${c.code}">${c.code}</button><span class="small" style="flex:1;min-width:0">${esc(c.dest.nom)} · ${esc(zoneLabel(c))}</span>${badge(c.statut)}</div>`).join('')||'<p class="small muted" style="margin:0">Pas encore de livraison terminée.</p>'}</div></div>`;
 $('#pNew').onclick=newColisModal;
 document.querySelectorAll('tr[data-c]').forEach(r=>r.onclick=()=>openColis(r.dataset.c));bindOpen();
};

/* =========================================================
   Connexion (Supabase Auth, ou comptes de démonstration)
   ========================================================= */
const SKEY='fastexpress-app-session';
let loginErr='',loginBusy=false;
function authFromUser(u){const a={userId:u.id,role:u.role,name:u.full_name,phone:u.phone,email:u.email};
 if(u.role==='driver')a.driverId=S.livreurs.find(l=>l.profileId===u.id)?.id;
 if(u.role==='partner')a.partnerId=S.partners.find(p=>p.profileId===u.id)?.id;return a}
function renderLogin(){
 const box=$('#login');const demo=MODE==='demo';
 const grp=(role,t)=>{const us=S.users.filter(u=>u.role===role);return us.length?`<div class="acc-g">${t}</div>${us.map(u=>`<button class="acc" type="button" data-u="${esc(u.email)}"><span class="av" style="background:${role==='manager'?'#0e8a65':role==='driver'?(S.livreurs.find(l=>l.profileId===u.id)?.couleur||'#1d5ea8'):'#b5651d'};width:30px;height:30px;font-size:11px">${initials(u.full_name)}</span><span style="flex:1;min-width:0"><b style="display:block;font-size:13.5px">${esc(role==='partner'?(S.partners.find(p=>p.profileId===u.id)?.company_name||u.full_name):u.full_name)}</b><span class="mono">${esc(u.email)}</span></span></button>`).join('')}`:''};
 box.innerHTML=`<div class="login-card">
  <div class="stack" style="align-items:center;gap:10px">${logoHtml(92)}<h1>Connexion</h1><p class="sub">Plateforme de livraison FAST EXPRESS</p><span class="mode-pill ${demo?'':'live'}">${demo?'Mode démonstration':'Connecté à Supabase'}</span></div>
  <form class="stack" id="lgF" novalidate style="gap:12px">
   <div class="field"><label for="lg1">Adresse e-mail</label><input class="input" id="lg1" type="email" autocomplete="username" inputmode="email" placeholder="nom@exemple.ga" style="min-height:46px;font-size:16px"></div>
   <div class="field"><label for="lg2">Mot de passe</label><input class="input" id="lg2" type="password" autocomplete="current-password" style="min-height:46px;font-size:16px"></div>
   ${loginErr?`<div class="errbox">${ic('alert',16)}<span>${esc(loginErr)}</span></div>`:''}
   <button class="bigbtn pri" type="button" id="lgGo" ${loginBusy?'disabled':''}>${loginBusy?'Connexion…':'Se connecter'}</button>
  </form>
  ${demo?`<div class="stack" style="gap:6px"><p class="small muted" style="margin:0">Comptes de démonstration (mot de passe : <b class="mono">${esc(DEMO_PASSWORD)}</b>). Touchez un compte pour remplir le formulaire.</p>${grp('manager','Responsable')}${grp('driver','Livreurs')}${grp('partner','Partenaires')}</div>`:`<p class="small muted" style="margin:0;text-align:center">Votre compte est créé par FAST EXPRESS. Mot de passe oublié : contactez l'agence.</p>`}
  <a class="btn ghost" href="?#suivi" style="align-self:center">${ic('eye',16)}Suivre un colis</a>
 </div>`;
 box.querySelectorAll('[data-u]').forEach(b=>b.onclick=()=>{$('#lg1').value=b.dataset.u;$('#lg2').value=DEMO_PASSWORD;$('#lgGo').focus()});
 bindForm($('#lgF'),$('#lgGo'),doLogin);
}
async function doLogin(){
 if(loginBusy)return;const email=$('#lg1').value.trim(),pass=$('#lg2').value;
 if(!email||!pass){loginErr='Saisissez votre e-mail et votre mot de passe.';renderLogin();return}
 loginBusy=true;loginErr='';renderLogin();$('#lg1').value=email;
 try{
  if(MODE==='supabase'){const r=await window.FEDB.signIn(email,pass);if(r.error)throw new Error(r.error);AUTH=r.auth;await window.FEDB.loadAll();window.FEDB.subscribe(onRemoteChange)}
  else{const u=S.users.find(x=>x.email.toLowerCase()===email.toLowerCase());if(!u||pass!==DEMO_PASSWORD)throw new Error('E-mail ou mot de passe incorrect.');AUTH=authFromUser(u);try{localStorage.setItem(SKEY,u.id)}catch(e){}}
  loginBusy=false;log('livreur','',`${AUTH.name} s'est connecté`,AUTH.name);save();toast(`Bienvenue ${esc(first(AUTH.name))}`);
  location.hash=isDriver()?'livreur':isPartner()?'partenaire':'tableau';route();
 }catch(e){loginBusy=false;loginErr=e.message||'Connexion impossible.';renderLogin();$('#lg1').value=email}
}
async function logout(){
 gpsStop();drvPreview=null;drvId=null;
 if(MODE==='supabase'&&window.FEDB)await window.FEDB.signOut().catch(()=>{});
 try{localStorage.removeItem(SKEY)}catch(e){}
 AUTH=null;closeAll();history.replaceState(null,'',location.pathname);route();toast('Vous êtes déconnecté');
}
/* Changement reçu de Supabase en temps réel : on redessine, sauf si l'utilisateur est en train de saisir */
function onRemoteChange(){
 const ae=document.activeElement;const typing=ae&&/INPUT|TEXTAREA|SELECT/.test(ae.tagName);
 if(modal.classList.contains('on')||drvSheet||typing){renderNav();return}
 if(cur==='carte'){mapDraw();mapInfo();renderNav()}else render();
 if(openCode&&drawer.classList.contains('on'))renderDrawer();
}

/* =========================================================
   Simulation en direct
   ========================================================= */
let simT=null;
function simTick(){
 const r=Math.random();let msg='';
 if(MODE!=='demo')return;
 const enc=S.colis.filter(c=>c.statut==='en_cours'),att=S.colis.filter(c=>c.statut==='attribue'||c.statut==='recupere');
 if(r<.3){const z=ZONES[Math.floor(Math.random()*ZONES.length)].n;const dn=PRE[Math.floor(Math.random()*PRE.length)]+' '+NOM[Math.floor(Math.random()*NOM.length)];const ex=EXP[Math.floor(Math.random()*EXP.length)];
  const P=S.partners[1+Math.floor(Math.random()*(S.partners.length-1))];const zz=ZI[z];const {c}=createColis({partnerId:P.id,point:{x:zz.x+(Math.random()-.5)*10,y:zz.y+(Math.random()-.5)*10},destNom:dn,destTel:`+241 066 ${10+Math.floor(Math.random()*89)} ${10+Math.floor(Math.random()*89)} ${10+Math.floor(Math.random()*89)}`,zone:z,adresse:REPERES[Math.floor(Math.random()*REPERES.length)],type:Math.random()<.2?'express':'standard',poids:Math.round((.5+Math.random()*6)*10)/10,cod:Math.random()<.5?Math.round(5+Math.random()*120)*500:0,who:P.company_name});msg=`Nouveau colis ${c.code} de ${esc(P.company_name)} pour ${esc(z)}`;if(S.settings.autoCreate){const r=smartAssign(c);msg+=r.l?` · attribué à ${esc(first(r.l.nom))}`:' · en attente (aucun livreur disponible)'}}
 else if(r<.62&&enc.length){const c=enc[Math.floor(Math.random()*enc.length)];const L=LV(c.livreurId);if(Math.random()<.9){setStatus(c,'livre',null,L?.nom);msg=`${c.code} livré par ${esc(first(L?.nom||''))}`}else{setStatus(c,'echec',MOTIFS[Math.floor(Math.random()*2)],L?.nom);msg=`Échec de livraison sur ${c.code}`}}
 else if(r<.85&&att.length){const c=att[Math.floor(Math.random()*att.length)];const L=LV(c.livreurId);if(c.statut==='attribue'){setStatus(c,'recupere',null,L?.nom);msg=`${esc(first(L?.nom||''))} a récupéré ${c.code}`}else{setStatus(c,'en_cours',null,L?.nom);msg=`${esc(first(L?.nom||''))} est en route avec ${c.code}`}}
 else{const w=S.colis.filter(c=>c.statut==='en_attente'&&!c.alerte);if(w.length>3){const c=w[w.length-1];const r=smartAssign(c);if(r.l)msg=`${c.code} attribué automatiquement à ${esc(first(r.l.nom))}`}}
 if(cur!=='carte')S.livreurs.forEach(l=>step(l,25));
 if(!msg)return;
 const ae=document.activeElement;const typing=ae&&(ae.tagName==='INPUT'||ae.tagName==='TEXTAREA'||ae.tagName==='SELECT')&&!modal.contains(ae)&&$('#view').contains(ae);
 const busy=modal.classList.contains('on')||(cur==='livreur'&&(drvSheet||drvTyping()))||typing;
 if(!busy){if(cur==='carte'){mapDraw();mapInfo();renderNav()}else render()}else renderNav();
 if(openCode&&drawer.classList.contains('on')&&!$('#drSub')?.innerHTML)renderDrawer();
 toast(msg)}
function setSim(on){if(MODE!=='demo')on=false;S.sim=on;save();$('#simToggle').checked=on;$('#simDot').classList.toggle('off',!on);clearInterval(simT);if(on)simT=setInterval(simTick,16000)}

/* =========================================================
   Démarrage
   ========================================================= */
mountLogos();
$('#burger').innerHTML=ic('menu',22);
$('#gsIc').innerHTML=ic('search',16);
$('#newBtn').innerHTML=ic('plus',16)+'<span class="lbl">Nouveau colis</span>';
$('#resetBtn').innerHTML=ic('refresh',14)+'Réinitialiser la démo';
$('#newBtn').onclick=newColisModal;
$('#burger').onclick=()=>{$('#rail').classList.add('on');$('#scrim').classList.add('on')};
$('#scrim').onclick=()=>{$('#rail').classList.remove('on');$('#scrim').classList.remove('on')};
$('#gsearch').addEventListener('keydown',e=>{if(e.key==='Enter'){const v=e.target.value.trim();if(!v)return;const c=CO(v)||S.colis.find(x=>x.code.endsWith(v)||x.dest.nom.toLowerCase().includes(v.toLowerCase()));if(c){openColis(c.code);e.target.value=''}else toast('Aucun colis trouvé pour « '+esc(v)+' »')}});
let resetArm=false;
$('#resetBtn').onclick=()=>{if(!resetArm){resetArm=true;$('#resetBtn').innerHTML=ic('alert',14)+'Cliquez encore pour confirmer';setTimeout(()=>{resetArm=false;$('#resetBtn').innerHTML=ic('refresh',14)+'Réinitialiser la démo'},3500);return}
 resetArm=false;try{localStorage.removeItem(KEY)}catch(e){}S=seed();save();closeAll();colisF={q:'',s:'tous',z:'',p:'7j'};waSel=null;drvLogout(true);pubCode='';pubErr='';attSel.clear();if(AUTH){const u=S.users.find(x=>x.email===AUTH.email);AUTH=u?authFromUser(u):null;if(!AUTH){try{localStorage.removeItem(SKEY)}catch(e){}}}$('#resetBtn').innerHTML=ic('refresh',14)+'Réinitialiser la démo';setSim(S.sim);render();toast('Données de démonstration réinitialisées')};
$('#simToggle').onchange=e=>{setSim(e.target.checked);toast(e.target.checked?'Activité en direct activée : un événement toutes les 16 s':'Activité en direct en pause')};
window.addEventListener('hashchange',route);
/* Si l'administration et l'espace livreur sont ouverts dans deux onglets, chaque onglet se met à jour */
window.addEventListener('storage',e=>{
 if(MODE!=='demo'||e.key!==KEY||!e.newValue)return;
 try{const o=JSON.parse(e.newValue);if(o&&o.colis){S=migrate(o);if(drvSheet||modal.classList.contains('on'))return;render();if(openCode&&drawer.classList.contains('on'))renderDrawer()}}catch(x){}
});
/* Démarrage : mode démo (données locales) ou mode Supabase (session existante restaurée) */
async function boot(){
 if(MODE==='supabase'){
  S={v:3,settings:{autoCreate:true},colis:[],livreurs:[],partners:[],users:[],log:[],wa:{},tpl:JSON.parse(JSON.stringify(DEF_TPL)),seq:0,sim:false,read:{}};
  if(!window.FEDB||!window.FEDB.configured()){$('#login').hidden=false;$('#login').innerHTML=`<div class="login-card"><div class="stack" style="align-items:center;gap:10px">${logoHtml(80)}<h1>Configuration incomplète</h1><p class="sub">Le mode Supabase est activé dans <b>js/config.js</b>, mais l'adresse du projet ou la clé publique « anon » est vide (ou la bibliothèque Supabase n'a pas pu se charger).</p></div></div>`;return}
  try{const a=await window.FEDB.restore();if(a){AUTH=a;await window.FEDB.loadAll();window.FEDB.subscribe(onRemoteChange)}}catch(e){console.error(e);toast('Connexion à Supabase impossible : '+esc(e.message||''),'warn')}
 }else{
  S=load()||seed();save();
  try{const id=localStorage.getItem(SKEY);const u=id&&S.users.find(x=>x.id===id);if(u)AUTH=authFromUser(u)}catch(e){}
 }
 setSim(MODE==='demo'&&S.sim!==false);
 route();
}
boot();
