// =====================================================================
// FAST EXPRESS — Edge Function « admin-users » (PROPOSITION NON DÉPLOYÉE)
// Gestion des comptes livreurs et partenaires par un MANAGER ACTIF.
//
// Sécurité :
//  • La clé service_role n'existe QUE dans l'environnement de la fonction
//    (variable SUPABASE_SERVICE_ROLE_KEY fournie par Supabase). Jamais dans le navigateur.
//  • Chaque appel vérifie le jeton de la personne connectée, puis son profil :
//    role = 'manager' ET is_active = true. Sinon : refus.
//  • Le rôle d'un compte est fixé par l'action (create_driver → driver, create_partner →
//    partner). Aucune action ne permet de choisir ni de modifier un rôle.
//  • Aucune action ne touche un compte manager : impossible de désactiver le dernier manager.
//  • Désactiver = profiles.is_active = false + connexion bloquée (ban) ; aucune donnée supprimée.
//  • Les mots de passe ne sont jamais lus ni renvoyés. Seul le mot de passe PROVISOIRE
//    généré par la fonction est renvoyé une fois, au manager qui vient de le demander.
//
// Mot de passe provisoire — IMPOSÉ PAR LE SERVEUR :
//  • Le mot de passe provisoire n'est PAS le mot de passe Supabase du compte : le compte reçoit
//    un mot de passe aléatoire inconnu de tous, et reste BLOQUÉ (ban) tant que la première
//    connexion n'est pas terminée. Avec le mot de passe provisoire, aucune session ne peut
//    s'ouvrir : aucune donnée n'est accessible, même par une requête directe à l'API.
//  • Seule une empreinte (PBKDF2-SHA256, sel aléatoire) du mot de passe provisoire est gardée,
//    dans app_metadata : modifiable uniquement par le serveur, jamais par l'utilisateur.
//  • L'action publique « first_login » vérifie e-mail + mot de passe provisoire, impose un
//    nouveau mot de passe solide, puis débloque le compte. 5 essais faux → bloqué jusqu'à un
//    nouveau mot de passe provisoire du manager.
//  • Les comptes existants (sans « fe_pending ») ne sont pas concernés.
//
// Déploiement (voir supabase/09_gestion_utilisateurs.md) :
//   supabase functions deploy admin-users --no-verify-jwt
//   (« Verify JWT » DÉSACTIVÉ : la première connexion se fait sans session ; les actions du
//    manager vérifient elles-mêmes le jeton et le rôle, voir requireManager)
//   supabase secrets set FE_ALLOWED_ORIGINS=https://labsmakjos-ctrl.github.io
// =====================================================================
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ORIGINS = (Deno.env.get('FE_ALLOWED_ORIGINS') ?? 'https://labsmakjos-ctrl.github.io')
  .split(',').map((s) => s.trim()).filter(Boolean);

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

/* ---------- Réponses ---------- */
function cors(req: Request): Record<string, string> {
  const o = req.headers.get('origin') ?? '';
  return {
    'Access-Control-Allow-Origin': ORIGINS.includes(o) ? o : ORIGINS[0] ?? '',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}
class Refus extends Error { constructor(public code: string, public status = 400) { super(code); } }
const fail = (code: string, status = 400): never => { throw new Refus(code, status); };

/* ---------- Validation des champs ---------- */
const txt = (v: unknown, min: number, max: number, code: string): string => {
  const s = typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : '';
  if (s.length < min || s.length > max) fail(code);
  return s;
};
const opt = (v: unknown, max: number, code: string): string | null => {
  if (v == null || v === '') return null;
  return txt(v, 1, max, code);
};
const email = (v: unknown): string => {
  const s = txt(v, 5, 160, 'email_invalide').toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)) fail('email_invalide');
  return s;
};
const phone = (v: unknown): string => {
  const s = txt(v, 8, 30, 'telephone_invalide');
  if (s.replace(/\D/g, '').length < 8) fail('telephone_invalide');
  return s;
};
// Identifiant de fiche (uuid ou entier selon la base) : format strict, jamais de texte libre
const uuid = (v: unknown, code: string): string => {
  const s = typeof v === 'string' || typeof v === 'number' ? String(v) : '';
  if (!/^[0-9A-Za-z-]{1,64}$/.test(s)) fail(code);
  return s;
};

