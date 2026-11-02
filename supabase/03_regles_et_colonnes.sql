select 'colonne' as type, c.table_name::text as table_concernee, c.column_name::text as element,
       (c.data_type || ' | vide autorisé : ' || c.is_nullable)::text as detail
from information_schema.columns c
where c.table_schema = 'public'
  and c.table_name in ('profiles','partners','drivers','driver_locations','parcels',
                       'parcel_events','audit_logs','notifications_log')
union all
select 'règle RLS', p.tablename::text, p.policyname::text,
       (p.cmd || ' | pour : ' || array_to_string(p.roles, ', ')
        || coalesce(' | lecture si : ' || regexp_replace(p.qual, '\s+', ' ', 'g'), '')
        || coalesce(' | écriture si : ' || regexp_replace(p.with_check, '\s+', ' ', 'g'), ''))::text
from pg_policies p
where p.schemaname in ('public','storage')
union all
select 'droit table', g.table_name::text, g.grantee::text,
       string_agg(g.privilege_type, ', ' order by g.privilege_type)::text
from information_schema.role_table_grants g
where g.table_schema = 'public' and g.grantee in ('anon','authenticated')
group by g.table_name, g.grantee
union all
select 'fonction', 'public', (p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')')::text,
       (case when p.prosecdef then 'SECURITY DEFINER' else 'SECURITY INVOKER' end
        || ' | ' || coalesce(array_to_string(p.proconfig, ', '), 'search_path non fixé'))::text
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
union all
select 'stockage', 'storage', b.name::text, (case when b.public then 'PUBLIC' else 'privé' end)::text
from storage.buckets b
order by 1, 2, 3;
