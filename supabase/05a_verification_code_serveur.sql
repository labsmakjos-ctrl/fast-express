-- =====================================================================
-- ÉTAPE 05A — PROPOSITION NON EXÉCUTÉE. À valider avant toute exécution.
-- FAST EXPRESS : vérification du code de remise PAR LE SERVEUR.
--
-- Contenu :
--   • table privée public.delivery_code_attempts (essais de code, déblocages) ;
--   • fonction public.confirm_delivery(...)   → appelée par l'application ;
--   • fonction public.admin_unlock_delivery_code(...) → procédure exceptionnelle,
--     exécutable UNIQUEMENT depuis le SQL Editor (aucun accès depuis l'application).
--
-- Effet sur l'application actuelle : AUCUN (elle n'appelle pas encore ces fonctions).
-- Ne modifie aucune règle RLS, aucune donnée existante, aucune autre table.
--
-- PRÉREQUIS (fichier 05-06_0_pre_verifications_lecture_seule.sql) :
--   P1 sans ⛔ (aucun utilisateur ne peut modifier son propre rôle)
--   P9 : parcel_events accepte status 'delivered' et author_role 'manager'/'driver'
--   P10 : aucun conflit de nom
-- Exécutable seul ; s'arrête de lui-même si les tables attendues n'existent pas.
-- =====================================================================
begin;

-- Garde-fou : tables et colonnes attendues
do $$
begin
  if to_regclass('public.parcels') is null or to_regclass('public.parcel_events') is null
     or to_regclass('public.profiles') is null or to_regclass('public.drivers') is null then
    raise exception '05A annulée : tables parcels / parcel_events / profiles / drivers introuvables';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- A.1 — Essais de code. RLS activée SANS règle ⇒ aucun accès depuis le navigateur.
-- kind : 'fail' (code faux), 'success' (code bon), 'reset' (déblocage), 'forced' (livraison forcée, 05B)
-- ---------------------------------------------------------------------
create table if not exists public.delivery_code_attempts (
  id          bigint generated always as identity primary key,
  parcel_id   uuid not null references public.parcels(id) on delete cascade,
  user_id     uuid,
  kind        text not null check (kind in ('fail', 'success', 'reset', 'forced')),
  reason      text,
  created_at  timestamptz not null default now()
);
create index if not exists delivery_code_attempts_parcel_time
  on public.delivery_code_attempts (parcel_id, created_at desc);
alter table public.delivery_code_attempts enable row level security;
revoke all on table public.delivery_code_attempts from public, anon, authenticated;
-- Séquence de la colonne id : aucun droit pour les visiteurs ni les comptes connectés
do $$
declare v_seq text := pg_get_serial_sequence('public.delivery_code_attempts', 'id');
begin
  if v_seq is not null then
    execute format('revoke all on sequence %s from public, anon, authenticated', v_seq);
  end if;
end $$;

