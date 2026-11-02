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
             partner_id, delivery_lat, delivery_lng, precision,
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

  /* Colonnes lues et écrites (noms réels) */
  const COLS = {
    profiles: ['id', 'full_name', 'phone', 'role'],
    partners: ['id', 'company_name', 'contact_name', 'contact_phone', 'profile_id'],
    drivers: ['id', 'profile_id', 'vehicle_type', 'vehicle_plate', 'zone', 'is_on_duty', 'consent_at'],
    driver_locations: ['driver_id', 'lat', 'lng', 'accuracy', 'speed', 'heading', 'battery_level', 'is_charging', 'recorded_at', 'created_at'],
    parcels: ['id', 'tracking_number', 'tracking_token', 'confirmation_code', 'client_name', 'client_phone',
      'delivery_address', 'status', 'driver_id', 'partner_id', 'delivery_lat', 'delivery_lng', 'precision',
      'proof_photo_url', 'postponed_date'].concat(
      ['createdAt', 'codAmount', 'deliveryFee', 'parcelType', 'weight', 'reason'].map((k) => PC[k]).filter(Boolean)),
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
  async function profileAuth(user) {
    const prof = check(await client().from('profiles').select(COLS.profiles.join(',')).eq('id', user.id).maybeSingle(), 'Profil');
    if (!prof) throw new Error("Aucun profil FAST EXPRESS n'est associé à ce compte (table profiles).");
    if (!['manager', 'driver', 'partner'].includes(prof.role)) throw new Error('Rôle non pris en charge : ' + prof.role);
    const a = { userId: user.id, role: prof.role, name: prof.full_name || user.email, phone: prof.phone, email: user.email };
    if (a.role === 'driver') {
      const d = check(await client().from('drivers').select('id').eq('profile_id', user.id).maybeSingle(), 'Livreur');
      if (!d) throw new Error("Ce compte livreur n'a pas de fiche dans la table drivers.");
      a.driverId = d.id;
    }
    if (a.role === 'partner') {
      const p = check(await client().from('partners').select('id').eq('profile_id', user.id).maybeSingle(), 'Partenaire');
      if (!p) throw new Error("Ce compte partenaire n'a pas de fiche dans la table partners.");
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
  async function signOut() { unsubscribe(); me = null; await client().auth.signOut(); }

  /* ---------- Lecture et conversion vers le modèle de l'interface ---------- */
  function mapPartner(p) {
    return { id: p.id, company_name: p.company_name || 'Partenaire', contact_name: p.contact_name || '', contact_phone: p.contact_phone || '', profileId: p.profile_id };
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
    const motif = (PC.reason && row[PC.reason]) || (lastBad ? lastBad.note.split(' · ')[0] : '');
    const c = {
      id: row.id, dbId: row.id, code: row.tracking_number || String(row.id).slice(0, 8), token: row.tracking_token,
      partnerId: row.partner_id, exp: { nom: P ? P.company_name : 'Expéditeur inconnu', tel: P ? P.contact_phone : '' },
      dest: { nom: row.client_name || 'Destinataire', tel: row.client_phone || '' },
      zone: hasXY ? zoneOf(p) : null, x: p.x, y: p.y, noCoords: !hasXY, precision: row.precision,
      adresse: row.delivery_address || '', type: (PC.parcelType && row[PC.parcelType]) || 'standard',
      poids: PC.weight ? row[PC.weight] : null, cod: PC.codAmount ? Number(row[PC.codAmount]) || 0 : 0,
      frais: PC.deliveryFee && row[PC.deliveryFee] != null ? Number(row[PC.deliveryFee]) : fraisCalc(p, 'standard', 0),
      statut, livreurId: row.driver_id, createdAt, otp: row.confirmation_code != null ? String(row.confirmation_code) : '',
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

  async function loadAll() {
    const db = client();
    const partners = check(await db.from('partners').select(COLS.partners.join(',')), 'Partenaires').map(mapPartner);
    const drivers = check(await db.from('drivers').select(COLS.drivers.join(',')), 'Livreurs');
    const pids = [...new Set(drivers.map((d) => d.profile_id).filter(Boolean).concat(me ? [me.userId] : []))];
    const profs = pids.length ? check(await db.from('profiles').select('id,full_name,phone').in('id', pids), 'Profils') : [];
    profs.forEach((p) => { names[p.id] = p.full_name; });
    const locRows = drivers.length ? check(await db.from('driver_locations').select(COLS.driver_locations.join(','))
      .in('driver_id', drivers.map((d) => d.id)).order('created_at', { ascending: false }).limit(Math.max(200, drivers.length * 10)), 'Positions') : [];
    const lastLoc = {}; locRows.forEach((l) => { if (!lastLoc[l.driver_id]) lastLoc[l.driver_id] = l; });
    const livreurs = drivers.map((d, i) => mapDriver(d, i, profs.find((p) => p.id === d.profile_id), lastLoc[d.id]));
    const rows = check(await db.from('parcels').select(COLS.parcels.join(','))
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
      tracking_number: c.code, tracking_token: c.token, confirmation_code: c.otp,
      client_name: c.dest.nom, client_phone: c.dest.tel, delivery_address: c.adresse,
      delivery_lat: g.lat, delivery_lng: g.lng, partner_id: c.partnerId, status: 'pending', driver_id: null,
    };
    if (PC.codAmount) row[PC.codAmount] = c.cod || 0;
    if (PC.deliveryFee) row[PC.deliveryFee] = c.frais;
    if (PC.parcelType) row[PC.parcelType] = c.type;
    if (PC.weight && c.poids != null) row[PC.weight] = c.poids;
    const ins = check(await client().from('parcels').insert(row).select('id').single(), 'Création du colis');
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
    if (PC.reason && ['echec', 'reporte', 'annule'].includes(h.s)) patch[PC.reason] = c.motif || null;
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
  async function location(l, fix) {
    const row = Object.assign({ driver_id: l.id }, fix);
    if (CFG.batteryAsFraction && row.battery_level != null) row.battery_level = row.battery_level / 100;
    check(await client().from('driver_locations').insert(row), 'Position GPS');
  }
  const OPS = { createParcel, status, duty, consent, location };
  function run(op, target, extra) {
    const fn = OPS[op]; if (!fn) return Promise.reject(new Error('Opération inconnue : ' + op));
    const key = target && (target.code || target.id) ? op[0] + ':' + (target.code || target.id) : op;
    return enqueue(op === 'createParcel' || op === 'status' ? 'p:' + target.code : key, () => fn(target, extra));
  }

  /* ---------- Temps réel (parcels, drivers, driver_locations) ---------- */
  let timer = null;
  function subscribe(onChange) {
    unsubscribe();
    const later = () => { clearTimeout(timer); timer = setTimeout(onChange, 300); };
    channel = client().channel('fast-express-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parcels' }, async (p) => {
        const row = p.new && p.new.id ? p.new : null; if (!row) { await loadAll(); return later(); }
        const full = check(await client().from('parcels').select(COLS.parcels.join(',')).eq('id', row.id).maybeSingle(), 'Colis');
        if (!full) { S.colis = S.colis.filter((c) => c.dbId !== row.id); return later(); }
        const evs = await fetchEvents([full.id]); const proofs = await signedProofs([full]);
        const c = mapParcel(full, evs[full.id], S.partners, proofs);
        const i = S.colis.findIndex((x) => x.dbId === full.id || x.code === full.tracking_number);
        if (i >= 0) { const old = S.colis[i]; if (old.preuve && old.preuve.img && c.preuve && !c.preuve.img) c.preuve.img = old.preuve.img; S.colis[i] = c; } else S.colis.unshift(c);
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
        l.pos = toXY(r.lat, r.lng); l.posAt = ts(r.recorded_at || r.created_at) || Date.now();
        later();
      })
      .subscribe();
  }
  function unsubscribe() { if (channel) { client().removeChannel(channel); channel = null; } }

  /* ---------- Suivi public par tracking_token (fonction serveur à créer, voir README) ---------- */
  async function track(token) {
    if (!CFG.trackingRpc) return null;
    const data = check(await client().rpc(CFG.trackingRpc, { p_token: token }), 'Suivi');
    const row = Array.isArray(data) ? data[0] : data; if (!row) return null;
    return mapParcel(row, row.events || [], [{ id: row.partner_id, company_name: row.partner_name || 'FAST EXPRESS', contact_phone: '' }], {});
  }

  window.FEDB = { configured, signIn, signOut, restore, loadAll, reload: loadAll, run, subscribe, unsubscribe, track,
    _test: { appStatus, eventStatus, mapParcel, COLS } };
})();
