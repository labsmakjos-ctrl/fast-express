-- =====================================================================
-- ÉTAPE 08 — PROPOSITION NON EXÉCUTÉE. À valider avant toute exécution.
-- FAST EXPRESS :
--   08.1  le livreur enregistre SA position GPS (et jamais celle d'un autre) ;
--   08.2  la création des colis est réservée au MANAGER, dans la base elle-même.
--
-- Principe : RLS reste ACTIVÉ. Aucune règle existante n'est supprimée ni modifiée.
-- On AJOUTE des règles :
--   • une règle « permissive » qui AUTORISE ce qui doit l'être (le livreur, pour sa fiche) ;
--   • des règles « restrictives » qui s'ajoutent en ET à toutes les autres : même si une règle
--     existante était trop large, elles empêchent l'écriture au nom d'un autre livreur et la
--     création de colis par un non-manager.
-- Aucune donnée n'est lue, créée, modifiée ni supprimée par 08.1 / 08.2.
--
-- ORDRE : 08.0 (lecture seule, à me transmettre) → 08.0-T (test sans écriture) → 08.1 → 08.2
--         → tests → 08.9 en cas de problème.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 08.0 — DIAGNOSTIC (lecture seule : SELECT uniquement)
-- ---------------------------------------------------------------------
-- a) RLS active ? (attendu : true pour les deux)
select c.relname as table_, c.relrowsecurity as rls_active, c.relforcerowsecurity as rls_forcee
from pg_class c where c.oid in ('public.driver_locations'::regclass, 'public.parcels'::regclass);

-- b) Règles actuelles (À CONSERVER). « permissive = RESTRICTIVE » = règle qui s'ajoute en ET.
select tablename, policyname, permissive, cmd, roles, qual as condition_using, with_check
from pg_policies
where schemaname = 'public' and tablename in ('driver_locations', 'parcels')
order by tablename, cmd, policyname;

-- c) Lecture automatique de la cause probable du refus GPS (une ligne par règle d'INSERTION)
select policyname, permissive, roles,
  case
    when with_check is null and qual is null then 'aucune condition (règle très large)'
    when coalesce(with_check, qual) ~* 'driver_id\s*=\s*\(?\s*(select\s+)?auth\.uid\(\)'
      or coalesce(with_check, qual) ~* 'auth\.uid\(\)\s*\)?\s*=\s*driver_id'
      then '⛔ CAUSE PROBABLE : compare driver_id (fiche drivers) à auth.uid() (compte) — jamais égaux'
    when coalesce(with_check, qual) ~* 'is_on_duty' then '⚠ exige « en service » : refus si la position arrive avant/après le service'
    when coalesce(with_check, qual) ~* 'manager' and coalesce(with_check, qual) !~* 'driver' then '⛔ réservée au manager : le livreur est refusé'
    else 'à lire : condition ci-contre'
  end as lecture,
  coalesce(with_check, qual) as condition
from pg_policies
where schemaname = 'public' and tablename = 'driver_locations' and cmd in ('INSERT', 'ALL');
-- Aucune ligne → cause : AUCUNE règle n'autorise l'insertion (RLS refuse tout par défaut).

-- d) Droits de table (attendu : INSERT et SELECT pour authenticated ; si INSERT absent,
--    l'erreur serait « permission denied », pas « row-level security »)
select table_name, grantee, string_agg(privilege_type, ', ' order by privilege_type) as droits
from information_schema.role_table_grants
where table_schema = 'public' and table_name in ('driver_locations', 'parcels')
  and grantee in ('anon', 'authenticated', 'PUBLIC')
group by table_name, grantee order by table_name, grantee;

-- e) Déclencheurs sur driver_locations (un déclencheur peut modifier driver_id avant le contrôle)
select tgname, tgenabled, pg_get_triggerdef(oid) as definition
from pg_trigger where tgrelid = 'public.driver_locations'::regclass and not tgisinternal;

