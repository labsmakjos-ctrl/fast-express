-- =====================================================================
-- FAST EXPRESS : inspection de la base Supabase (LECTURE SEULE)
-- Ce script ne fait que LIRE la description de la base.
-- Il ne crée, ne modifie et ne supprime rien.
-- Un seul tableau de résultats : section | objet | détail
-- =====================================================================
with tables_fe(nom) as (
  values ('profiles'),('drivers'),('driver_locations'),('parcels'),
         ('parcel_events'),('partners'),('audit_logs'),('notifications_log')
)
select section, objet, detail
from (
  -- 1. Colonnes des tables FAST EXPRESS
  select 1 as ordre, '01 colonnes'::text as section,
         (c.table_name || '.' || c.column_name)::text as objet,
         (c.data_type
           || case when c.data_type = 'USER-DEFINED' then ' (' || c.udt_name || ')' else '' end
           || ' | vide autorisé : ' || c.is_nullable
           || coalesce(' | par défaut : ' || c.column_default, ''))::text as detail,
         c.table_name::text as cle, c.ordinal_position::int as pos
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name::text in (select nom from tables_fe)

  union all
  -- 2. Toutes les tables et vues du schéma public
  select 2, '02 tables', t.table_name::text, t.table_type::text, t.table_name::text, 0
  from information_schema.tables t
  where t.table_schema = 'public'

  union all
  -- 3. Clés primaires, clés étrangères, contraintes uniques et CHECK
  select 3, '03 contraintes', (cl.relname || ' · ' || co.conname)::text,
         (case co.contype when 'p' then 'CLÉ PRIMAIRE' when 'f' then 'CLÉ ÉTRANGÈRE'
                          when 'u' then 'UNIQUE' when 'c' then 'CHECK' else co.contype::text end
          || ' : ' || pg_get_constraintdef(co.oid))::text,
         cl.relname::text, 0
  from pg_constraint co
  join pg_class cl on cl.oid = co.conrelid
  join pg_namespace n on n.oid = cl.relnamespace
  where n.nspname = 'public'
    and cl.relname::text in (select nom from tables_fe)

  union all
  -- 4. Listes de valeurs (types enum : statuts, rôles…)
  select 4, '04 listes de valeurs', ty.typname::text,
         string_agg(e.enumlabel, ', ' order by e.enumsortorder)::text, ty.typname::text, 0
  from pg_type ty
  join pg_enum e on e.enumtypid = ty.oid
  join pg_namespace n on n.oid = ty.typnamespace
  where n.nspname = 'public'
  group by ty.typname

  union all
  -- 5. RLS activée ou non sur chaque table
  select 5, '05 RLS', c.relname::text,
         (case when c.relrowsecurity then 'RLS activée' else 'RLS DÉSACTIVÉE' end
          || case when c.relforcerowsecurity then ' (forcée)' else '' end)::text,
         c.relname::text, 0
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p')

  union all
  -- 6. Règles RLS existantes (qui peut lire ou écrire quoi)
  select 6, '06 règles RLS', (p.tablename || ' · ' || p.policyname)::text,
         (p.cmd || ' | rôles : ' || array_to_string(p.roles, ', ') || ' | ' || p.permissive
          || coalesce(' | USING : ' || p.qual, '')
          || coalesce(' | WITH CHECK : ' || p.with_check, ''))::text,
         p.tablename::text, 0
  from pg_policies p
  where p.schemaname = 'public'

  union all
  -- 7. Tables diffusées en temps réel
  select 7, '07 temps réel', (pt.schemaname || '.' || pt.tablename)::text,
         'publiée dans supabase_realtime'::text, pt.tablename::text, 0
  from pg_publication_tables pt
  where pt.pubname = 'supabase_realtime'

  union all
  -- 8. Index (rapidité des recherches de positions et de colis)
  select 8, '08 index', (i.tablename || ' · ' || i.indexname)::text, i.indexdef::text,
         i.tablename::text, 0
  from pg_indexes i
  where i.schemaname = 'public'
    and i.tablename::text in (select nom from tables_fe)

  union all
  -- 9. Fonctions déjà présentes
  select 9, '09 fonctions',
         (p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')')::text,
         (case when p.prosecdef then 'SECURITY DEFINER' else 'SECURITY INVOKER' end)::text,
         p.proname::text, 0
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'

  union all
  -- 10. Déclencheurs (triggers)
  select 10, '10 déclencheurs', (tr.event_object_table || ' · ' || tr.trigger_name)::text,
         (tr.action_timing || ' ' || tr.event_manipulation)::text,
         tr.event_object_table::text, 0
  from information_schema.triggers tr
  where tr.trigger_schema = 'public'

  union all
  -- 11. Espaces de stockage de fichiers (photos de preuve)
  select 11, '11 stockage', b.name::text,
         (case when b.public then 'PUBLIC' else 'privé' end
          || coalesce(' | taille max : ' || b.file_size_limit::text, '')
          || coalesce(' | types : ' || array_to_string(b.allowed_mime_types, ', '), ''))::text,
         b.name::text, 0
  from storage.buckets b

  union all
  -- 12. Volume approximatif des tables (sans lire les données)
  select 12, '12 volume', c.relname::text,
         (case when c.reltuples < 0 then 'pas encore estimé'
               else c.reltuples::bigint::text || ' lignes (estimation)' end
          || ' | ' || pg_size_pretty(pg_total_relation_size(c.oid)))::text,
         c.relname::text, 0
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'

  union all
  -- 13. Extensions installées (PostGIS, pg_cron…)
  select 13, '13 extensions', x.extname::text, x.extversion::text, x.extname::text, 0
  from pg_extension x
) resultat
order by ordre, cle, pos, objet;
