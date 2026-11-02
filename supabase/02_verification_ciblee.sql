-- FAST EXPRESS : vérification ciblée (LECTURE SEULE, ne modifie rien)
-- Résultat : un tableau  ordre | categorie | table_concernee | element | resultat | etat
with besoins(t, besoin, candidats, prio) as (values
  -- profiles
  ('profiles','identifiant (= compte Supabase Auth)', array['id'], 'indispensable'),
  ('profiles','nom complet', array['full_name'], 'indispensable'),
  ('profiles','téléphone', array['phone'], 'indispensable'),
  ('profiles','rôle', array['role'], 'indispensable'),
  ('profiles','lien vers le partenaire', array['partner_id'], 'utile'),
  ('profiles','date de création', array['created_at'], 'utile'),
  -- partners
  ('partners','identifiant', array['id'], 'indispensable'),
  ('partners','nom de la boutique', array['name','company_name','business_name','nom'], 'indispensable'),
  ('partners','téléphone', array['phone','contact_phone'], 'indispensable'),
  ('partners','compte lié (profil)', array['profile_id','owner_id','user_id'], 'indispensable'),
  ('partners','adresse / quartier', array['address','quarter','zone','district'], 'utile'),
  -- drivers
  ('drivers','identifiant', array['id'], 'indispensable'),
  ('drivers','lien vers le profil', array['profile_id'], 'indispensable'),
  ('drivers','véhicule', array['vehicle'], 'indispensable'),
  ('drivers','plaque', array['plate','plate_number','license_plate','vehicle_plate'], 'utile'),
  ('drivers','disponibilité', array['status','availability','is_available','is_active','availability_status'], 'indispensable'),
  ('drivers','capacité maximale', array['capacity','max_parcels','max_capacity','max_active_parcels'], 'indispensable'),
  ('drivers','zone principale', array['zone','work_zone','main_zone','quarter','district'], 'indispensable'),
  ('drivers','secteur (quartiers voisins)', array['zones','sector','service_zones','sector_zones'], 'utile'),
  ('drivers','note clients', array['rating','note'], 'utile'),
  ('drivers','date de création', array['created_at'], 'utile'),
  -- driver_locations
  ('driver_locations','livreur', array['driver_id'], 'indispensable'),
  ('driver_locations','latitude', array['lat','latitude'], 'indispensable'),
  ('driver_locations','longitude', array['lng','lon','longitude'], 'indispensable'),
  ('driver_locations','date', array['created_at'], 'indispensable'),
  ('driver_locations','précision GPS (m)', array['accuracy','accuracy_m','precision'], 'utile'),
  ('driver_locations','vitesse', array['speed'], 'facultatif'),
  ('driver_locations','direction', array['heading'], 'facultatif'),
  -- parcels
  ('parcels','identifiant', array['id'], 'indispensable'),
  ('parcels','numéro de suivi', array['tracking_number'], 'indispensable'),
  ('parcels','nom du destinataire', array['customer_name'], 'indispensable'),
  ('parcels','téléphone du destinataire', array['customer_phone'], 'indispensable'),
  ('parcels','adresse / point de repère', array['delivery_address'], 'indispensable'),
  ('parcels','quartier', array['delivery_quarter','quarter','district','neighborhood','zone','delivery_zone'], 'indispensable'),
  ('parcels','statut', array['status'], 'indispensable'),
  ('parcels','livreur', array['driver_id'], 'indispensable'),
  ('parcels','latitude livraison', array['delivery_lat'], 'indispensable'),
  ('parcels','longitude livraison', array['delivery_lng'], 'indispensable'),
  ('parcels','précision de la position', array['precision'], 'utile'),
  ('parcels','partenaire expéditeur', array['partner_id'], 'indispensable'),
  ('parcels','type de colis', array['parcel_type','type','service_type'], 'utile'),
  ('parcels','poids', array['weight','weight_kg'], 'utile'),
  ('parcels','montant à encaisser', array['cod_amount','amount_to_collect','cash_amount','collect_amount'], 'indispensable'),
  ('parcels','frais de livraison', array['delivery_fee','fee','price','shipping_fee'], 'utile'),
  ('parcels','code de remise (protégé)', array['delivery_code','delivery_code_hash','otp','otp_hash'], 'indispensable'),
  ('parcels','motif (échec, report, annulation)', array['status_reason','failure_reason','reason','cancel_reason'], 'indispensable'),
  ('parcels','nouveau créneau (report)', array['rescheduled_for','reschedule_slot','new_slot'], 'utile'),
  ('parcels','photo de preuve', array['proof_photo_path','proof_photo_url','proof_url','proof_path'], 'utile'),
  ('parcels','mode d''attribution', array['assignment_mode','assigned_by'], 'utile'),
  ('parcels','raison de l''attribution', array['assignment_reason'], 'utile'),
  ('parcels','date d''attribution', array['assigned_at'], 'utile'),
  ('parcels','date de livraison', array['delivered_at'], 'utile'),
  ('parcels','date de création', array['created_at'], 'indispensable'),
  ('parcels','date de mise à jour', array['updated_at'], 'utile'),
  -- parcel_events
  ('parcel_events','colis', array['parcel_id'], 'indispensable'),
  ('parcel_events','type / statut', array['event_type','status','type'], 'indispensable'),
  ('parcel_events','note / motif', array['note','description','message','details'], 'indispensable'),
  ('parcel_events','auteur', array['actor_id','created_by','user_id','profile_id'], 'indispensable'),
  ('parcel_events','date', array['created_at'], 'indispensable'),
  -- audit_logs
  ('audit_logs','auteur', array['actor_id','user_id','profile_id','created_by'], 'indispensable'),
  ('audit_logs','action', array['action','event','event_type'], 'indispensable'),
  ('audit_logs','table concernée', array['entity','table_name','target_table','entity_type'], 'utile'),
  ('audit_logs','ligne concernée', array['entity_id','record_id','target_id'], 'utile'),
  ('audit_logs','détails', array['details','metadata','diff','data'], 'utile'),
  ('audit_logs','date', array['created_at'], 'indispensable'),
  -- notifications_log
  ('notifications_log','colis', array['parcel_id'], 'indispensable'),
  ('notifications_log','destinataire', array['recipient','recipient_phone','to_phone','phone'], 'indispensable'),
  ('notifications_log','canal', array['channel'], 'utile'),
  ('notifications_log','modèle', array['template','template_key','type','event_type'], 'utile'),
  ('notifications_log','contenu', array['message','body','content'], 'indispensable'),
  ('notifications_log','état d''envoi', array['status','delivery_status'], 'utile'),
  ('notifications_log','date', array['created_at'], 'indispensable')
),
fe(t) as (select distinct t from besoins),
cols as (
  select c.table_name::text t, c.column_name::text col,
         c.data_type || case when c.data_type = 'USER-DEFINED' then ' ' || c.udt_name else '' end ty,
         c.udt_name::text udt
  from information_schema.columns c
  where c.table_schema = 'public' and c.table_name::text in (select t from fe)
)
select ordre, categorie, table_concernee, element, resultat, etat from (

  -- A. Colonnes nécessaires : présentes ou manquantes
  select 1 ordre, 'A colonnes'::text categorie, b.t table_concernee, b.besoin element,
         coalesce((select string_agg(k.col || ' (' || k.ty || ')', ', ') from cols k
                   where k.t = b.t and k.col = any(b.candidats)),
                  'aucune parmi : ' || array_to_string(b.candidats, ', ')) resultat,
         case when exists (select 1 from cols k where k.t = b.t and k.col = any(b.candidats)) then 'OK'
              when b.prio = 'indispensable' then 'MANQUANT'
              else 'MANQUANT (' || b.prio || ')' end etat,
         b.t s1, b.besoin s2
  from besoins b

  union all
  -- B. Colonnes existantes que l'application n'utilise pas encore
  select 2, 'B autres colonnes', k.t, k.col, k.ty, 'INFO', k.t, k.col
  from cols k
  where not exists (select 1 from besoins b where b.t = k.t and k.col = any(b.candidats))

  union all
  -- C. Valeurs autorisées (types enum utilisés par ces tables)
  select 3, 'C valeurs autorisées', k.t, k.col || ' (enum ' || k.udt || ')',
         (select string_agg(e.enumlabel, ', ' order by e.enumsortorder)
            from pg_type ty join pg_enum e on e.enumtypid = ty.oid where ty.typname = k.udt),
         'INFO', k.t, k.col
  from cols k
  where exists (select 1 from pg_type ty join pg_enum e on e.enumtypid = ty.oid where ty.typname = k.udt)

  union all
  -- C bis. Règles CHECK (valeurs autorisées écrites en contraintes)
  select 3, 'C valeurs autorisées', cl.relname::text, co.conname::text, pg_get_constraintdef(co.oid), 'INFO',
         cl.relname::text, co.conname::text
  from pg_constraint co join pg_class cl on cl.oid = co.conrelid
  join pg_namespace n on n.oid = cl.relnamespace
  where n.nspname = 'public' and co.contype = 'c' and cl.relname::text in (select t from fe)

  union all
  -- D. Statuts réellement utilisés dans les colis
  select 4, 'D statuts utilisés', 'parcels', coalesce(p.status::text, '(vide)'), count(*)::text || ' colis', 'INFO',
         'parcels', coalesce(p.status::text, '')
  from public.parcels p group by p.status

  union all
  -- D bis. Rôles réellement utilisés dans les profils
  select 4, 'D rôles utilisés', 'profiles', coalesce(r.role::text, '(vide)'), count(*)::text || ' profils',
         case when r.role::text in ('driver','manager','partenaire') then 'OK' else 'À VÉRIFIER' end,
         'profiles', coalesce(r.role::text, '')
  from public.profiles r group by r.role

  union all
  -- E. Liens entre tables (clés étrangères, y compris vers auth.users)
  select 5, 'E liens', cl.relname::text, co.conname::text, pg_get_constraintdef(co.oid), 'INFO',
         cl.relname::text, co.conname::text
  from pg_constraint co join pg_class cl on cl.oid = co.conrelid
  join pg_namespace n on n.oid = cl.relnamespace
  where n.nspname = 'public' and co.contype in ('f','u') and cl.relname::text in (select t from fe)

  union all
  -- F. RLS activée ?
  select 6, 'F RLS activée', f.t, 'protection par ligne',
         case when c.relrowsecurity then 'activée' else 'DÉSACTIVÉE' end,
         case when c.relrowsecurity then 'OK' else 'RISQUE' end, f.t, ''
  from fe f join pg_class c on c.relname = f.t
  join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'

  union all
  -- G. Règles RLS exactes
  select 7, 'G règles RLS', p.tablename::text, p.policyname::text,
         p.cmd || ' | pour : ' || array_to_string(p.roles, ', ')
           || coalesce(' | lecture si : ' || regexp_replace(p.qual, '\s+', ' ', 'g'), '')
           || coalesce(' | écriture si : ' || regexp_replace(p.with_check, '\s+', ' ', 'g'), ''),
         case when 'anon' = any(p.roles) or 'public' = any(p.roles) then 'À VÉRIFIER (accès sans compte)'
              when coalesce(p.qual, '') = 'true' or coalesce(p.with_check, '') = 'true' then 'À VÉRIFIER (accès à tout)'
              else 'À EXAMINER' end,
         p.tablename::text, p.policyname::text
  from pg_policies p
  where p.schemaname = 'public' and p.tablename::text in (select t from fe)

  union all
  -- H. Droits accordés aux visiteurs sans compte (anon) et aux connectés (authenticated)
  select 8, 'H droits', g.table_name::text, g.grantee::text,
         string_agg(g.privilege_type, ', ' order by g.privilege_type),
         case when g.grantee = 'anon' then 'À VÉRIFIER' else 'INFO' end,
         g.table_name::text, g.grantee::text
  from information_schema.role_table_grants g
  where g.table_schema = 'public' and g.grantee in ('anon','authenticated')
    and g.table_name::text in (select t from fe)
  group by g.table_name, g.grantee

  union all
  -- I. Fonctions utilisées par les règles (ex. is_manager) et création automatique des profils
  select 9, 'I fonctions', 'public', p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')',
         case when p.prosecdef then 'SECURITY DEFINER' else 'SECURITY INVOKER' end
           || case when p.proconfig is null then ' | search_path non fixé' else ' | ' || array_to_string(p.proconfig, ', ') end,
         case when p.prosecdef and p.proconfig is null then 'À VÉRIFIER' else 'INFO' end,
         'public', p.proname::text
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'

  union all
  select 9, 'I fonctions', tr.event_object_schema || '.' || tr.event_object_table, tr.trigger_name::text,
         tr.action_timing || ' ' || tr.event_manipulation || ' → ' || tr.action_statement, 'INFO',
         tr.event_object_table::text, tr.trigger_name::text
  from information_schema.triggers tr
  where tr.event_object_schema in ('public','auth')

  union all
  -- J. Stockage des photos de preuve
  select 10, 'J stockage', 'storage', b.name::text,
         case when b.public then 'PUBLIC' else 'privé' end, 'INFO', b.name::text, ''
  from storage.buckets b
) r
order by ordre, s1, s2;