-- f) Vers quoi pointe driver_id ? (attendu : public.drivers(id), PAS profiles / auth.users)
select conname, pg_get_constraintdef(oid) as definition
from pg_constraint where conrelid = 'public.driver_locations'::regclass and contype = 'f';

-- g) Le correctif « profiles » (script A, rôle non modifiable par l'utilisateur) est-il en place ?
--    (attendu : 1 ligne, tgenabled = O). OBLIGATOIRE avant 08.2.
select t.tgname, t.tgenabled from pg_trigger t join pg_proc f on f.oid = t.tgfoid
where t.tgrelid = 'public.profiles'::regclass and f.proname = 'profiles_guard_role';

-- h) Fiches livreur liées à un compte (identifiants seulement)
select d.id as driver_id, d.profile_id, p.role, p.is_active
from public.drivers d left join public.profiles p on p.id = d.profile_id order by d.id;


-- ---------------------------------------------------------------------
-- 08.0-T — CONFIRMER LA CAUSE SANS RIEN ENREGISTRER (facultatif)
-- Rejoue l'insertion du livreur de TEST avec ses droits, puis ANNULE tout (rollback).
-- Remplacer les deux valeurs < > par les identifiants de la requête h) (livreur de TEST).
-- ---------------------------------------------------------------------
-- begin;
-- set local role authenticated;
-- select set_config('request.jwt.claims',
--   json_build_object('sub', '<profile_id du livreur de test>', 'role', 'authenticated')::text, true);
-- insert into public.driver_locations (driver_id, lat, lng, accuracy, recorded_at)
-- values ('<driver_id de ce même livreur>', 0.39, 9.45, 10, now());
-- rollback;
--  → « new row violates row-level security policy » : refus reproduit (cause : voir c).
--  → « INSERT 0 1 » puis rollback : la règle accepte ; chercher ailleurs (mauvais driver_id envoyé).


-- ---------------------------------------------------------------------
-- 08.1 — GPS : le livreur enregistre uniquement SA position
-- Pas de droit général d'écriture : seulement l'insertion, seulement pour la fiche drivers
-- liée au compte connecté, seulement pour un livreur actif. Aucune modification ni
-- suppression de position n'est ajoutée.
-- ---------------------------------------------------------------------
-- begin;
--
-- do $$
-- begin
--   if not (select relrowsecurity from pg_class where oid = 'public.driver_locations'::regclass) then
--     raise exception '08.1 annulée : RLS n''est pas active sur driver_locations';
--   end if;
--   if not has_table_privilege('authenticated', 'public.driver_locations', 'INSERT') then
--     raise exception '08.1 annulée : authenticated n''a pas le droit INSERT (voir 08.0 d)';
--   end if;
--   if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'driver_locations'
--              and policyname in ('Livreur enregistre sa propre position', 'Position GPS : uniquement par son livreur')) then
--     raise exception '08.1 annulée : ces règles existent déjà';
--   end if;
-- end $$;
--
-- -- Autorise : le livreur actif, pour SA fiche drivers (driver_id = drivers.id, pas auth.uid())
-- create policy "Livreur enregistre sa propre position" on public.driver_locations
--   as permissive for insert to authenticated
--   with check (
--     exists (
--       select 1 from public.drivers d
--       join public.profiles p on p.id = d.profile_id
--       where d.id = driver_locations.driver_id
--         and d.profile_id = (select auth.uid())
--         and p.role = 'driver' and p.is_active = true
--     )
--   );
--
-- -- Interdit tout le reste, même si une autre règle d'insertion était trop large
-- create policy "Position GPS : uniquement par son livreur" on public.driver_locations
--   as restrictive for insert to public
--   with check (
--     exists (
--       select 1 from public.drivers d
--       join public.profiles p on p.id = d.profile_id
--       where d.id = driver_locations.driver_id
--         and d.profile_id = (select auth.uid())
--         and p.role = 'driver' and p.is_active = true
--     )
--   );
--
-- commit;
--
-- Remarques :
--  • La lecture des positions n'est PAS modifiée : le manager garde ses droits actuels ;
--    le partenaire n'a toujours aucun accès à la table (sa carte passe par track_parcel).
--  • Les sous-requêtes lisent drivers et profiles avec les droits du livreur : il voit déjà
--    sa propre fiche et son propre profil (l'application les lit à la connexion).
--  • La règle défectueuse éventuelle (08.0 c) n'est PAS supprimée : devenue inutile, elle
--    pourra être retirée plus tard, sur décision, après vérification.


-- ---------------------------------------------------------------------
-- 08.2 — Création des colis réservée au MANAGER (dans la base)
-- Règle restrictive : s'ajoute en ET aux règles existantes. Le manager garde sa règle
-- actuelle de création ; tout autre compte (partenaire, livreur, visiteur) est refusé,
-- y compris par une requête directe à l'API.
-- ---------------------------------------------------------------------
-- begin;
--
-- do $$
-- begin
--   if not (select relrowsecurity from pg_class where oid = 'public.parcels'::regclass) then
--     raise exception '08.2 annulée : RLS n''est pas active sur parcels';
--   end if;
--   -- sans le correctif profiles, un compte pourrait se déclarer manager et contourner la règle
--   if not exists (select 1 from pg_trigger t join pg_proc f on f.oid = t.tgfoid
--                  where t.tgrelid = 'public.profiles'::regclass and f.proname = 'profiles_guard_role'
--                    and t.tgenabled = 'O') then
--     raise exception '08.2 annulée : appliquer d''abord le correctif profiles (script A)';
--   end if;
--   if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'parcels'
--              and policyname = 'Création des colis : manager uniquement') then
--     raise exception '08.2 annulée : la règle existe déjà';
--   end if;
-- end $$;
--
-- create policy "Création des colis : manager uniquement" on public.parcels
--   as restrictive for insert to public
--   with check (
--     exists (select 1 from public.profiles p
--             where p.id = (select auth.uid()) and p.role = 'manager' and p.is_active = true)
--   );
--
-- commit;


