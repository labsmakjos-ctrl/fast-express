-- =====================================================================
-- ÉTAPE 07 — PROPOSITION NON EXÉCUTÉE. À valider avant toute exécution.
-- FAST EXPRESS : permettre au PARTENAIRE de modifier SA fiche entreprise
-- (contact, téléphone, et adresse si on l'ajoute). Rien d'autre.
--
-- L'application fonctionne SANS ce fichier : la page « Mon entreprise » affiche
-- alors « Modification non autorisée… Contactez FAST EXPRESS ». Aucune donnée
-- n'est modifiée par ce fichier, sauf l'ajout facultatif d'une colonne vide.
--
-- Ordre conseillé : 07.0 (lecture seule) → 07.1 (facultatif) → 07.2 → tests → 07.9 si besoin.
-- Pré-requis de sécurité : le correctif « profiles » (script A, rôle non modifiable par
-- l'utilisateur) doit être appliqué AVANT 07.2, sinon un compte peut se déclarer partenaire.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 07.0 — PRÉ-VÉRIFICATIONS (lecture seule : SELECT uniquement)
-- ---------------------------------------------------------------------
-- a) RLS active sur partners ?                      (attendu : true)
select relrowsecurity as rls_active, relforcerowsecurity as rls_forcee
from pg_class where oid = 'public.partners'::regclass;

-- b) Politiques actuelles sur partners (À CONSERVER pour le retour arrière)
select policyname, cmd, roles, qual, with_check
from pg_policies where schemaname = 'public' and tablename = 'partners' order by policyname;

-- c) Droits de table actuels (UPDATE doit exister pour authenticated, sinon 07.2 ne suffit pas)
select grantee, privilege_type from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'partners' and grantee in ('anon', 'authenticated', 'PUBLIC')
order by grantee, privilege_type;

-- d) Colonnes actuelles (attendu : id, company_name, contact_name, contact_phone, profile_id, + éventuelles dates)
select column_name, data_type, is_nullable from information_schema.columns
where table_schema = 'public' and table_name = 'partners' order by ordinal_position;

-- e) Déclencheurs existants sur partners (aucun conflit de nom attendu)
select tgname from pg_trigger where tgrelid = 'public.partners'::regclass and not tgisinternal;

-- f) Le correctif profiles est-il en place ? (attendu : 1 ligne)
select tgname from pg_trigger where tgrelid = 'public.profiles'::regclass and tgname = 'profiles_guard_role';


-- ---------------------------------------------------------------------
-- 07.1 — FACULTATIF : colonne d'adresse de l'entreprise (vide pour tous)
-- Après exécution, régler dans js/config.js : optionalColumns.partners.address = 'address'
-- ---------------------------------------------------------------------
-- begin;
-- alter table public.partners add column if not exists address text;
-- alter table public.partners add constraint partners_address_len check (address is null or char_length(address) <= 200) not valid;
-- commit;


-- ---------------------------------------------------------------------
-- 07.2 — Politique « le partenaire modifie SA fiche » + garde-fou des colonnes
-- La politique limite les LIGNES ; le déclencheur limite les COLONNES
-- (nom, compte lié et identifiant restent réservés au manager / au serveur).
-- ---------------------------------------------------------------------
-- begin;
--
-- create or replace function public.partners_guard_update()
-- returns trigger
-- language plpgsql
-- set search_path = ''
-- as $$
-- declare v_role text;
-- begin
--   -- appels serveur (SQL Editor, fonctions DEFINER) : non concernés
--   if current_user not in ('anon', 'authenticated') then return new; end if;
--   select p.role into v_role from public.profiles p where p.id = auth.uid() and p.is_active = true;
--   if v_role = 'manager' then return new; end if;
--   if new.id is distinct from old.id
--      or new.profile_id is distinct from old.profile_id
--      or new.company_name is distinct from old.company_name then
--     raise exception 'Seul FAST EXPRESS peut modifier le nom, le compte ou l''identifiant de l''entreprise'
--       using errcode = '42501';
--   end if;
--   if char_length(coalesce(new.contact_phone, '')) > 30 or char_length(coalesce(new.contact_name, '')) > 80 then
--     raise exception 'Contact ou téléphone trop long' using errcode = '22001';
--   end if;
--   return new;
-- end $$;
--
-- revoke all on function public.partners_guard_update() from public, anon, authenticated;
--
-- drop trigger if exists partners_guard_update on public.partners;
-- create trigger partners_guard_update before update on public.partners
--   for each row execute function public.partners_guard_update();
--
-- create policy "Partenaire modifie sa fiche" on public.partners
--   for update to authenticated
--   using (
--     profile_id = auth.uid()
--     and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'partner' and p.is_active = true)
--   )
--   with check (
--     profile_id = auth.uid()
--     and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'partner' and p.is_active = true)
--   );
--
-- commit;
--
-- TESTS (compte partenaire de TEST, console F12 de l'application en ?mode=supabase) :
--   const sb = window.supabase.createClient(FE_CONFIG.supabaseUrl, FE_CONFIG.supabaseAnonKey);
--   1. Sa fiche, téléphone      : (await sb.from('partners').update({contact_phone:'+241 0'}).eq('id','<sa fiche>').select('id')).data  → 1 ligne
--   2. Sa fiche, nom            : (await sb.from('partners').update({company_name:'X'}).eq('id','<sa fiche>')).error           → « Seul FAST EXPRESS… »
--   3. Fiche d'un AUTRE         : (await sb.from('partners').update({contact_phone:'0'}).eq('id','<autre>').select('id')).data → [] (aucune ligne)
--   4. Compte LIVREUR, même 1.  : → [] (aucune ligne)
--   5. Compte MANAGER : modifier le nom d'une entreprise de test → accepté.
--   Remettre ensuite les valeurs d'origine des fiches de test.


-- ---------------------------------------------------------------------
-- 07.9 — RETOUR ARRIÈRE (tout en commentaire)
-- ---------------------------------------------------------------------
-- begin;
-- drop policy if exists "Partenaire modifie sa fiche" on public.partners;
-- drop trigger if exists partners_guard_update on public.partners;
-- drop function if exists public.partners_guard_update();
-- commit;
-- Colonne d'adresse (07.1) : la laisser (inoffensive) ; ne la supprimer qu'après avoir remis
-- optionalColumns.partners.address = null dans js/config.js ET publié, sur décision explicite :
--   alter table public.partners drop column if exists address;