-- ---------------------------------------------------------------------
-- A.2 — Confirmation de livraison avec le code (appelée par l'application)
-- Réponse : {"ok":true} ou {"ok":false,"error":"…","remaining":n}
--   error ∈ not_allowed | not_found | bad_status | bad_code | locked | code_incorrect
-- ---------------------------------------------------------------------
create or replace function public.confirm_delivery(
  p_parcel_id uuid,
  p_code      text,
  p_lat       double precision default null,
  p_lng       double precision default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  c_max_fails constant integer  := 5;
  c_window    constant interval := interval '15 minutes';
  v_uid    uuid := auth.uid();
  v_role   text;
  v_active boolean;
  v_parcel record;
  v_reset  timestamptz;
  v_fails  integer;
begin
  -- 1. Compte connecté, profil existant, actif, rôle manager ou livreur (rôle vide = refus)
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_allowed');
  end if;
  select pr.role, pr.is_active into v_role, v_active
  from public.profiles pr where pr.id = v_uid;
  if not found or v_active is false or v_role is null or v_role not in ('manager', 'driver') then
    return jsonb_build_object('ok', false, 'error', 'not_allowed');
  end if;

  -- 2. Colis verrouillé pendant la vérification (confirmations simultanées sérialisées)
  select p.id, p.status, p.driver_id, p.confirmation_code
    into v_parcel
  from public.parcels p
  where p.id = p_parcel_id
  for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  -- 3. Un livreur ne confirme QUE les colis qui lui sont attribués
  if v_role = 'driver' and not exists (
       select 1 from public.drivers d
       where d.profile_id = v_uid and d.id = v_parcel.driver_id) then
    return jsonb_build_object('ok', false, 'error', 'not_allowed');
  end if;

  -- 4. Seulement un colis en cours de livraison (statut vide = refus)
  if v_parcel.status is distinct from 'in_transit' then
    return jsonb_build_object('ok', false, 'error', 'bad_status');
  end if;

  -- 5. Format du code
  if p_code is null or p_code !~ '^[0-9]{4}$' then
    return jsonb_build_object('ok', false, 'error', 'bad_code');
  end if;

  -- 6. Blocage après 5 codes faux en 15 minutes, depuis le dernier déblocage éventuel
  select max(a.created_at) into v_reset
  from public.delivery_code_attempts a
  where a.parcel_id = v_parcel.id and a.kind = 'reset';
  select count(*) into v_fails
  from public.delivery_code_attempts a
  where a.parcel_id = v_parcel.id and a.kind = 'fail'
    and a.created_at > now() - c_window
    and (v_reset is null or a.created_at > v_reset);
  if v_fails >= c_max_fails then
    return jsonb_build_object('ok', false, 'error', 'locked');
  end if;

  -- 7. Vérification (le code n'est jamais renvoyé)
  if v_parcel.confirmation_code is null
     or btrim(v_parcel.confirmation_code) <> p_code then
    insert into public.delivery_code_attempts (parcel_id, user_id, kind)
    values (v_parcel.id, v_uid, 'fail');
    return jsonb_build_object('ok', false, 'error', 'code_incorrect',
                              'remaining', greatest(c_max_fails - v_fails - 1, 0));
  end if;

  -- 8. Code correct : livraison enregistrée par le serveur
  insert into public.delivery_code_attempts (parcel_id, user_id, kind)
  values (v_parcel.id, v_uid, 'success');

  perform set_config('fast_express.confirm_delivery', 'on', true);   -- autorisé par le garde-fou 05B
  update public.parcels
     set status = 'delivered', delivered_at = now(), updated_at = now()
   where id = v_parcel.id;

  insert into public.parcel_events (parcel_id, status, reason, author_id, author_role, lat, lng, created_at)
  values (v_parcel.id, 'delivered', 'Remis au destinataire · code vérifié par le serveur', v_uid, v_role,
          case when p_lat between -90 and 90 then p_lat end,
          case when p_lng between -180 and 180 then p_lng end,
          now());

  return jsonb_build_object('ok', true);
end;
$$;

comment on function public.confirm_delivery(uuid, text, double precision, double precision) is
  'FAST EXPRESS : confirme une livraison UNIQUEMENT avec le bon code de remise (vérifié par le serveur, 5 essais / 15 min).';

revoke all on function public.confirm_delivery(uuid, text, double precision, double precision) from public, anon, authenticated;
grant execute on function public.confirm_delivery(uuid, text, double precision, double precision) to authenticated;

-- ---------------------------------------------------------------------
-- A.3 — PROCÉDURE EXCEPTIONNELLE : débloquer la saisie du code d'un colis bloqué
-- (5 codes faux). N'enregistre PAS la livraison : le livreur doit encore saisir
-- le bon code. Exécutable UNIQUEMENT par un administrateur dans le SQL Editor
-- (aucun droit pour anon / authenticated, donc inaccessible depuis l'application).
-- Usage : select public.admin_unlock_delivery_code('<id du colis>', 'Client joint par téléphone, code confirmé');
-- ---------------------------------------------------------------------
create or replace function public.admin_unlock_delivery_code(p_parcel_id uuid, p_reason text)
returns text
language plpgsql
volatile
set search_path = ''
as $$
begin
  if p_reason is null or length(btrim(p_reason)) < 10 then
    raise exception 'Motif obligatoire (10 caractères minimum)';
  end if;
  if not exists (select 1 from public.parcels p where p.id = p_parcel_id and p.status = 'in_transit') then
    raise exception 'Colis introuvable ou pas en cours de livraison';
  end if;
  insert into public.delivery_code_attempts (parcel_id, user_id, kind, reason)
  values (p_parcel_id, null, 'reset', 'Déblocage administrateur (' || current_user || ') : ' || btrim(p_reason));
  return 'Saisie du code débloquée pour ce colis';
end;
$$;

comment on function public.admin_unlock_delivery_code(uuid, text) is
  'FAST EXPRESS (administrateur, SQL Editor uniquement) : débloque la saisie du code après 5 erreurs. Motif obligatoire, tracé.';

revoke all on function public.admin_unlock_delivery_code(uuid, text) from public, anon, authenticated;

commit;

-- =====================================================================
-- VÉRIFICATIONS APRÈS 05A (lecture seule)
--   select p.proname, p.prosecdef, p.proconfig, p.proowner::regrole,
--          has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth,
--          has_function_privilege('anon', p.oid, 'EXECUTE')          as anon
--     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public' and p.proname in ('confirm_delivery', 'admin_unlock_delivery_code');
--   → confirm_delivery : prosecdef = true, auth = true, anon = false
--   → admin_unlock_delivery_code : auth = false, anon = false
--   select relrowsecurity from pg_class where oid = 'public.delivery_code_attempts'::regclass;  → true
--   select grantee, privilege_type from information_schema.role_table_grants
--    where table_name = 'delivery_code_attempts' and grantee in ('anon','authenticated');     → aucune ligne
--
-- RETOUR ARRIÈRE : voir 05-06_9_retour_arriere.sql, section R1 (après l'application).
-- =====================================================================