-- ---------------------------------------------------------------------
-- TESTS APRÈS 08.1 / 08.2 (comptes et données de TEST uniquement)
-- Dans l'application (?mode=supabase), console F12 :
--   const sb = window.supabase.createClient(FE_CONFIG.supabaseUrl, FE_CONFIG.supabaseAnonKey);
--  1. Compte LIVREUR de test : prendre son service → plus d'erreur « row-level security » ;
--     Table Editor › driver_locations : une ligne pour SON driver_id, puis une toutes les 2 min.
--  2. Même compte : (await sb.from('driver_locations').insert({driver_id:'<AUTRE driver_id>',lat:0.39,lng:9.45,recorded_at:new Date().toISOString()})).error
--       → « new row violates row-level security policy »
--  3. Compte PARTENAIRE : (await sb.from('parcels').insert({tracking_number:'FE-TEST-RLS',client_name:'Test',client_phone:'',delivery_address:'x',status:'pending',partner_id:'<sa fiche>'})).error
--       → « new row violates row-level security policy »   (rien n'est créé)
--  4. Compte MANAGER : créer un colis de test pour ce partenaire depuis l'application → accepté ;
--     il apparaît dans l'espace du partenaire (au plus tard 2 minutes).
--  5. Manager : carte des livreurs → la position du livreur de test s'affiche.
--  6. Partenaire : « Suivi en direct » → position du livreur pour SES colis en livraison.
-- Supprimer ensuite le colis de test depuis le Table Editor si besoin (décision manuelle).


-- ---------------------------------------------------------------------
-- 08.9 — RETOUR ARRIÈRE (tout en commentaire ; aucune donnée touchée)
-- ---------------------------------------------------------------------
-- begin;
-- drop policy if exists "Position GPS : uniquement par son livreur" on public.driver_locations;
-- drop policy if exists "Livreur enregistre sa propre position" on public.driver_locations;
-- drop policy if exists "Création des colis : manager uniquement" on public.parcels;
-- commit;
