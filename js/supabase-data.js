/* =====================================================================
   FAST EXPRESS — accès aux données Supabase
   ---------------------------------------------------------------------
   Utilise UNIQUEMENT les tables et colonnes existantes du projet :
     profiles(id, full_name, phone, role)
     partners(id, company_name, contact_name, contact_phone, profile_id)
     drivers(id, profile_id, vehicle_type, vehicle_plate, zone, is_on_duty, consent_at)
     driver_locations(driver_id, lat, lng, accuracy, speed, heading,
                      battery_level, is_charging, recorded_at, created_at)
     parcels(id, tracking_number, tracking_token, confirmation_code,
             client_name, client_phone, delivery_address, status, driver_id,
             partner_id, delivery_lat, delivery_lng,
             proof_photo_url, postponed_date [+ colonnes facultatives])
     parcel_events(parcel_id, status, reason, author_id, author_role, lat, lng)
   Aucune table n'est créée, modifiée ou supprimée. Les droits d'accès
   sont ceux des règles RLS du projet (clé publique « anon » uniquement).
   ===================================================================== */
(function () {
  'use strict';
  const CFG = window.FE_CONFIG || {};
  const PC = (CFG.optionalColumns && CFG.optionalColumns.parcels) || {};
  const EC = (CFG.optionalColumns && CFG.optionalColumns.parcelEvents) || {};
  const EVT_CREATED = EC.createdAt || 'created_at';
  const PTC = (CFG.optionalColumns && CFG.optionalColumns.partners) || {};
  const P_ADDR_COL = PTC.address || null; // colonne d'adresse du partenaire, seulement si elle existe (voir 07)

  /* Colonnes lues et écrites (noms réels) */
  const COLS = {
    profiles: ['id', 'full_name', 'phone', 'role', 'is_active'],
    partners: ['id', 'company_name', 'contact_name', 'contact_phone', 'profile_id'].concat(P_ADDR_COL ? [P_ADDR_COL] : []),
    drivers: ['id', 'profile_id', 'vehicle_type', 'vehicle_plate', 'zone', 'is_on_duty', 'consent_at'],
    driver_locations: ['driver_id', 'lat', 'lng', 'accuracy', 'speed', 'heading', 'battery_level', 'is_charging', 'recorded_at', 'created_at'],
    parcels: ['id', 'tracking_number', 'tracking_token', 'confirmation_code', 'client_name', 'client_phone',
      'delivery_address', 'status', 'driver_id', 'partner_id', 'delivery_lat', 'delivery_lng',
      'proof_photo_url', 'postponed_date'].concat(
      ['createdAt', 'deliveredAt', 'postponedReason', 'cancellationReason', 'codAmount', 'deliveryFee', 'parcelType', 'weight'].map((k) => PC[k]).filter(Boolean)),
    parcel_events: ['parcel_id', 'status', 'reason', 'author_id', 'author_role', 'lat', 'lng', EVT_CREATED],
  };

  let sb = null;
  let me = null;          // utilisateur connecté (rôle, identifiants)
  let channel = null;     // abonnement temps réel
  const queues = {};      // opérations d'un même colis exécutées dans l'ordre
  const names = {};       // profile_id → nom (pour l'historique)

  const configured = () => !!(window.supabase && CFG.supabaseUrl && CFG.supabaseAnonKey);
  const client = () => sb || (sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true },
  }));
  function check(res, ctx) {
    if (res.error) { const e = new Error((ctx ? ctx + ' : ' : '') + res.error.message); e.details = res.error; throw e; }
    return res.data;
  }
  const frError = (m) => /invalid login/i.test(m) ? 'E-mail ou mot de passe incorrect.'
    : /email not confirmed/i.test(m) ? 'Adresse e-mail non confirmée.' : m;
  const ts = (v) => (v ? Date.parse(v) : null);

  /* ---------- Statuts : base ⇄ interface ---------- */
  function appStatus(row) {
    switch (row.status) {
      case 'pending': return row.driver_id ? 'attribue' : 'en_attente';
      case 'picked_up': return 'recupere';
      case 'in_transit': return 'en_cours';
      case 'delivered': return 'livre';
      case 'postponed': return row.postponed_date ? 'reporte' : 'echec';
      case 'cancelled': return 'annule';
      default: return 'en_attente';
    }
  }
  function eventStatus(ev) {
    const r = ev.reason || '';
    switch (ev.status) {
      case 'pending': return /^(Attribué|Réaffecté|Confié)/.test(r) ? 'attribue' : /^Reprogramm/.test(r) ? 'en_attente' : 'en_attente';
      case 'picked_up': return 'recupere';
      case 'in_transit': return 'en_cours';
      case 'delivered': return 'livre';
      case 'postponed': return /^Échec/.test(r) ? 'echec' : 'reporte';
      case 'cancelled': return 'annule';
      default: return 'en_attente';
    }
  }
  const DEFAULT_NOTE = { en_attente: 'Colis enregistré', attribue: 'Livreur attribué', recupere: "Colis récupéré à l'agence",
    en_cours: 'En route vers le destinataire', livre: 'Colis livré', echec: 'Échec de livraison', reporte: 'Livraison reportée', annule: 'Colis annulé' };

  /* ---------- Connexion ---------- */
  /* Une seule ligne attendue : message clair si aucune ou plusieurs (au lieu d'une erreur technique) */
  async function one(query, ctx, none, many) {
    const r = await query.limit(2);
    if (r.error) { const e = new Error(ctx + ' : ' + r.error.message); e.details = r.error; throw e; }
    if (!r.data.length) throw new Error(none);
    if (r.data.length > 1) throw new Error(many);
    return r.data[0];
  }
  async function profileAuth(user) {
    const prof = await one(client().from('profiles').select(COLS.profiles.join(',')).eq('id', user.id), 'Profil',
      "Aucun profil FAST EXPRESS n'est associé à ce compte. Contactez FAST EXPRESS.",
      'Plusieurs profils sont associés à ce compte. Contactez FAST EXPRESS.');
    if (prof.is_active === false) throw new Error('Ce compte est désactivé. Contactez FAST EXPRESS.');
    if (!['manager', 'driver', 'partner'].includes(prof.role)) throw new Error("Ce compte n'a pas de rôle reconnu (" + prof.role + '). Contactez FAST EXPRESS.');
    const a = { userId: user.id, role: prof.role, name: prof.full_name || user.email, phone: prof.phone, email: user.email };
    if (a.role === 'driver') {
      const d = await one(client().from('drivers').select('id').eq('profile_id', user.id), 'Livreur',
        "Ce compte livreur n'a pas de fiche livreur. Contactez FAST EXPRESS.",
        'Plusieurs fiches livreur sont liées à ce compte. Contactez FAST EXPRESS.');
      a.driverId = d.id;
    }
    if (a.role === 'partner') {
      const p = await one(client().from('partners').select('id').eq('profile_id', user.id), 'Partenaire',
        "Ce compte Partenaire n'est lié à aucune entreprise. Contactez FAST EXPRESS.",
        'Plusieurs entreprises sont liées à ce compte Partenaire. Contactez FAST EXPRESS.');
      a.partnerId = p.id;
    }
    me = a; return a;
  }
  async function signIn(email, password) {
    const r = await client().auth.signInWithPassword({ email, password });
    if (r.error) return { error: frError(r.error.message) };
    try { return { auth: await profileAuth(r.data.user) }; }
    catch (e) { await client().auth.signOut(); return { error: e.message }; }
  }
  async function restore() {
    const { data } = await client().auth.getSession();
    if (!data || !data.session) return null;
    try { return await profileAuth(data.session.user); }
    catch (e) { await client().auth.signOut(); throw e; }
  }
  async function signOut() { unsubscribe(); gpsLeave(); me = null; await client().auth.signOut(); }
  /* Suivi de la session Supabase : déconnexion dans un autre onglet, session expirée… */
  function onAuth(cb) { return client().auth.onAuthStateChange((event, session) => { try { cb(event, session); } catch (e) { console.error(e); } }); }

  /* ---------- Lecture et conversion vers le modèle de l'interface ---------- */
  function mapPartner(p) {
    return { id: p.id, company_name: p.company_name || 'Partenaire', contact_name: p.contact_name || '', contact_phone: p.contact_phone || '', profileId: p.profile_id,
      address: P_ADDR_COL ? (p[P_ADDR_COL] || '') : undefined };
  }
  function mapDriver(d, i, prof, loc) {
    const z = ZI[d.zone];
    const pos = loc ? toXY(loc.lat, loc.lng) : z ? { x: z.x, y: z.y } : { x: HQ.x, y: HQ.y };
    return {
      id: d.id, profileId: d.profile_id, nom: (prof && prof.full_name) || 'Livreur', tel: (prof && prof.phone) || '',
      vehicule: d.vehicle_type || 'Moto', plaque: d.vehicle_plate || '—', zone: d.zone || '', zones: secteur(d.zone),
      statut: d.is_on_duty ? 'disponible' : 'hors_service', consentAt: ts(d.consent_at), note: null,
      couleur: AVC[i % AVC.length], pos, posAt: loc ? ts(loc.recorded_at || loc.created_at) : null, depuis: '',
    };
  }
  function authorName(ev) {
    if (ev.author_id && names[ev.author_id]) return names[ev.author_id];
    return { manager: 'Agence', driver: 'Livreur', partner: 'Partenaire' }[ev.author_role] || 'Système';
  }
  function mapParcel(row, events, partners, proofUrls) {
    const hasXY = Number.isFinite(row.delivery_lat) && Number.isFinite(row.delivery_lng);
    const p = hasXY ? toXY(row.delivery_lat, row.delivery_lng) : { x: HQ.x, y: HQ.y };
    const P = partners.find((x) => x.id === row.partner_id);
    const hist = (events || []).map((ev) => {
      const s = eventStatus(ev);
      return { t: ts(ev[EVT_CREATED]) || Date.now(), s, note: (ev.reason || DEFAULT_NOTE[s]).replace(/^Échec : /, ''), by: authorName(ev), lat: ev.lat, lng: ev.lng };
    });
    const statut = appStatus(row);
    const createdAt = (PC.createdAt && ts(row[PC.createdAt])) || (hist[0] && hist[0].t) || Date.now();
    if (!hist.length || hist[0].s !== 'en_attente') hist.unshift({ t: createdAt, s: 'en_attente', note: 'Colis enregistré', by: P ? P.company_name : 'Agence' });
    if (hist[hist.length - 1].s !== statut) hist.push({ t: Math.max(createdAt, hist[hist.length - 1].t), s: statut, note: DEFAULT_NOTE[statut], by: 'Système' });
    const lastBad = [...hist].reverse().find((h) => ['echec', 'reporte', 'annule'].includes(h.s));
    const colMotif = statut === 'annule' ? (PC.cancellationReason && row[PC.cancellationReason])
      : ['reporte', 'echec'].includes(statut) ? (PC.postponedReason && row[PC.postponedReason]) : null;
    const motif = (colMotif ? String(colMotif).replace(/^Échec : /, '') : '') || (lastBad ? lastBad.note.split(' · ')[0] : '');
    const c = {
      id: row.id, dbId: row.id, code: row.tracking_number || String(row.id).slice(0, 8), token: row.tracking_token,
      partnerId: row.partner_id, exp: { nom: P ? P.company_name : 'Expéditeur inconnu', tel: P ? P.contact_phone : '' },
      dest: { nom: row.client_name || 'Destinataire', tel: row.client_phone || '' },
      zone: hasXY ? zoneOf(p) : null, x: p.x, y: p.y, noCoords: !hasXY,
      adresse: row.delivery_address || '', type: (PC.parcelType && row[PC.parcelType]) || 'standard',
      poids: PC.weight ? row[PC.weight] : null, cod: PC.codAmount ? Number(row[PC.codAmount]) || 0 : 0,
      frais: PC.deliveryFee && row[PC.deliveryFee] != null ? Number(row[PC.deliveryFee]) : fraisCalc(p, 'standard', 0),
      statut, livreurId: row.driver_id, createdAt, otp: row.confirmation_code != null ? String(row.confirmation_code).trim() : '',
      hist, motif, postponedDate: ts(row.postponed_date),
    };
    if (statut === 'reporte' && c.postponedDate) c.report = { creneau: creneauLabel(c.postponedDate), t: c.postponedDate };
    if (row.proof_photo_url) c.preuve = { img: proofUrls[row.proof_photo_url] || (/^https?:/.test(row.proof_photo_url) ? row.proof_photo_url : null), t: hist[hist.length - 1].t, by: authorName({}), path: row.proof_photo_url };
    return c;
  }
  let eventsHaveDate = true;  // devient false si parcel_events n'a pas la colonne de date configurée
  async function fetchEvents(ids) {
    const out = {};
    for (let i = 0; i < ids.length; i += 100) {
      const part = ids.slice(i, i + 100);
      const cols = COLS.parcel_events.filter((c) => eventsHaveDate || c !== EVT_CREATED).join(',');
      let q = client().from('parcel_events').select(cols).in('parcel_id', part);
      let res = await (eventsHaveDate ? q.order(EVT_CREATED, { ascending: true }) : q);
      if (res.error && eventsHaveDate && /column|colonne/i.test(res.error.message)) {
        console.warn('[FAST EXPRESS] parcel_events.' + EVT_CREATED + ' introuvable : historique sans date.');
        eventsHaveDate = false; i -= 100; continue;
      }
      if (res.error && (res.error.code === '42501' || /permission denied/i.test(res.error.message || ''))) {
        console.warn('[FAST EXPRESS] parcel_events non autorisée pour ce rôle : historique reconstitué à partir des statuts.');
        return out;
      }
      check(res, 'Historique').forEach((e) => { (out[e.parcel_id] = out[e.parcel_id] || []).push(e); });
    }
    return out;
  }
  async function signedProofs(rows) {
    const paths = rows.map((r) => r.proof_photo_url).filter((u) => u && !/^https?:/.test(u));
    if (!paths.length || !CFG.proofBucket) return {};
    const r = await client().storage.from(CFG.proofBucket).createSignedUrls(paths, 3600);
    const out = {}; (r.data || []).forEach((x) => { if (x.signedUrl) out[x.path] = x.signedUrl; });
    return out;
  }

  /* Tables indispensables selon le rôle. Pour les autres, une lecture refusée par les règles RLS
     (droit absent) est traitée comme « aucune ligne » au lieu de bloquer tout le chargement. */
  const NEEDED = { manager: ['partners', 'drivers', 'parcels'], driver: ['drivers', 'parcels'], partner: ['partners', 'parcels'] };
  async function read(table, query, ctx) {
    const res = await query;
    if (!res.error) return res.data || [];
    const denied = res.error.code === '42501' || /permission denied/i.test(res.error.message || '');
    if (denied && !(NEEDED[me && me.role] || []).includes(table)) { console.warn('[FAST EXPRESS] ' + table + ' non autorisée pour ce rôle : ignorée'); return []; }
    return check(res, ctx);
  }
  async function loadAll() {
    const db = client();
    const partners = (await read('partners', db.from('partners').select(COLS.partners.join(',')), 'Partenaires')).map(mapPartner);
    const drivers = await read('drivers', db.from('drivers').select(COLS.drivers.join(',')), 'Livreurs');
    const pids = [...new Set(drivers.map((d) => d.profile_id).filter(Boolean).concat(me ? [me.userId] : []))];
    const profs = pids.length ? await read('profiles', db.from('profiles').select('id,full_name,phone').in('id', pids), 'Profils') : [];
    profs.forEach((p) => { names[p.id] = p.full_name; });
    const locRows = drivers.length ? await read('driver_locations', db.from('driver_locations').select(COLS.driver_locations.join(','))
      .in('driver_id', drivers.map((d) => d.id)).order('created_at', { ascending: false }).limit(Math.max(200, drivers.length * 10)), 'Positions') : [];
    const lastLoc = {}; locRows.forEach((l) => { if (!lastLoc[l.driver_id]) lastLoc[l.driver_id] = l; });
    locSince = locRows.length ? locRows[0].created_at : null;
    const livreurs = drivers.map((d, i) => mapDriver(d, i, profs.find((p) => p.id === d.profile_id), lastLoc[d.id]));
    const rows = await read('parcels', db.from('parcels').select(parcelCols())
      .order(PC.createdAt || 'tracking_number', { ascending: false }).limit(CFG.maxParcels || 500), 'Colis');
    const evs = await fetchEvents(rows.map((r) => r.id));
    const proofs = await signedProofs(rows);
    const colis = rows.map((r) => mapParcel(r, evs[r.id], partners, proofs)).sort((a, b) => b.createdAt - a.createdAt);
    const max = colis.reduce((m, c) => { const n = parseInt(String(c.code).replace(/\D+/g, '').slice(-5), 10); return Number.isFinite(n) ? Math.max(m, n) : m; }, 18420);
    Object.assign(S, { partners, livreurs, colis, users: [], seq: max + 1 });
    return S;
  }

  /* ---------- Écritures ---------- */
  function enqueue(key, fn) {
    const prev = queues[key] || Promise.resolve();
    const next = prev.catch(() => {}).then(fn);
    queues[key] = next;
    return next;
  }
  const who = () => (me ? { author_id: me.userId, author_role: me.role } : {});
  async function addEvent(c, status, reason, h) {
    check(await client().from('parcel_events').insert(Object.assign({ parcel_id: c.dbId, status, reason: reason || null,
      lat: h && Number.isFinite(h.lat) ? h.lat : null, lng: h && Number.isFinite(h.lng) ? h.lng : null }, who())), 'Historique');
  }
  async function createParcel(c) {
    const g = toLL(c.x, c.y);
    const row = {
      tracking_number: c.code, tracking_token: c.token,
      client_name: c.dest.nom, client_phone: c.dest.tel, delivery_address: c.adresse,
      delivery_lat: g.lat, delivery_lng: g.lng, partner_id: c.partnerId, status: 'pending', driver_id: null,
    };
    if (!CFG.deliveryCodeRpc) row.confirmation_code = c.otp;   // colonne protégée : code généré par la base
    if (PC.codAmount) row[PC.codAmount] = c.cod || 0;
    if (PC.deliveryFee) row[PC.deliveryFee] = c.frais;
    if (PC.parcelType) row[PC.parcelType] = c.type;
    if (PC.weight && c.poids != null) row[PC.weight] = c.poids;
    let res;
    for (let k = 0; k < 4; k++) {
      res = await client().from('parcels').insert(row).select('id').single();
      const dup = res.error && res.error.code === '23505' && /tracking_number/.test((res.error.message || '') + (res.error.details || ''));
      if (!dup || typeof nextCode !== 'function') break;
      const old = c.code; c.code = nextCode(); row.tracking_number = c.code;     // numéro déjà pris : nouvel essai
      window.dispatchEvent(new CustomEvent('fe-code-changed', { detail: { old, code: c.code } }));
    }
    const ins = check(res, 'Création du colis');
    c.dbId = ins.id; c.id = ins.id;
    await addEvent(c, 'pending', c.hist[0] && c.hist[0].note, null);
  }
  function dataUrlToBlob(u) {
    const [head, b64] = u.split(','); const bin = atob(b64); const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: (head.match(/data:([^;]+)/) || [])[1] || 'image/jpeg' });
  }
  async function status(c, h) {
    if (!c.dbId) throw new Error('Colis pas encore enregistré dans Supabase');
    const st = DB_STATUS[h.s];
    const patch = { status: st };
    if (h.s === 'attribue') patch.driver_id = c.livreurId;
    if (h.s === 'en_attente') { patch.driver_id = null; patch.postponed_date = null; }
    if (h.s === 'reporte') patch.postponed_date = new Date(c.postponedDate).toISOString();
    if (h.s === 'echec') patch.postponed_date = null;
    if (PC.postponedReason && h.s === 'reporte') patch[PC.postponedReason] = c.motif || null;
    if (PC.postponedReason && h.s === 'echec') patch[PC.postponedReason] = 'Échec : ' + (c.motif || '');
    if (PC.cancellationReason && h.s === 'annule') patch[PC.cancellationReason] = c.motif || null;
    if (PC.deliveredAt && h.s === 'livre') patch[PC.deliveredAt] = new Date().toISOString();
    if (h.s === 'livre' && c.preuve && c.preuve.img && /^data:/.test(c.preuve.img) && CFG.proofBucket) {
      const path = `${c.dbId}/${Date.now()}.jpg`;
      check(await client().storage.from(CFG.proofBucket).upload(path, dataUrlToBlob(c.preuve.img), { contentType: 'image/jpeg', upsert: false }), 'Photo de preuve');
      patch.proof_photo_url = path; c.preuve.path = path;
    }
    check(await client().from('parcels').update(patch).eq('id', c.dbId), 'Mise à jour du colis');
    const reason = h.s === 'attribue' ? (h.reasonFull || h.note) : h.s === 'echec' ? 'Échec : ' + (h.note || c.motif) : h.note;
    await addEvent(c, st, reason, h);
  }
  async function duty(l) { check(await client().from('drivers').update({ is_on_duty: l.statut === 'disponible' }).eq('id', l.id), 'Disponibilité'); }
  async function consent(l) { check(await client().from('drivers').update({ consent_at: l.consentAt ? new Date(l.consentAt).toISOString() : null }).eq('id', l.id), 'Consentement GPS'); }
  /* Une position, ou un lot de positions gardées hors connexion : une seule requête */
  async function location(l, fix) {
    const rows = (Array.isArray(fix) ? fix : [fix]).map((f) => {
      const row = Object.assign({ driver_id: l.id }, f);
      if (CFG.batteryAsFraction && row.battery_level != null) row.battery_level = row.battery_level / 100;
      return row;
    });
    check(await client().from('driver_locations').insert(rows.length === 1 ? rows[0] : rows), 'Position GPS');
  }
  /* Colonnes lues pour les colis. Le code de remise est lu pour le MANAGER (il le communique au client).
     Quand la vérification est faite par le serveur (CFG.deliveryRpc), il n'est plus chargé chez le livreur
     ni chez le partenaire. Sans fonction serveur, le livreur doit le charger pour la vérification
     (jamais affiché) : limite de sécurité provisoire, voir supabase/05a_… à 06b_…. */
  function parcelCols() {
    // Colonne protégée (CFG.deliveryCodeRpc) : jamais lue, pour personne (le manager passe par getDeliveryCode).
    const hide = CFG.deliveryCodeRpc || (CFG.deliveryRpc && !(me && me.role === 'manager'));
    return (hide ? COLS.parcels.filter((c) => c !== 'confirmation_code') : COLS.parcels).join(',');
  }
  /* Code de remise d'un colis, pour le MANAGER uniquement (fonction serveur get_delivery_code) */
  async function getDeliveryCode(c) {
    if (!CFG.deliveryCodeRpc) throw new Error('Fonction serveur du code non configurée');
    if (!c || !c.dbId) return null;
    const data = check(await client().rpc(CFG.deliveryCodeRpc, { p_parcel_id: c.dbId }), 'Code de remise');
    return data == null ? null : String(Array.isArray(data) ? data[0] : data);
  }
  /* Confirmation de livraison vérifiée par le serveur : renvoie { ok, error?, remaining? } */
  async function confirmDelivery(c, code, opts) {
    if (!CFG.deliveryRpc) throw new Error('Fonction serveur de confirmation non configurée');
    if (!c || !c.dbId) throw new Error('Colis pas encore enregistré dans Supabase');
    const o = opts || {};
    const data = check(await client().rpc(CFG.deliveryRpc, { p_parcel_id: c.dbId, p_code: String(code),
      p_lat: Number.isFinite(o.lat) ? o.lat : null, p_lng: Number.isFinite(o.lng) ? o.lng : null }), 'Confirmation de livraison');
    const r = Array.isArray(data) ? data[0] : data;
    if (!r || typeof r !== 'object' || typeof r.ok !== 'boolean') throw new Error('Réponse inattendue du serveur');
    return r;
  }
  const OPS = { createParcel, status, duty, consent, location };
  function run(op, target, extra) {
    const fn = OPS[op]; if (!fn) return Promise.reject(new Error('Opération inconnue : ' + op));
    const key = target && (target.code || target.id) ? op[0] + ':' + (target.code || target.id) : op;
    return enqueue(op === 'createParcel' || op === 'status' ? 'p:' + (target.token || target.code) : key, () => fn(target, extra));
  }

  /* ---------- Temps réel (parcels, drivers, driver_locations) ---------- */
  let timer = null;
  function subscribe(onChange) {
    unsubscribe();
    const later = () => { clearTimeout(timer); timer = setTimeout(onChange, 300); };
    channel = client().channel('fast-express-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parcels' }, async (p) => {
        const row = p.new && p.new.id ? p.new : null; if (!row) { await loadAll(); return later(); }
        await refetchParcel(row.id);
        later();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, (p) => {
        const d = p.new; const l = d && S.livreurs.find((x) => x.id === d.id); if (!l) return;
        Object.assign(l, { vehicule: d.vehicle_type || l.vehicule, plaque: d.vehicle_plate || l.plaque, zone: d.zone || l.zone, zones: secteur(d.zone),
          statut: d.is_on_duty ? 'disponible' : 'hors_service', consentAt: ts(d.consent_at) });
        later();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'driver_locations' }, (p) => {
        const r = p.new; const l = r && S.livreurs.find((x) => x.id === r.driver_id); if (!l) return;
        if (applyLoc(l, r)) later();
      })
      .subscribe();
  }
  /* Nouvelle position d'un livreur (ignorée si plus ancienne que celle déjà affichée) */
  function applyLoc(l, r) {
    const at = ts(r.recorded_at || r.created_at) || Date.now();
    if (l.posAt && at < l.posAt) return false;
    l.pos = toXY(r.lat, r.lng); l.posAt = at; return true;
  }
  /* Relit UN colis (ligne, étapes, preuve) et met à jour la liste ; le retire s'il n'est plus visible */
  async function refetchParcel(id) {
    const full = check(await client().from('parcels').select(parcelCols()).eq('id', id).maybeSingle(), 'Colis');
    if (!full) { S.colis = S.colis.filter((c) => c.dbId !== id); return; }
    const evs = await fetchEvents([full.id]); const proofs = await signedProofs([full]);
    const c = mapParcel(full, evs[full.id], S.partners, proofs);
    const i = S.colis.findIndex((x) => x.dbId === full.id || x.code === full.tracking_number);
    if (i >= 0) { const old = S.colis[i]; if (old.preuve && old.preuve.img && c.preuve && !c.preuve.img) c.preuve.img = old.preuve.img; if (old._srvCode !== undefined && old.statut === c.statut) c._srvCode = old._srvCode; S.colis[i] = c; } else S.colis.unshift(c);
  }
  /* Relecture périodique des colis (utilisée quand la colonne du code est protégée, au cas où le temps
     réel des colis ne serait plus transmis) : lecture légère des statuts, puis relecture complète
     des seuls colis qui ont changé. Lecture seule. Renvoie true si quelque chose a changé. */
  async function pollParcels() {
    if (!me) return false;
    const lim = CFG.maxParcels || 500;
    const rows = check(await client().from('parcels').select('id,status,driver_id,postponed_date')
      .order(PC.createdAt || 'tracking_number', { ascending: false }).limit(lim), 'Colis') || [];
    let changed = false;
    for (const r of rows) {
      const c = S.colis.find((x) => x.dbId === r.id);
      if (!c || c.statut !== appStatus(r) || (c.livreurId || null) !== (r.driver_id || null)) { await refetchParcel(r.id); changed = true; }
    }
    if (rows.length < lim) {                          // liste complète : un colis absent n'est plus visible
      const ids = new Set(rows.map((r) => r.id)); const before = S.colis.length;
      S.colis = S.colis.filter((c) => !c.dbId || ids.has(c.dbId)); if (S.colis.length !== before) changed = true;
    }
    return changed;
  }
  /* Relecture de sécurité (gestionnaire) : si le temps réel de la table driver_locations
     n'arrive pas, les nouvelles positions et les passages en service sont relus toutes les 30 s.
     Lecture seule ; renvoie true si quelque chose a changé. */
  let locSince = null;
  async function pollLive() {
    if (!me || !S.livreurs.length) return false;
    const db = client(); const ids = S.livreurs.map((l) => l.id); let changed = false;
    let q = db.from('driver_locations').select(COLS.driver_locations.join(',')).in('driver_id', ids).order('created_at', { ascending: false }).limit(200);
    if (locSince) q = q.gt('created_at', locSince);
    const rows = check(await q, 'Positions') || [];
    if (rows.length) locSince = rows[0].created_at || locSince;
    const seen = {};
    rows.forEach((r) => { if (seen[r.driver_id]) return; seen[r.driver_id] = 1; const l = S.livreurs.find((x) => x.id === r.driver_id); if (l && applyLoc(l, r)) changed = true; });
    const ds = check(await db.from('drivers').select('id,is_on_duty').in('id', ids), 'Livreurs') || [];
    ds.forEach((d) => { const l = S.livreurs.find((x) => x.id === d.id); if (l && !!d.is_on_duty !== (l.statut === 'disponible')) { l.statut = d.is_on_duty ? 'disponible' : 'hors_service'; changed = true; } });
    return changed;
  }
  function unsubscribe() { if (channel) { client().removeChannel(channel); channel = null; } }

  /* ---------- Demandes de position : Supabase Realtime Broadcast (aucune table) ----------
     Le gestionnaire envoie « gps_request » ; l'application du livreur répond « gps_ack ».
     L'accusé du serveur prouve seulement que le message est parti : la demande n'est
     considérée comme reçue QUE si le livreur répond. Sans réponse : « non reçue ».
     La présence indique quels livreurs ont l'application ouverte en ce moment. */
  let gpsCh = null, gpsStatus = 'off';
  const pending = {};
  function gpsJoin(h) {
    gpsLeave();
    if (!me) return;
    const key = me.driverId ? 'd:' + me.driverId : 'u:' + me.userId;
    gpsStatus = 'connecting';
    gpsCh = client().channel(CFG.gpsChannel || 'fast-express-gps', { config: { broadcast: { ack: true, self: false }, presence: { key } } });
    gpsCh
      .on('broadcast', { event: 'gps_request' }, ({ payload }) => { if (me && me.driverId && payload && payload.driverId === me.driverId && h.onRequest) h.onRequest(payload); })
      .on('broadcast', { event: 'gps_ack' }, ({ payload }) => {
        const w = payload && pending[payload.reqId];
        if (w) { clearTimeout(w.t); delete pending[payload.reqId]; w.res(Object.assign({ received: true }, payload)); }
        if (h.onAck) h.onAck(payload);
      })
      .on('presence', { event: 'sync' }, () => {
        const ids = {}; const st = gpsCh ? gpsCh.presenceState() : {};
        Object.values(st).forEach((list) => list.forEach((m) => { if (m.driverId) ids[m.driverId] = m; }));
        if (h.onPresence) h.onPresence(ids);
      })
      .subscribe((status) => {
        gpsStatus = status === 'SUBSCRIBED' ? 'ready' : status === 'CLOSED' ? 'off' : 'error';
        if (h.onStatus) h.onStatus(gpsStatus, status);
        if (status === 'SUBSCRIBED' && me && me.driverId && h.presence) gpsTrack(h.presence());
      });
  }
  async function gpsTrack(state) {
    if (gpsCh && gpsStatus === 'ready' && me && me.driverId) {
      try { await gpsCh.track(Object.assign({ driverId: me.driverId, at: new Date().toISOString() }, state || {})); } catch (e) { /* présence non essentielle */ }
    }
  }
  /* Résultat : { received:true, state:'sent'|'off_duty'|'no_permission'|'no_fix', at } | { received:false, state:'no_answer'|'unavailable'|'send_failed' } */
  async function gpsRequest(driverId, from, timeoutMs) {
    if (!gpsCh || gpsStatus !== 'ready') return { received: false, state: 'unavailable' };
    const reqId = (typeof uuid === 'function' ? uuid() : String(Date.now()) + Math.random());
    let r;
    try { r = await gpsCh.send({ type: 'broadcast', event: 'gps_request', payload: { reqId, driverId, from, at: new Date().toISOString() } }); }
    catch (e) { r = 'error'; }
    if (r !== 'ok') return { received: false, state: 'send_failed', detail: String(r) };
    return new Promise((res) => { pending[reqId] = { res, t: setTimeout(() => { delete pending[reqId]; res({ received: false, state: 'no_answer', reqId }); }, timeoutMs || 15000) }; });
  }
  async function gpsAck(payload) {
    if (!gpsCh || gpsStatus !== 'ready') return 'unavailable';
    try { return await gpsCh.send({ type: 'broadcast', event: 'gps_ack', payload: Object.assign({ at: new Date().toISOString() }, payload) }); } catch (e) { return 'error'; }
  }
  function gpsLeave() {
    Object.keys(pending).forEach((k) => { clearTimeout(pending[k].t); pending[k].res({ received: false, state: 'unavailable' }); delete pending[k]; });
    if (gpsCh) { try { gpsCh.untrack(); } catch (e) { /* ignoré */ } client().removeChannel(gpsCh); gpsCh = null; }
    gpsStatus = 'off';
  }

  /* ---------- Suivi public par tracking_token : fonction sécurisée public.track_parcel ---------- */
  /* Renvoie la réponse PUBLIQUE de track_parcel telle quelle (statut, étapes, position récente du livreur…),
     ou null si le lien n'est pas valide. Aucune lecture directe des tables. */
  async function track(token) {
    if (!CFG.trackingRpc) return null;
    const data = check(await client().rpc(CFG.trackingRpc, { p_token: token }), 'Suivi');
    const d = Array.isArray(data) ? data[0] : data;
    if (d == null) return null;
    if (typeof d !== 'object' || typeof d.status !== 'string' || !Array.isArray(d.events)) throw new Error('Suivi : réponse inattendue du serveur');
    return d;
  }

  /* Fiche entreprise du partenaire : seuls le contact, le téléphone (et l'adresse si la colonne existe)
     sont envoyés. Si les règles RLS refusent la modification, Supabase ne renvoie aucune ligne. */
  async function updatePartner(id, patch) {
    const row = {};
    if (typeof patch.contact_name === 'string') row.contact_name = patch.contact_name;
    if (typeof patch.contact_phone === 'string') row.contact_phone = patch.contact_phone;
    if (P_ADDR_COL && typeof patch.address === 'string') row[P_ADDR_COL] = patch.address;
    if (!Object.keys(row).length) throw new Error('Aucune information à enregistrer');
    const { data, error } = await client().from('partners').update(row).eq('id', id).select('id');
    if (error) throw new Error('Enregistrement refusé par Supabase : ' + (error.message || 'erreur inconnue'));
    if (!data || !data.length) throw new Error("Modification non autorisée : votre compte ne peut pas encore modifier la fiche de l'entreprise. Contactez FAST EXPRESS pour la mettre à jour.");
    return data[0];
  }

  window.FEDB = { configured, updatePartner, signIn, signOut, restore, onAuth, loadAll, gpsJoin, gpsTrack, gpsRequest, gpsAck, gpsLeave, gpsState: () => gpsStatus, reload: loadAll, run, subscribe, unsubscribe, pollLive, pollParcels, confirmDelivery, getDeliveryCode, track,
    _test: { appStatus, eventStatus, mapParcel, COLS } };
})();