/* Mot de passe provisoire : 12 caractères sans ambiguïté (pas de 0/O, 1/l/I), générateur cryptographique */
function tempPassword(): string {
  const A = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const out: string[] = [];
  const buf = new Uint32Array(1);
  while (out.length < 12) {
    crypto.getRandomValues(buf);
    if (buf[0] < Math.floor(0x100000000 / A.length) * A.length) out.push(A[buf[0] % A.length]);
  }
  const s = out.join('');
  return /\d/.test(s) && /[A-Z]/.test(s) && /[a-z]/.test(s) ? s : tempPassword();
}

/* ---------- Empreinte du mot de passe provisoire (jamais stocké en clair) ---------- */
const PBKDF2_ITER = 210000;
const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
async function derive(pw: string, salt: BufferSource, iter: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, key, 256));
}
async function tempHash(pw: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { s: b64(salt), h: b64(await derive(pw, salt, PBKDF2_ITER)), i: PBKDF2_ITER };
}
async function tempMatches(pw: string, t: { s?: string; h?: string; i?: number } | undefined): Promise<boolean> {
  if (!t || !t.s || !t.h || !t.i) return false;
  const a = await derive(pw, unb64(t.s), t.i), b = unb64(t.h);
  if (a.length !== b.length) return false;
  let d = 0; for (let k = 0; k < a.length; k++) d |= a[k] ^ b[k];   // comparaison à temps constant
  return d === 0;
}
/* Mot de passe Supabase aléatoire et inconnu (jamais renvoyé) : empêche toute connexion directe */
const unusablePassword = () => b64(crypto.getRandomValues(new Uint8Array(32)));
const BAN = '876000h';
/* Compte « en attente de première connexion » : ban + empreinte du mot de passe provisoire */
async function pendingAttrs(temp: string) {
  return { password: unusablePassword(), ban_duration: BAN,
    app_metadata: { fe_pending: true, fe_temp: await tempHash(temp), fe_attempts: 0 } };
}
const MAX_ATTEMPTS = 5;
const strong = (p: string) => p.length >= 10 && p.length <= 72 && /[A-Za-z]/.test(p) && /\d/.test(p);
async function findByEmail(mail: string) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) fail('erreur_serveur', 500);
    const u = data.users.find((x: { email?: string }) => (x.email ?? '').toLowerCase() === mail);
    if (u) return u;
    if (data.users.length < 1000) break;
  }
  return null;
}

/* ---------- Contrôle de l'appelant : manager actif ---------- */
async function requireManager(req: Request): Promise<string> {
  const h = req.headers.get('authorization') ?? '';
  const jwt = h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : '';
  if (!jwt) fail('non_connecte', 401);
  const { data, error } = await admin.auth.getUser(jwt);
  if (error || !data?.user) fail('non_connecte', 401);
  const { data: p, error: e2 } = await admin.from('profiles').select('role,is_active').eq('id', data.user.id).maybeSingle();
  if (e2) fail('erreur_serveur', 500);
  if (!p || p.role !== 'manager' || p.is_active !== true) fail('reserve_au_manager', 403);
  return data.user.id;
}

/* ---------- Création du compte de connexion + profil (avec annulation si une étape échoue) ---------- */
async function createLogin(mail: string, fullName: string, tel: string, role: 'driver' | 'partner') {
  const password = tempPassword();
  const pend = await pendingAttrs(password);
  const { data, error } = await admin.auth.admin.createUser({
    email: mail, password: pend.password, email_confirm: true,
    app_metadata: pend.app_metadata, user_metadata: { full_name: fullName },
  });
  if (error || !data?.user) {
    if (/already|registered|exists/i.test(error?.message ?? '')) fail('email_deja_utilise', 409);
    fail('creation_compte_impossible', 500);
  }
  const uid = data!.user!.id;
  // bloqué jusqu'à la première connexion (mot de passe provisoire remplacé)
  const { error: eban } = await admin.auth.admin.updateUserById(uid, { ban_duration: BAN });
  if (eban) { await admin.auth.admin.deleteUser(uid); fail('creation_compte_impossible', 500); }
  const { error: ep } = await admin.from('profiles').insert({ id: uid, full_name: fullName, phone: tel, role, is_active: true });
  if (ep) { await admin.auth.admin.deleteUser(uid); fail('creation_profil_impossible', 500); }
  return { uid, password };
}
async function undoLogin(uid: string) {
  await admin.from('profiles').delete().eq('id', uid);   // profil créé à l'instant, sans historique
  await admin.auth.admin.deleteUser(uid);
}

