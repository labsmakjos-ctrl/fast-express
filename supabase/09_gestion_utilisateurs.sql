-- =====================================================================
-- ÉTAPE 09 — GESTION DES UTILISATEURS — PROPOSITION NON EXÉCUTÉE
-- Aucune nouvelle table. La fonction serveur admin-users réutilise :
--   auth.users (compte de connexion), profiles (rôle, actif), drivers, partners.
-- Aucune règle RLS n'est modifiée : la fonction agit côté serveur (service_role),
-- après avoir vérifié que l'appelant est un manager actif.
--
-- 09.0 : vérifications en LECTURE SEULE (à lancer et à me transmettre).
-- 09.1 : FACULTATIF, uniquement si 09.0 c) montre qu'il manque l'unicité ET
--        si 09.0 d) ne montre aucun doublon.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 09.0 — VÉRIFICATIONS (SELECT uniquement)
-- ---------------------------------------------------------------------
-- a) Colonnes utilisées par la fonction (attendu : toutes présentes)
select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and (table_name, column_name) in (
    ('profiles','id'),('profiles','full_name'),('profiles','phone'),('profiles','role'),('profiles','is_active'),
    ('drivers','id'),('drivers','profile_id'),('drivers','vehicle_type'),('drivers','vehicle_plate'),
    ('drivers','zone'),('drivers','is_on_duty'),
    ('partners','id'),('partners','profile_id'),('partners','company_name'),('partners','contact_name'),
    ('partners','contact_phone'),('partners','contact_email'))
order by table_name, column_name;

-- b) Colonnes OBLIGATOIRES sans valeur par défaut que la fonction ne remplit pas
--    (attendu : aucune ligne ; sinon la création échouerait → me transmettre le résultat)
select table_name, column_name
from information_schema.columns
where table_schema = 'public' and table_name in ('profiles', 'drivers', 'partners')
  and is_nullable = 'NO' and column_default is null
  and (table_name, column_name) not in (
    ('profiles','id'),('profiles','role'),('profiles','full_name'),('profiles','phone'),('profiles','is_active'),
    ('drivers','profile_id'),('drivers','vehicle_type'),('drivers','zone'),
    ('partners','company_name'),('partners','contact_name'),('partners','contact_phone'),('partners','contact_email'),
    ('partners','profile_id'));

-- c) Un compte = une seule fiche : profile_id est-il unique ? (attendu : une ligne par table)
select conrelid::regclass as table_, conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid in ('public.drivers'::regclass, 'public.partners'::regclass) and contype in ('u', 'p', 'f')
order by 1, 2;
select tablename, indexname, indexdef from pg_indexes
where schemaname = 'public' and tablename in ('drivers', 'partners') and indexdef ilike '%(profile_id)%';

-- d) Doublons éventuels (attendu : aucune ligne)
select 'drivers' as table_, profile_id, count(*) from public.drivers where profile_id is not null group by profile_id having count(*) > 1
union all
select 'partners', profile_id, count(*) from public.partners where profile_id is not null group by profile_id having count(*) > 1;

-- e) Garde-fou des rôles (script A) en place ? (attendu : 1 ligne, tgenabled = O)
select t.tgname, t.tgenabled from pg_trigger t join pg_proc f on f.oid = t.tgfoid
where t.tgrelid = 'public.profiles'::regclass and f.proname = 'profiles_guard_role';

-- f) Déclencheurs sur auth.users (attendu : aucun ; un déclencheur qui crée lui-même
--    un profil entrerait en conflit avec la fonction)
select tgname, pg_get_triggerdef(oid) from pg_trigger where tgrelid = 'auth.users'::regclass and not tgisinternal;

-- g) Contrainte sur profiles.role (attendu : manager / driver / partner)
select conname, pg_get_constraintdef(oid) from pg_constraint
where conrelid = 'public.profiles'::regclass and contype = 'c';


-- ---------------------------------------------------------------------
-- 09.1 — FACULTATIF : unicité de profile_id (si absente en c) ET aucun doublon en d))
-- Empêche qu'un même compte soit lié à deux fiches. Aucune donnée modifiée.
-- ---------------------------------------------------------------------
-- create unique index concurrently if not exists drivers_profile_id_key on public.drivers (profile_id);
-- create unique index concurrently if not exists partners_profile_id_key on public.partners (profile_id);
--   (lancer chaque ligne SEULE, hors transaction ; retour arrière :
--    drop index concurrently if exists public.drivers_profile_id_key;
--    drop index concurrently if exists public.partners_profile_id_key;)
