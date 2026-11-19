-- =====================================================================
-- FAST EXPRESS — RETOUR ARRIÈRE des étapes 05A, 05B, 06A, 06B
-- PROPOSITION NON EXÉCUTÉE. Toutes les instructions sont en commentaire : lancer ce
-- fichier tel quel n'a AUCUN effet. Pour une section, copier ses lignes dans le
-- SQL Editor en retirant « --   » au début, puis exécuter cette section seule.
-- Aucune donnée de colis n'est modifiée ni supprimée par ces sections.
--
-- ORDRE (inverse de l'activation) :
--   R5  annuler 06B (droits par colonne)        → toujours EN PREMIER
--   R4  annuler 05B (garde-fou « delivered »)
--   R3  remettre l'application précédente      → APRÈS R5 et R4, AVANT R2 et R1
--   R2  annuler 06A (get_delivery_code, génération du code)
--   R1  annuler 05A (confirm_delivery, déblocage)
--
-- Retours partiels possibles sans toucher à l'application :
--   • R5 seul : l'application réglée avec deliveryCodeRpc continue de fonctionner
--     (elle ne lit pas la colonne ; le code redevient simplement lisible par l'API).
--   • R4 seul : l'application réglée avec deliveryRpc continue de fonctionner.
--   • R2 ou R1 : UNIQUEMENT après R3 si l'application utilise ces fonctions
--     (sinon : plus de code chez le manager / plus aucune livraison possible).
-- =====================================================================


-- ---------------------------------------------------------------------
-- R5 — Annuler 06B : rétablir EXACTEMENT les droits d'avant
-- ---------------------------------------------------------------------
-- R5.1 Exécuter les instructions conservées lors de la pré-vérification P5, par exemple :
--        grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.parcels to anon;
--        grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.parcels to authenticated;
--      (ne PAS recopier cet exemple : utiliser le résultat réel de P5)
--
-- R5.2 Retirer les droits par colonne ajoutés par 06B (devenus inutiles) :
--   begin;
--   revoke select (id, tracking_number, tracking_token, client_name, client_phone, delivery_address,
--                  status, driver_id, partner_id, delivery_lat, delivery_lng, proof_photo_url,
--                  postponed_date, created_at, updated_at, delivered_at, postponed_reason, cancellation_reason)
--     on table public.parcels from authenticated;
--   revoke insert (tracking_number, tracking_token, client_name, client_phone, delivery_address,
--                  status, driver_id, partner_id, delivery_lat, delivery_lng, proof_photo_url,
--                  postponed_date, delivered_at, postponed_reason, cancellation_reason)
--     on table public.parcels from authenticated;
--   revoke update (status, driver_id, partner_id, client_name, client_phone, delivery_address,
--                  delivery_lat, delivery_lng, proof_photo_url, postponed_date, updated_at,
--                  delivered_at, postponed_reason, cancellation_reason)
--     on table public.parcels from authenticated;
--   commit;
-- R5.3 Contrôle : relancer P5 → le résultat doit être identique à celui conservé ;
--      relancer la 2e requête de P4 → aucune ligne.


-- ---------------------------------------------------------------------
-- R4 — Annuler 05B : retirer le garde-fou et la procédure de livraison forcée
-- ---------------------------------------------------------------------
--   begin;
--   drop trigger if exists parcels_guard_delivered on public.parcels;
--   drop function if exists public.parcels_guard_delivered();
--   drop function if exists public.admin_force_delivery(uuid, text);
--   commit;


-- ---------------------------------------------------------------------
-- R3 — Application (pas de SQL)
--   Republier la version précédente de l'application, ou régler dans js/config.js :
--     deliveryRpc: null, deliveryCodeRpc: null
--   puis publier. À faire APRÈS R5 et R4 (sinon : chargement des colis refusé,
--   ou livraisons bloquées), et AVANT R2 et R1.
-- ---------------------------------------------------------------------


-- ---------------------------------------------------------------------
-- R2 — Annuler 06A : fonction du manager et génération du code
-- Les codes déjà créés par la base restent en place (aucune donnée modifiée).
-- ---------------------------------------------------------------------
--   begin;
--   drop trigger if exists parcels_set_confirmation_code on public.parcels;
--   drop function if exists public.parcels_set_confirmation_code();
--   drop function if exists public.get_delivery_code(uuid);
--   commit;


-- ---------------------------------------------------------------------
-- R1 — Annuler 05A : fonctions de confirmation et de déblocage
-- La table des essais est CONSERVÉE (historique des codes faux, déblocages,
-- livraisons forcées). Elle reste inaccessible depuis l'application.
-- ---------------------------------------------------------------------
--   begin;
--   drop function if exists public.confirm_delivery(uuid, text, double precision, double precision);
--   drop function if exists public.admin_unlock_delivery_code(uuid, text);
--   commit;
-- Facultatif, UNIQUEMENT après export de son contenu et sur décision explicite :
--   drop table if exists public.delivery_code_attempts;