/* Profil d'un compte géré : uniquement livreur ou partenaire, jamais manager */
async function managedProfile(pid: string, role: 'driver' | 'partner') {
  const { data, error } = await admin.from('profiles').select('id,role,is_active').eq('id', pid).maybeSingle();
  if (error) fail('erreur_serveur', 500);
  if (!data) fail('compte_introuvable', 404);
  if (data!.role !== role) fail('role_incompatible', 403);
  return data!;
}
async function driverRow(id: string) {
  const { data, error } = await admin.from('drivers').select('id,profile_id').eq('id', id).maybeSingle();
  if (error) fail('erreur_serveur', 500);
  if (!data || !data.profile_id) fail('livreur_introuvable', 404);
  return data!;
}
async function partnerRow(id: string) {
  const { data, error } = await admin.from('partners').select('id,profile_id').eq('id', id).maybeSingle();
  if (error) fail('erreur_serveur', 500);
  if (!data) fail('partenaire_introuvable', 404);
  return data!;
}
async function setEmail(pid: string, mail: string | null) {
  if (!mail) return;
  const { error } = await admin.auth.admin.updateUserById(pid, { email: mail, email_confirm: true });
  if (error) fail(/already|registered|exists/i.test(error.message) ? 'email_deja_utilise' : 'modification_email_impossible', 409);
}

