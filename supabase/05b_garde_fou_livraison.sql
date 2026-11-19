-- =====================================================================
-- ÉTAPE 05B — PROPOSITION NON EXÉCUTÉE. À valider avant toute exécution.
-- FAST EXPRESS : garde-fou — un colis ne peut devenir « delivered » QUE par
-- confirm_delivery (code vérifié) ou par la procédure exceptionnelle
-- admin_force_delivery (administrateur, motif obligatoire, tracé).
--
-- ⚠️ BLOQUE toute version de l'application qui écrit « delivered » directement :
--    à n'exécuter QU'APRÈS publication de l'application réglée avec
--    deliveryRpc: 'confirm_delivery', et après un test réel réussi.
--
-- PRÉREQUIS :
--   • 05A exécutée et vérifiée (l'étape s'arrête d'elle-même sinon) ;
--   • application publiée avec deliveryRpc: 'confirm_delivery', livraison de test réussie ;
--   • P6 consulté : les colis à code vide ou non conforme passeront par admin_force_delivery.
-- Ne modifie aucune règle RLS ni aucune donnée existante.
-- =====================================================================
begin;

do $$
begin
  if to_regprocedure('public.confirm_delivery(uuid, text, double precision, double precision)') is null
     or to_regclass('public.delivery_code_attempts') is null then
    raise exception '05B annulée : exécuter d''abord l''étape 05A';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- B.1 — Garde-fou : création ou passage à « delivered » refusés hors procédure autorisée
-- ---------------------------------------------------------------------
create or replace function public.parcels_guard_delivered()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'delivered'
     and (tg_op = 'INSERT' or old.status is distinct from 'delivered')
     and coalesce(current_setting('fast_express.confirm_delivery', true), '') <> 'on' then
    raise exception 'Livraison refusée : le code de remise doit être vérifié par le serveur'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.parcels_guard_delivered() from public, anon, authenticated;

drop trigger if exists parcels_guard_delivered on public.parcels;
create trigger parcels_guard_delivered
  before insert or update of status on public.parcels
  for each row execute function public.parcels_guard_delivered();

-- ---------------------------------------------------------------------
-- B.2 — PROCÉDURE EXCEPTIONNELLE : enregistrer une livraison SANS code
-- (code vide ou non conforme, client injoignable mais colis remis et vérifié par
-- l'agence…). Exécutable UNIQUEMENT par un administrateur dans le SQL Editor :
-- aucun droit pour anon / authenticated. Motif obligatoire, tracé dans
-- l'historique du colis et dans delivery_code_attempts.
-- Usage : select public.admin_force_delivery('<id du colis>', 'Code absent, remise confirmée par appel au client à 14 h 10');
-- ---------------------------------------------------------------------
create or replace function public.admin_force_delivery(p_parcel_id uuid, p_reason text)
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_status text;
begin
  if p_reason is null or length(btrim(p_reason)) < 15 then
    raise exception 'Motif détaillé obligatoire (15 caractères minimum)';
  end if;
  select p.status into v_status from public.parcels p where p.id = p_parcel_id for update;
  if not found then
    raise exception 'Colis introuvable';
  end if;
  if v_status is distinct from 'in_transit' then
    raise exception 'Seul un colis en cours de livraison peut être livré (statut actuel : %)', coalesce(v_status, 'vide');
  end if;

  insert into public.delivery_code_attempts (parcel_id, user_id, kind, reason)
  values (p_parcel_id, null, 'forced', 'Livraison forcée (' || current_user || ') : ' || btrim(p_reason));

  perform set_config('fast_express.confirm_delivery', 'on', true);
  update public.parcels
     set status = 'delivered', delivered_at = now(), updated_at = now()
   where id = p_parcel_id;

  insert into public.parcel_events (parcel_id, status, reason, author_id, author_role, created_at)
  values (p_parcel_id, 'delivered', 'Livraison enregistrée par l''administration sans code : ' || btrim(p_reason),
          null, 'manager', now());

  return 'Livraison enregistrée (procédure exceptionnelle, tracée)';
end;
$$;

comment on function public.admin_force_delivery(uuid, text) is
  'FAST EXPRESS (administrateur, SQL Editor uniquement) : livraison sans code, motif obligatoire, tracée.';

revoke all on function public.admin_force_delivery(uuid, text) from public, anon, authenticated;

commit;

-- =====================================================================
-- VÉRIFICATIONS APRÈS 05B (lecture seule)
--   select tgname, pg_get_triggerdef(oid) from pg_trigger
--    where tgrelid = 'public.parcels'::regclass and tgname = 'parcels_guard_delivered';
--     → BEFORE INSERT OR UPDATE OF status
--   select has_function_privilege('authenticated', 'public.admin_force_delivery(uuid, text)', 'EXECUTE');  → false
-- Test fonctionnel (colis de test, avec votre autorisation) : livraison par le livreur avec
-- le bon code → OK ; tentative d'écriture directe « delivered » → refusée.
--
-- RETOUR ARRIÈRE : voir 05-06_9_retour_arriere.sql, section R4.
-- =====================================================================
