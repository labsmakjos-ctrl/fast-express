-- =====================================================================
-- ÉTAPE 06B — PROPOSITION NON EXÉCUTÉE. À valider avant toute exécution.
-- FAST EXPRESS : protection réelle de parcels.confirmation_code.
--
-- Principe : AUCUNE règle RLS modifiée. On retire aux visiteurs (anon) et aux
-- comptes connectés (authenticated) les droits SELECT / INSERT / UPDATE sur la
-- table, puis on les rend colonne par colonne, SAUF confirmation_code.
-- DELETE, TRUNCATE, REFERENCES, TRIGGER : inchangés.
-- Le manager obtient le code par get_delivery_code (06A) ; personne ne peut plus
-- le lire, le filtrer, le choisir ni le remplacer par l'API.
--
-- ⚠️ CASSE toute version de l'application qui lit ou envoie confirmation_code :
--    à n'exécuter QU'APRÈS publication de l'application réglée avec
--    deliveryRpc: 'confirm_delivery' ET deliveryCodeRpc: 'get_delivery_code',
--    et après un test réel réussi de cette version.
--
-- PRÉREQUIS (fichier 05-06_0_pre_verifications_lecture_seule.sql) :
--   • 05A et 06A exécutées (vérifié ci-dessous, sinon arrêt) ;
--   • P2, P3, P7 sans ⛔ ;
--   • P4 : exactement les 19 colonnes attendues, aucun droit par colonne (vérifié ci-dessous) ;
--   • P5 : résultat CONSERVÉ (instructions exactes de retour arrière) ;
--   • P8 : noter si parcels est publiée pour le temps réel (test ci-dessous).
-- =====================================================================
begin;

-- Garde-fous : prérequis et liste exacte des colonnes ; sinon RIEN n'est modifié
do $$
declare
  v_cols text[];
  v_expected text[] := array['cancellation_reason','client_name','client_phone','confirmation_code','created_at',
    'delivered_at','delivery_address','delivery_lat','delivery_lng','driver_id','id','partner_id','postponed_date',
    'postponed_reason','proof_photo_url','status','tracking_number','tracking_token','updated_at'];
begin
  if to_regprocedure('public.get_delivery_code(uuid)') is null
     or to_regprocedure('public.confirm_delivery(uuid, text, double precision, double precision)') is null then
    raise exception '06B annulée : exécuter d''abord 05A et 06A';
  end if;
  select array_agg(column_name::text order by column_name::text) into v_cols
  from information_schema.columns
  where table_schema = 'public' and table_name = 'parcels';
  if v_cols is distinct from v_expected then
    raise exception '06B annulée : les colonnes de parcels ne correspondent pas à la liste attendue (%)', v_cols;
  end if;
  if exists (select 1 from pg_attribute
             where attrelid = 'public.parcels'::regclass and attnum > 0 and not attisdropped and attacl is not null) then
    raise exception '06B annulée : des droits par colonne existent déjà sur parcels (voir P4)';
  end if;
end $$;

-- Lecture : toutes les colonnes sauf confirmation_code (comptes connectés) ; rien pour anon
revoke select on table public.parcels from anon, authenticated;
grant select (id, tracking_number, tracking_token, client_name, client_phone, delivery_address,
              status, driver_id, partner_id, delivery_lat, delivery_lng, proof_photo_url,
              postponed_date, created_at, updated_at, delivered_at, postponed_reason, cancellation_reason)
  on table public.parcels to authenticated;

-- Création : colonnes envoyées par l'application, SANS confirmation_code (créé par la base, 06A)
revoke insert on table public.parcels from anon, authenticated;
grant insert (tracking_number, tracking_token, client_name, client_phone, delivery_address,
              status, driver_id, partner_id, delivery_lat, delivery_lng, proof_photo_url,
              postponed_date, delivered_at, postponed_reason, cancellation_reason)
  on table public.parcels to authenticated;

-- Modification : colonnes modifiées par l'application, SANS confirmation_code
revoke update on table public.parcels from anon, authenticated;
grant update (status, driver_id, partner_id, client_name, client_phone, delivery_address,
              delivery_lat, delivery_lng, proof_photo_url, postponed_date, updated_at,
              delivered_at, postponed_reason, cancellation_reason)
  on table public.parcels to authenticated;

commit;

-- =====================================================================
-- VÉRIFICATIONS APRÈS 06B (lecture seule)
--   select grantee, privilege_type from information_schema.column_privileges
--    where table_schema = 'public' and table_name = 'parcels' and column_name = 'confirmation_code'
--      and grantee in ('anon', 'authenticated');                       → aucune ligne
--   select has_table_privilege('authenticated', 'public.parcels', 'DELETE');   → inchangé (comme avant)
--
-- TESTS DANS LE NAVIGATEUR (comptes et colis de TEST uniquement)
--  1. Compte LIVREUR, console (F12) :
--       const sb = window.supabase.createClient(FE_CONFIG.supabaseUrl, FE_CONFIG.supabaseAnonKey);
--       (await sb.from('parcels').select('confirmation_code').limit(1)).error   → « permission denied »
--       (await sb.from('parcels').select('id').eq('confirmation_code','1234')).error → « permission denied »
--       (await sb.rpc('get_delivery_code', { p_parcel_id: '<id d'un colis de test>' })).data → null
--  2. Même test avec un compte PARTENAIRE → mêmes résultats.
--  3. Compte MANAGER : fiche d'un colis de test → le code s'affiche (via get_delivery_code).
--  4. TEMPS RÉEL (si P8 montre parcels publiée) : PC manager + téléphone livreur,
--     F12 › Network › WS › messages. Faire « J'ai récupéré le colis » sur un colis de test :
--       a) le manager voit-il le changement en 1–2 s (temps réel) ou en ≤ 30 s (relecture) ?
--       b) le message reçu contient-il "confirmation_code" ?  → ⛔ si OUI : retour arrière R5
--          immédiat (la protection fuit par le temps réel), puis analyse.
--     Si le temps réel ne transmet plus rien : l'application relit les colis toutes les 30 s
--     (réglage parcelPollMs, actif automatiquement avec deliveryCodeRpc).
--
-- RETOUR ARRIÈRE : voir 05-06_9_retour_arriere.sql, section R5 (à faire EN PREMIER).
-- =====================================================================