/* ---------- Actions ---------- */
type Body = Record<string, unknown>;
const ACTIONS: Record<string, (b: Body) => Promise<unknown>> = {

  async list() {
    const { data: profs, error } = await admin.from('profiles').select('id').in('role', ['driver', 'partner']);
    if (error) fail('erreur_serveur', 500);
    const ids = new Set((profs ?? []).map((p: { id: string }) => p.id));
    const out: unknown[] = [];
    for (let page = 1; page <= 20; page++) {
      const { data, error: e } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (e) fail('erreur_serveur', 500);
      for (const u of data.users) {
        if (!ids.has(u.id)) continue;
        out.push({ id: u.id, email: u.email ?? null, last_sign_in_at: u.last_sign_in_at ?? null,
          blocked: !!(u.banned_until && Date.parse(u.banned_until) > Date.now()),
          must_change_password: u.app_metadata?.fe_pending === true,
          locked: u.app_metadata?.fe_pending === true && (u.app_metadata?.fe_attempts ?? 0) >= MAX_ATTEMPTS });
      }
      if (data.users.length < 1000) break;
    }
    return { accounts: out };
  },

  async create_driver(b) {
    const fullName = txt(b.full_name, 2, 80, 'nom_invalide'), tel = phone(b.phone), mail = email(b.email);
    const vehicle = txt(b.vehicle_type, 2, 40, 'vehicule_invalide');
    // drivers.zone est NOT NULL sans valeur par défaut (09.0 b) : obligatoire
    const plate = opt(b.vehicle_plate, 20, 'plaque_invalide'), zone = txt(b.zone, 2, 40, 'zone_invalide');
    const { uid, password } = await createLogin(mail, fullName, tel, 'driver');
    const { data, error } = await admin.from('drivers')
      .insert({ profile_id: uid, vehicle_type: vehicle, vehicle_plate: plate, zone, is_on_duty: false }).select('id').single();
    if (error || !data) { await undoLogin(uid); fail('creation_fiche_livreur_impossible', 500); }
    return { profile_id: uid, driver_id: data!.id, email: mail, temp_password: password };
  },

  async create_partner(b) {
    const company = txt(b.company_name, 2, 100, 'entreprise_invalide');
    const contact = txt(b.contact_name, 2, 80, 'nom_invalide'), tel = phone(b.contact_phone), mail = email(b.email);
    const { uid, password } = await createLogin(mail, contact, tel, 'partner');
    const { data, error } = await admin.from('partners')
      // partners.contact_email est NOT NULL sans valeur par défaut (09.0 b) : e-mail du responsable
      .insert({ company_name: company, contact_name: contact, contact_phone: tel, contact_email: mail, profile_id: uid }).select('id').single();
    if (error || !data) { await undoLogin(uid); fail('creation_fiche_partenaire_impossible', 500); }
    return { profile_id: uid, partner_id: data!.id, email: mail, temp_password: password };
  },

  // Entreprise déjà enregistrée sans compte : on lui crée SON accès (jamais celui d'une autre)
  async create_partner_login(b) {
    const pid = uuid(b.partner_id, 'partenaire_introuvable');
    const p = await partnerRow(pid);
    if (p.profile_id) fail('partenaire_a_deja_un_compte', 409);
    const { data: full } = await admin.from('partners').select('contact_name,contact_phone').eq('id', pid).single();
    const contact = txt(b.contact_name ?? full?.contact_name, 2, 80, 'nom_invalide');
    const tel = phone(b.contact_phone ?? full?.contact_phone), mail = email(b.email);
    const { uid, password } = await createLogin(mail, contact, tel, 'partner');
    const { data, error } = await admin.from('partners').update({ profile_id: uid, contact_name: contact, contact_phone: tel })
      .eq('id', pid).is('profile_id', null).select('id');
    if (error || !data || data.length !== 1) { await undoLogin(uid); fail('association_impossible', 409); }
    return { profile_id: uid, partner_id: pid, email: mail, temp_password: password };
  },

  async update_driver(b) {
    const d = await driverRow(uuid(b.driver_id, 'livreur_introuvable'));
    await managedProfile(d.profile_id, 'driver');
    const fullName = txt(b.full_name, 2, 80, 'nom_invalide'), tel = phone(b.phone);
    const row = { vehicle_type: txt(b.vehicle_type, 2, 40, 'vehicule_invalide'),
      vehicle_plate: opt(b.vehicle_plate, 20, 'plaque_invalide'), zone: txt(b.zone, 2, 40, 'zone_invalide') };
    const mail = b.email ? email(b.email) : null;
    await setEmail(d.profile_id, mail);
    const e1 = (await admin.from('profiles').update({ full_name: fullName, phone: tel }).eq('id', d.profile_id)).error;
    const e2 = (await admin.from('drivers').update(row).eq('id', d.id)).error;
    if (e1 || e2) fail('modification_impossible', 500);
    return { ok: true };
  },

  async update_partner(b) {
    const p = await partnerRow(uuid(b.partner_id, 'partenaire_introuvable'));
    const row = { company_name: txt(b.company_name, 2, 100, 'entreprise_invalide'),
      contact_name: txt(b.contact_name, 2, 80, 'nom_invalide'), contact_phone: phone(b.contact_phone) };
    const mail = b.email ? email(b.email) : null;
    if (p.profile_id) {
      await managedProfile(p.profile_id, 'partner');
      await setEmail(p.profile_id, mail);
      const e1 = (await admin.from('profiles').update({ full_name: row.contact_name, phone: row.contact_phone }).eq('id', p.profile_id)).error;
      if (e1) fail('modification_impossible', 500);
    }
    const e2 = (await admin.from('partners').update(row).eq('id', p.id)).error;
    if (e2) fail('modification_impossible', 500);
    return { ok: true };
  },

  async set_active(b) {
    const kind = b.kind === 'driver' ? 'driver' : b.kind === 'partner' ? 'partner' : fail('type_invalide');
    const active = b.active === true ? true : b.active === false ? false : fail('etat_invalide');
    const id = uuid(b.id, 'compte_introuvable');
    const row = kind === 'driver' ? await driverRow(id) : await partnerRow(id);
    if (!row.profile_id) fail('pas_de_compte', 409);
    await managedProfile(row.profile_id, kind as 'driver' | 'partner');   // jamais un manager
    if (kind === 'driver' && !active) {
      // un livreur qui transporte encore des colis ne peut pas être désactivé : réaffecter d'abord
      const { count, error } = await admin.from('parcels').select('id', { count: 'exact', head: true })
        .eq('driver_id', id).in('status', ['pending', 'picked_up', 'in_transit']);
      if (error) fail('erreur_serveur', 500);
      if ((count ?? 0) > 0) fail('livreur_a_des_colis', 409);
      await admin.from('drivers').update({ is_on_duty: false }).eq('id', id);
    }
    const { error } = await admin.from('profiles').update({ is_active: active }).eq('id', row.profile_id);
    if (error) fail('modification_impossible', 500);
    // réactivation : un compte qui n'a pas encore remplacé son mot de passe provisoire reste bloqué
    const { data: au } = await admin.auth.admin.getUserById(row.profile_id);
    const pending = au?.user?.app_metadata?.fe_pending === true;
    const { error: eb } = await admin.auth.admin.updateUserById(row.profile_id, { ban_duration: active && !pending ? 'none' : BAN });
    if (eb) {   // profil et blocage doivent rester cohérents
      await admin.from('profiles').update({ is_active: !active }).eq('id', row.profile_id);
      fail('blocage_connexion_impossible', 500);
    }
    return { ok: true, active };
  },

  async reset_password(b) {
    const kind = b.kind === 'driver' ? 'driver' : b.kind === 'partner' ? 'partner' : fail('type_invalide');
    const id = uuid(b.id, 'compte_introuvable');
    const row = kind === 'driver' ? await driverRow(id) : await partnerRow(id);
    if (!row.profile_id) fail('pas_de_compte', 409);
    await managedProfile(row.profile_id, kind as 'driver' | 'partner');
    const password = tempPassword();
    // l'ancien mot de passe cesse de fonctionner, les sessions ouvertes ne peuvent plus être prolongées
    const { error } = await admin.auth.admin.updateUserById(row.profile_id, await pendingAttrs(password));
    if (error) fail('reinitialisation_impossible', 500);
    return { temp_password: password };
  },

  // PUBLIQUE (sans session) : première connexion avec le mot de passe provisoire.
  // Sans new_password : vérifie seulement (pour afficher le formulaire). Avec : remplace et débloque.
  async first_login(b) {
    const mail = email(b.email);
    const temp = typeof b.temp_password === 'string' ? b.temp_password : '';
    const generic = () => fail('identifiants_invalides', 401);
    if (!temp || temp.length > 64) generic();
    const u = await findByEmail(mail);
    const meta = (u?.app_metadata ?? {}) as { fe_pending?: boolean; fe_temp?: { s: string; h: string; i: number }; fe_attempts?: number };
    if (!u || meta.fe_pending !== true) { await derive(temp, new Uint8Array(16), PBKDF2_ITER); generic(); }   // pas d'indice sur l'existence du compte
    const attempts = meta.fe_attempts ?? 0;
    if (attempts >= MAX_ATTEMPTS) fail('trop_de_tentatives', 429);
    if (!(await tempMatches(temp, meta.fe_temp))) {
      await admin.auth.admin.updateUserById(u!.id, { app_metadata: { fe_attempts: attempts + 1 } });
      if (attempts + 1 >= MAX_ATTEMPTS) fail('trop_de_tentatives', 429);
      generic();
    }
    const { data: prof } = await admin.from('profiles').select('role,is_active').eq('id', u!.id).maybeSingle();
    if (!prof || prof.is_active !== true || !['driver', 'partner'].includes(prof.role)) fail('compte_desactive', 403);
    if (b.new_password == null) return { pending: true };
    const np = typeof b.new_password === 'string' ? b.new_password : '';
    if (!strong(np)) fail('mot_de_passe_faible');
    if (np === temp) fail('mot_de_passe_identique');
    const { error } = await admin.auth.admin.updateUserById(u!.id, {
      password: np, ban_duration: 'none',
      app_metadata: { fe_pending: false, fe_temp: null, fe_attempts: 0 },
    });
    if (error) fail(/weak|short|least|pwned|leaked/i.test(error.message) ? 'mot_de_passe_faible' : 'changement_impossible', 400);
    return { done: true };
  },
};

Deno.serve(async (req) => {
  const h = { ...cors(req), 'Content-Type': 'application/json' };
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'methode_interdite' }), { status: 405, headers: h });
  try {
    if (!SUPABASE_URL || !SERVICE_KEY) fail('configuration_serveur', 500);
    const body = (await req.json().catch(() => ({}))) as Body;
    const action = String(body.action ?? '');
    if (action !== 'first_login') await requireManager(req);   // seule la première connexion est publique
    const fn = ACTIONS[action];
    if (!fn) fail('action_inconnue');
    const out = await fn(body);
    return new Response(JSON.stringify({ ok: true, ...(out as object) }), { status: 200, headers: h });
  } catch (e) {
    const code = e instanceof Refus ? e.code : 'erreur_serveur';
    const status = e instanceof Refus ? e.status : 500;
    if (!(e instanceof Refus)) console.error(e);
    return new Response(JSON.stringify({ ok: false, error: code }), { status, headers: h });
  }
});
