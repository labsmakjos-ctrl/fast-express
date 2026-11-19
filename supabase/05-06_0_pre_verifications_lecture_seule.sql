-- =====================================================================
-- FAST EXPRESS — PRÉ-VÉRIFICATIONS (LECTURE SEULE) avant les étapes 05A, 05B, 06A, 06B
-- Ce fichier ne crée, ne modifie et ne supprime RIEN : uniquement des SELECT
-- et des fonctions de lecture du catalogue PostgreSQL (sans effet de bord).
-- Le SQL Editor de Supabase n'affiche que le DERNIER résultat : sélectionner
-- UNE requête à la fois (du « select » jusqu'au « ; ») puis « Run » (Ctrl+Entrée).
-- Conserver chaque résultat (capture ou copie) avec son numéro.
-- Aucun code de remise, nom ou téléphone n'est affiché par ces requêtes.
-- =====================================================================


-- ---------------------------------------------------------------------
-- P1 — Un utilisateur peut-il se donner le rôle manager ? (avant 05A)
-- Les fonctions 05A/06A font confiance à profiles.role.
-- ---------------------------------------------------------------------
-- P1.a Règles RLS de profiles (qui peut lire / créer / modifier quelles lignes)
select policyname, cmd, roles, permissive, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'profiles'
order by cmd, policyname;

-- P1.b1 Droits EFFECTIFS de anon / authenticated sur la table profiles et sur la colonne role
--       (tiennent compte des droits sur toute la table, par colonne et accordés à tout le monde)
select r.rolname                                                        as compte,
       has_table_privilege(r.rolname, 'public.profiles', 'INSERT')      as table_insert,
       has_table_privilege(r.rolname, 'public.profiles', 'UPDATE')      as table_update,
       has_column_privilege(r.rolname, 'public.profiles', 'role', 'INSERT') as role_insert,
       has_column_privilege(r.rolname, 'public.profiles', 'role', 'UPDATE') as role_update
from pg_roles r
where r.rolname in ('anon', 'authenticated')
order by r.rolname;

-- P1.b2 Droits ACCORDÉS sur toute la table profiles (y compris à tout le monde = PUBLIC)
select case when a.grantee = 0 then 'PUBLIC (tout le monde)' else pg_get_userbyid(a.grantee) end as beneficiaire,
       a.privilege_type as droit, a.is_grantable as peut_transmettre
from pg_class c
cross join lateral aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) a
where c.oid = 'public.profiles'::regclass
  and (a.grantee = 0 or pg_get_userbyid(a.grantee) in ('anon', 'authenticated'))
order by 1, 2;

-- P1.b3 Droits ACCORDÉS uniquement sur la colonne role (attendu : aucune ligne)
select case when a.grantee = 0 then 'PUBLIC (tout le monde)' else pg_get_userbyid(a.grantee) end as beneficiaire,
       a.privilege_type as droit
from pg_attribute att
cross join lateral aclexplode(att.attacl) a
where att.attrelid = 'public.profiles'::regclass and att.attname = 'role' and att.attacl is not null
order by 1, 2;

-- P1.c Déclencheurs existants sur profiles (un garde-fou éventuel sur le rôle)
select tgname, tgenabled as actif, pg_get_triggerdef(oid) as definition
from pg_trigger where tgrelid = 'public.profiles'::regclass and not tgisinternal;

