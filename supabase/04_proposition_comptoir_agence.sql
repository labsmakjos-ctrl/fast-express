-- =====================================================================
-- PROPOSITION — NON EXÉCUTÉE. À valider avant toute exécution.
-- Décision 6 : créer l'expéditeur « Comptoir agence » pour les colis
-- déposés directement à l'agence. Ajoute UNE ligne dans partners.
-- Ne modifie aucune table, aucune règle RLS, aucune autre donnée.
-- Sans effet si la ligne existe déjà (vérification par le nom).
-- =====================================================================
insert into public.partners (company_name, contact_name, contact_phone, profile_id)
select 'Comptoir agence', 'Accueil de l''agence', '+241 011 44 20 20', null
where not exists (
  select 1 from public.partners where company_name = 'Comptoir agence'
);

-- Vérification (lecture seule) :
-- select id, company_name, contact_name, contact_phone from public.partners where company_name = 'Comptoir agence';
