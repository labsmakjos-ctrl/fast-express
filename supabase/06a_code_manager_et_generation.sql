-- =====================================================================
-- ÉTAPE 06A — PROPOSITION NON EXÉCUTÉE. À valider avant toute exécution.
-- FAST EXPRESS : préparation de la protection du code de remise.
--
-- Contenu :
--   • fonction public.get_delivery_code(p_parcel_id) : le code, pour un MANAGER
--     actif uniquement (livreur, partenaire, rôle vide, inconnu : rien) ;
--   • déclencheur : code créé PAR LA BASE pour un nouveau colis QUAND IL MANQUE
--     (générateur fort gen_random_uuid()). Les codes existants ne sont jamais modifiés.
--
-- Effet sur l'application actuelle : AUCUN. Elle envoie encore son propre code,
-- qui est conservé ; la base ne complète que les codes manquants.
--
-- PRÉREQUIS :
--   • P1 sans ⛔ (la fonction fait confiance à profiles.role) ;
--   • P10 : aucun conflit de nom.
-- Exécutable seul (ne dépend pas de 05A/05B).
-- =====================================================================
begin;

do $$
begin
  if to_regclass('public.parcels') is null or to_regclass('public.profiles') is null then
    raise exception '06A annulée : tables parcels / profiles introuvables';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- A.1 — Code d'un colis non terminé, pour un manager actif uniquement
-- ---------------------------------------------------------------------
create or replace function public.get_delivery_code(p_parcel_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid    uuid := auth.uid();
  v_role   text;
  v_active boolean;
  v_code   text;
begin
  if v_uid is null then
    return null;
  end if;
  select pr.role, pr.is_active into v_role, v_active
  from public.profiles pr where pr.id = v_uid;
  -- rôle vide (NULL) ou différent de manager : refus
  if not found or v_active is false or v_role is distinct from 'manager' then
    return null;
  end if;
  select btrim(p.confirmation_code) into v_code
  from public.parcels p
  where p.id = p_parcel_id
    and p.status in ('pending', 'picked_up', 'in_transit', 'postponed');
  return v_code;                                  -- null si colis livré, annulé ou introuvable
end;
$$;

comment on function public.get_delivery_code(uuid) is
  'FAST EXPRESS : code de remise d''un colis non terminé, réservé aux managers actifs.';

revoke all on function public.get_delivery_code(uuid) from public, anon, authenticated;
grant execute on function public.get_delivery_code(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- A.2 — Code créé par la base pour un NOUVEAU colis quand il manque
-- 4 chiffres de 1000 à 9999 ; 8 caractères hexadécimaux aléatoires d'un UUID v4
-- (gen_random_uuid() = générateur cryptographique de PostgreSQL).
-- Déclencheur BEFORE INSERT uniquement : les colis existants ne sont jamais touchés.
-- ---------------------------------------------------------------------
create or replace function public.parcels_set_confirmation_code()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.confirmation_code is null or btrim(new.confirmation_code) = '' then
    new.confirmation_code :=
      (1000 + (('x' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))::bit(32)::bigint % 9000))::text;
  end if;
  return new;
end;
$$;

revoke all on function public.parcels_set_confirmation_code() from public, anon, authenticated;

drop trigger if exists parcels_set_confirmation_code on public.parcels;
create trigger parcels_set_confirmation_code
  before insert on public.parcels
  for each row execute function public.parcels_set_confirmation_code();

commit;

-- =====================================================================
-- VÉRIFICATIONS APRÈS 06A (lecture seule)
--   select p.prosecdef, p.proconfig,
--          has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth,
--          has_function_privilege('anon', p.oid, 'EXECUTE')          as anon
--     from pg_proc p where p.oid = 'public.get_delivery_code(uuid)'::regprocedure;
--     → prosecdef = true, proconfig = {search_path=""}, auth = true, anon = false
--   select public.get_delivery_code('00000000-0000-4000-8000-000000000000');  → null (SQL Editor : pas de compte)
--   Contrôle de la formule SANS rien écrire (10 tirages, attendus entre 1000 et 9999) :
--   select (1000 + (('x' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))::bit(32)::bigint % 9000))::text
--     from generate_series(1, 10);
--
-- RETOUR ARRIÈRE : voir 05-06_9_retour_arriere.sql, section R2 (après l'application).
-- =====================================================================