-- P1.d Contraintes de profiles, caractère obligatoire de role / is_active, et profils sans rôle
--      (NOT NULL n'apparaît pas dans pg_constraint : il se lit dans information_schema.columns)
select conname, pg_get_constraintdef(oid) as definition
from pg_constraint where conrelid = 'public.profiles'::regclass;
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'profiles'
  and column_name in ('role', 'is_active')
order by column_name;
select count(*) filter (where role is null)       as profils_sans_role,
       count(*) filter (where is_active is false) as profils_desactives,
       count(*)                                    as total
from public.profiles;

-- P1.e Déclencheurs sur auth.users (création automatique du profil à l'inscription)
select t.tgname, t.tgenabled as actif, t.tgfoid::regprocedure as fonction_appelee,
       pg_get_triggerdef(t.oid) as definition
from pg_trigger t
where t.tgrelid = 'auth.users'::regclass and not t.tgisinternal
order by t.tgname;

-- P1.f Fonctions qui créent ou modifient des profils (appelées par un déclencheur de
--      auth.users ou de profiles, ou dont le code contient INSERT INTO / UPDATE profiles)
select p.oid::regprocedure                                        as fonction,
       p.prosecdef                                                as security_definer,
       (select string_agg(t.tgrelid::regclass::text || '.' || t.tgname, ', ')
          from pg_trigger t where t.tgfoid = p.oid and not t.tgisinternal) as declenchee_par,
       p.prosrc ~* 'raw_user_meta_data|user_metadata'             as lit_metadonnees_utilisateur,
       p.prosrc ~* 'raw_app_meta_data|app_metadata'               as lit_metadonnees_serveur,
       p.prosrc ~* '\mrole\M'                                     as mentionne_role,
       p.prosrc ~* '\mexecute\M'                                  as sql_dynamique_non_suivi,
       pg_get_functiondef(p.oid)                                  as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where p.prokind = 'f'
  and n.nspname not in ('pg_catalog', 'information_schema')
  and ( p.oid in (select t.tgfoid from pg_trigger t
                  where t.tgrelid in ('auth.users'::regclass, 'public.profiles'::regclass) and not t.tgisinternal)
     or p.prosrc ~* 'insert\s+into\s+(public\.)?"?profiles"?'
     or p.prosrc ~* 'update\s+(public\.)?"?profiles"?' )
order by 1;

-- P1.g Fonctions APPELÉES par les fonctions de déclenchement de auth.users / profiles
--      (un niveau, repérage par le nom suivi d'une parenthèse dans le code source).
--      LIMITE : PostgreSQL n'enregistre pas les appels entre fonctions PL/pgSQL ;
--      ce repérage est textuel. Il ne suit PAS : le SQL dynamique (EXECUTE),
--      les appels sur plusieurs niveaux, les noms construits à l'exécution,
--      ni les fonctions en langage C ou dans des extensions.
--      Complément : P1.f liste déjà TOUTE fonction dont le code écrit dans
--      profiles (INSERT INTO / UPDATE profiles), qu'elle soit appelée ou non.
with declencheurs as (
  select distinct t.tgfoid as oid
  from pg_trigger t
  where t.tgrelid in ('auth.users'::regclass, 'public.profiles'::regclass) and not t.tgisinternal
)
select appelant.oid::regprocedure                                   as fonction_de_declenchement,
       appelee.oid::regprocedure                                    as fonction_appelee_probable,
       appelee.prosecdef                                            as appelee_security_definer,
       appelee.prosrc ~* 'insert\s+into\s+(public\.)?"?profiles"?|update\s+(public\.)?"?profiles"?'
                                                                    as appelee_ecrit_profiles,
       appelee.prosrc ~* '\mrole\M'                                 as appelee_mentionne_role,
       appelee.prosrc ~* 'raw_user_meta_data|user_metadata'         as appelee_lit_metadonnees_utilisateur,
       appelee.prosrc ~* '\mexecute\M'                              as appelee_sql_dynamique_non_suivi
from declencheurs dcl
join pg_proc appelant on appelant.oid = dcl.oid
join pg_proc appelee on appelee.oid <> appelant.oid and appelee.prokind in ('f', 'p')
join pg_namespace n on n.oid = appelee.pronamespace
where n.nspname not in ('pg_catalog', 'information_schema')
  and appelant.prosrc ~* ('\m' || appelee.proname || '\s*\(')
order by 1, 2;
-- ⛔ STOP (lire les explications de P1 ci-dessous avant de continuer) si :
--   • P1.b1 : anon a un seul « true » ;
--   • P1.b1 : authenticated a role_update = true ET une règle UPDATE (ou ALL) de P1.a
--     autorise un utilisateur à modifier sa propre ligne sans bloquer le rôle,
--     sans garde-fou en P1.c ;
--   • P1.b1 : authenticated a role_insert = true ET une règle INSERT (ou ALL) de P1.a
--     autorise un utilisateur à créer sa propre ligne sans imposer le rôle ;
--   • P1.f : une fonction déclenchée à l'inscription lit le rôle dans les
--     métadonnées UTILISATEUR (lit_metadonnees_utilisateur = true et mentionne_role = true) :
--     n'importe qui pourrait s'inscrire comme manager (inscription libre activée) ;
--   • P1.g : une fonction appelée écrit dans profiles (appelee_ecrit_profiles = true) et
--     la fonction de déclenchement lit les métadonnées utilisateur (P1.f) ou l'appelée
--     mentionne role : lire les deux définitions avant de conclure ;
--   • P1.f ou P1.g : sql_dynamique_non_suivi = true sur une fonction de déclenchement :
--     l'analyse automatique ne suffit pas, lire la définition complète.


-- ---------------------------------------------------------------------
-- P2 — Vues susceptibles d'exposer confirmation_code (avant 06B)
-- Une vue normale s'exécute avec les droits de son PROPRIÉTAIRE : elle peut
-- contourner la protection par colonne, sauf si elle est en security_invoker.
-- Toutes les vues et vues matérialisées qui dépendent de parcels, quel que soit
-- leur propriétaire, avec leur accessibilité réelle.
-- ---------------------------------------------------------------------
-- P2.a Schémas exposés par l'API (PostgREST), SI la configuration est lisible dans la base.
--      Sur Supabase, elle est souvent enregistrée comme réglage du rôle « authenticator »
--      (pgrst.db_schemas). AUCUNE ligne = configuration non lisible ici (elle peut être
--      gérée hors de la base) : se reporter à Supabase › Project Settings › API › Exposed schemas.
select r.rolname as role_api, coalesce(d.datname, '(toutes les bases)') as base, reglage
from pg_db_role_setting s
join pg_roles r on r.oid = s.setrole
left join pg_database d on d.oid = s.setdatabase
cross join lateral unnest(s.setconfig) as reglage
where r.rolname = 'authenticator' and reglage like 'pgrst.%'
order by reglage;

-- P2.b Vues qui dépendent de parcels, DIRECTEMENT OU PAR D'AUTRES VUES (récursif, 25 niveaux
--      au plus), et leur accessibilité. Une ligne par vue ou vue matérialisée dépendante.
--
--      Source : les dépendances que PostgreSQL enregistre pour chaque vue / vue matérialisée
--      (pg_depend sur la règle de la vue) : tables et vues lues, colonne par colonne.
--
--      utilise_code_directement : la vue lit la colonne parcels.confirmation_code
--        (dans le SELECT, un WHERE, une jointure, un alias… : dépendance exacte).
--      conversion_ligne_entiere_possible : la définition de la vue convertit une ligne
--        entière (row_to_json, to_json, to_jsonb, json(b)_build_object, hstore…) : le code
--        pourrait y être inclus sans être nommé. Repérage TEXTUEL, à vérifier à la main.
--      herite_code_indirectement : la vue lit une vue (ou une chaîne de vues) marquée par
--        l'un des deux indicateurs ci-dessus. PostgreSQL ne mémorise pas quelle colonne
--        d'une vue provient de quelle colonne d'origine : toute vue qui lit une vue marquée
--        est marquée à son tour (prudent : peut signaler une vue qui n'expose pas le code).
--      chemin_contient_proprietaire : au moins un maillon de la chaîne depuis parcels
--        s'exécute avec les droits de son propriétaire (vue sans security_invoker,
--        ou vue matérialisée) : la protection par colonne peut être contournée.
--      schema_expose_selon_config : d'après P2.a ; VIDE si la configuration n'est pas lisible.
--      schema_public_ou_graphql_partiel : simple indice, PAS une preuve.
with recursive
code_col as (
  select attnum from pg_attribute
  where attrelid = 'public.parcels'::regclass and attname = 'confirmation_code'
),
info as (                                   -- toutes les vues / vues matérialisées hors catalogue système
  select c.oid as vue,
         c.relkind,
         c.relkind = 'm'
           or coalesce((select o.option_value from pg_options_to_table(c.reloptions) o
                        where o.option_name = 'security_invoker'), 'false')
              not in ('true', 'on', 'yes', '1')                               as droits_proprietaire,
         pg_get_viewdef(c.oid) ~* '(row_to_json|to_jsonb?|jsonb?_build_object|json_object|hstore|record_out)\s*\('
                                                                              as conversion_ligne_entiere
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where c.relkind in ('v', 'm') and n.nspname not in ('pg_catalog', 'information_schema')
),
aretes as (                                 -- vue -> table ou vue lue (colonne lue ; 0 = la relation elle-même)
  select distinct rw.ev_class as vue, d.refobjid as source, d.refobjsubid as colonne
  from pg_rewrite rw
  join info i on i.vue = rw.ev_class
  join pg_depend d on d.classid = 'pg_rewrite'::regclass and d.objid = rw.oid
                  and d.refclassid = 'pg_class'::regclass and d.refobjid <> rw.ev_class
),
marquees(vue, niveau, chemin, chemin_txt, proprietaire, direct, conversion) as (
  -- niveau 1 : vues qui lisent parcels.confirmation_code, ou qui lisent parcels et convertissent une ligne entière
  select distinct a.vue, 1, array[a.vue], a.vue::regclass::text, i.droits_proprietaire,
         a.colonne = (select attnum from code_col), i.conversion_ligne_entiere
  from aretes a join info i on i.vue = a.vue
  where a.source = 'public.parcels'::regclass
    and (a.colonne = (select attnum from code_col) or i.conversion_ligne_entiere)
  union all
  -- niveaux suivants : toute vue qui lit une vue marquée
  select a.vue, m.niveau + 1, m.chemin || a.vue, m.chemin_txt || ' → ' || a.vue::regclass::text,
         m.proprietaire or i.droits_proprietaire, false, m.conversion or i.conversion_ligne_entiere
  from marquees m
  join (select distinct vue, source from aretes) a on a.source = m.vue
  join info i on i.vue = a.vue
  where a.vue <> all (m.chemin) and m.niveau < 25
),
dependantes(vue, niveau) as (                -- toutes les vues qui dépendent de parcels, à tout niveau
  select distinct a.vue, 1 from aretes a where a.source = 'public.parcels'::regclass
  union
  select a.vue, d.niveau + 1
  from dependantes d join (select distinct vue, source from aretes) a on a.source = d.vue
  where d.niveau < 25
),
cfg as (
  select string_to_array(replace(substr(reglage, length('pgrst.db_schemas=') + 1), ' ', ''), ',') as schemas
  from pg_db_role_setting s
  join pg_roles r on r.oid = s.setrole
  cross join lateral unnest(s.setconfig) as reglage
  where r.rolname = 'authenticator' and reglage like 'pgrst.db_schemas=%'
  limit 1
),
synthese as (
  select d.vue,
         min(d.niveau)                                                       as niveau_min,
         coalesce(bool_or(m.niveau = 1 and m.direct), false)                 as utilise_code_directement,
         coalesce(bool_or(m.conversion), false)                              as conversion_ligne_entiere_possible,
         coalesce(bool_or(m.niveau > 1), false)                              as herite_code_indirectement,
         coalesce(bool_or(m.proprietaire), false)                            as chemin_contient_proprietaire,
         (array_agg(m.chemin_txt order by m.niveau) filter (where m.chemin_txt is not null))[1] as exemple_chemin
  from (select vue, min(niveau) as niveau from dependantes group by vue) d
  left join marquees m on m.vue = d.vue
  group by d.vue
)
select s.vue::regclass                                                        as vue,
       case c.relkind when 'v' then 'vue' when 'm' then 'vue matérialisée' end as type,
       s.niveau_min                                                           as niveau_depuis_parcels,
       pg_get_userbyid(c.relowner)                                            as proprietaire,
       not i.droits_proprietaire                                              as security_invoker,
       s.utilise_code_directement,
       s.conversion_ligne_entiere_possible,
       s.herite_code_indirectement,
       s.chemin_contient_proprietaire,
       coalesce('parcels → ' || s.exemple_chemin, '(aucun lien repéré avec le code)') as exemple_de_chemin,
       (select n.nspname = any (cfg.schemas) from cfg)                        as schema_expose_selon_config,
       n.nspname in ('public', 'graphql_public')                              as schema_public_ou_graphql_partiel,
       has_table_privilege('anon', c.oid, 'SELECT')                           as lisible_par_anon,
       has_table_privilege('authenticated', c.oid, 'SELECT')                  as lisible_par_authenticated
from synthese s
join pg_class c on c.oid = s.vue
join pg_namespace n on n.oid = c.relnamespace
join info i on i.vue = s.vue
order by s.niveau_min, 1;
-- ⛔ STOP si une ligne a :
--      (utilise_code_directement OU conversion_ligne_entiere_possible OU herite_code_indirectement = true)
--    ET (lisible_par_anon = true OU lisible_par_authenticated = true)
--    ET chemin_contient_proprietaire = true
--    — QUEL QUE SOIT le schéma : l'exposition par l'API n'est que partiellement
--    vérifiable, et une vue non exposée peut être lue par une fonction qui, elle, l'est.
-- ⚠️ RÉSULTAT INCOMPLET PAR NATURE : une absence de ligne ou de ⛔ ne GARANTIT PAS
--    l'absence d'exposition. Ne sont PAS suivis : les vues qui lisent parcels au travers
--    d'une FONCTION (la dépendance porte sur la fonction, pas sur parcels), le SQL
--    dynamique, les tables qui recopient le code (déclencheurs, journaux), les tables
--    étrangères et les autres bases. P3 (fonctions) doit aussi être sans ⛔.


-- ---------------------------------------------------------------------
-- P3 — Fonctions SECURITY DEFINER et fonctions qui lisent confirmation_code (avant 06B)
-- ---------------------------------------------------------------------
select n.nspname as schema, p.proname as fonction, pg_get_function_identity_arguments(p.oid) as arguments,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as executable_par_authenticated,
       has_function_privilege('anon', p.oid, 'EXECUTE')          as executable_par_anon
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where p.prosecdef and n.nspname not in ('pg_catalog', 'information_schema')
order by 1, 2;
select n.nspname as schema, p.proname as fonction
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname not in ('pg_catalog', 'information_schema')
  and position('confirmation_code' in p.prosrc) > 0
order by 1, 2;
-- Attendu : seulement les fonctions FAST EXPRESS (confirm_delivery, get_delivery_code,
-- parcels_set_confirmation_code, admin_force_delivery) une fois créées.
-- ⛔ STOP si une autre fonction exécutable par anon/authenticated renvoie confirmation_code.


-- ---------------------------------------------------------------------
-- P4 — Colonnes exactes de parcels et droits explicites par colonne (avant 06B)
-- ---------------------------------------------------------------------
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'parcels'
order by ordinal_position;
-- Attendu EXACTEMENT ces 19 colonnes (l'étape 06B s'arrête d'elle-même sinon) :
--   id, tracking_number, tracking_token, confirmation_code, client_name, client_phone,
--   delivery_address, status, driver_id, partner_id, delivery_lat, delivery_lng,
--   proof_photo_url, postponed_date, created_at, updated_at, delivered_at,
--   postponed_reason, cancellation_reason
select attname as colonne, attacl as droits_par_colonne
from pg_attribute
where attrelid = 'public.parcels'::regclass and attnum > 0 and not attisdropped and attacl is not null;
-- Attendu : aucune ligne (pas encore de droits par colonne).


-- ---------------------------------------------------------------------
-- P5 — Droits actuels sur parcels → INSTRUCTIONS EXACTES DE RETOUR ARRIÈRE de 06B
-- Une ligne pour anon, authenticated et PUBLIC (tout le monde), même sans droit.
-- Droits « par défaut » : Supabase les inscrit sur la table à sa création (ils
-- apparaissent donc ici) ; si la table n'a jamais reçu de droit explicite, les
-- droits implicites de PostgreSQL (acldefault) sont utilisés.
-- ⚠️ CONSERVER la colonne instruction_de_retour : c'est elle qu'il faudra exécuter.
-- ---------------------------------------------------------------------
with acl as (
  select a.grantee, a.privilege_type, a.is_grantable
  from pg_class c
  cross join lateral aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) a
  where c.oid = 'public.parcels'::regclass
),
cibles(nom, oid_role, cible) as (
  select 'anon', r.oid, 'anon' from pg_roles r where r.rolname = 'anon'
  union all
  select 'authenticated', r.oid, 'authenticated' from pg_roles r where r.rolname = 'authenticated'
  union all
  select 'PUBLIC (tout le monde)', 0::oid, 'public'
)
select t.nom as beneficiaire,
       coalesce(string_agg(a.privilege_type || case when a.is_grantable then ' (peut transmettre)' else '' end,
                           ', ' order by a.privilege_type), 'aucun droit') as droits_actuels,
       concat_ws(' ',
         case when count(a.privilege_type) filter (where not a.is_grantable) > 0
              then format('grant %s on table public.parcels to %s;',
                          string_agg(a.privilege_type, ', ' order by a.privilege_type) filter (where not a.is_grantable),
                          t.cible) end,
         case when count(a.privilege_type) filter (where a.is_grantable) > 0
              then format('grant %s on table public.parcels to %s with grant option;',
                          string_agg(a.privilege_type, ', ' order by a.privilege_type) filter (where a.is_grantable),
                          t.cible) end,
         case when count(a.privilege_type) = 0
              then format('revoke all on table public.parcels from %s;', t.cible) end
       ) as instruction_de_retour,
       case when t.cible = 'public'
             and count(a.privilege_type) filter (where a.privilege_type in ('SELECT', 'INSERT', 'UPDATE')) > 0
            then '⛔ PUBLIC a des droits SELECT/INSERT/UPDATE : 06B ne protégerait pas la colonne'
            else '' end as alerte
from cibles t
left join acl a on a.grantee = t.oid_role
group by t.nom, t.cible
order by t.nom;


-- ---------------------------------------------------------------------
-- P6 — Format des codes des colis non terminés (aucun code affiché)
-- ---------------------------------------------------------------------
select count(*) filter (where btrim(confirmation_code) ~ '^[0-9]{4}$')        as codes_ok,
       count(*) filter (where confirmation_code is null)                       as codes_vides,
       count(*) filter (where confirmation_code is not null
                          and btrim(confirmation_code) !~ '^[0-9]{4}$')        as autres_formats
from public.parcels
where status in ('pending', 'picked_up', 'in_transit', 'postponed');
-- Si codes_vides ou autres_formats > 0 : ces colis ne pourront être livrés que par
-- la procédure exceptionnelle admin_force_delivery (étape 05B).


-- ---------------------------------------------------------------------
-- P7 — Règles RLS de parcels qui mentionnent confirmation_code (avant 06B ; attendu : aucune)
-- ---------------------------------------------------------------------
select policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'parcels'
  and (coalesce(qual, '') ilike '%confirmation_code%' or coalesce(with_check, '') ilike '%confirmation_code%');


-- ---------------------------------------------------------------------
-- P8 — Temps réel : tables publiées et identité de réplication (avant 06B, pour le test Realtime)
-- ---------------------------------------------------------------------
select pubname, schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
  and tablename in ('parcels', 'parcel_events', 'drivers', 'driver_locations');
select relname, relreplident from pg_class where oid = 'public.parcels'::regclass;


-- ---------------------------------------------------------------------
-- P9 — Contraintes de parcel_events (avant 05A/05B : auteur et statut des étapes)
-- ---------------------------------------------------------------------
select conname, pg_get_constraintdef(oid) as definition
from pg_constraint where conrelid = 'public.parcel_events'::regclass;
select column_name, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'parcel_events'
  and column_name in ('author_id', 'author_role', 'status', 'created_at');
-- Attendu : status accepte 'delivered' ; author_role accepte 'manager' et 'driver' ;
-- author_id peut être vide (utilisé par admin_force_delivery).


-- ---------------------------------------------------------------------
-- P10 — Conflits de noms (avant chaque étape ; attendu : aucune ligne avant 05A)
-- ---------------------------------------------------------------------
select n.nspname, p.proname
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('confirm_delivery', 'get_delivery_code', 'parcels_guard_delivered',
                    'parcels_set_confirmation_code', 'admin_force_delivery', 'admin_unlock_delivery_code');
select tgname from pg_trigger where tgrelid = 'public.parcels'::regclass and not tgisinternal;
select to_regclass('public.delivery_code_attempts') as table_des_essais;
