# Diagnostic Supabase — projet cxrkzvnfbscdcddoatsp (16/11/2026)

Lecture seule, avec la clé publique `anon` (visiteur sans compte). Aucune ligne lue (`limit=0`),
aucune table, règle ou donnée modifiée.

## Tables et colonnes
- Les 8 tables existent. Toutes les colonnes utilisées par l'application existent, **sauf `parcels.precision`**
  (retirée du code).
- Colonnes `parcels` maintenant utilisées : `created_at`, `delivered_at`, `postponed_reason`
  (report et échec, préfixe « Échec : »), `cancellation_reason`.
- Absentes de `parcels` : montant à encaisser, frais, type, poids (fonctions masquées en mode Supabase).
- `parcels.status`, `parcel_events.status` et `profiles.role` sont du texte (pas de type enum).
  Une éventuelle contrainte CHECK n'est pas visible sans clé secrète.
- Les requêtes exactes de l'application sont acceptées par le projet (6/6).

## Accès sans compte (rôle anon)
- 0 ligne visible dans chacune des 8 tables : les données ne fuient pas vers les visiteurs.
- Aucun espace de stockage visible pour les visiteurs (photos de preuve : à vérifier connecté).
- Fonction de suivi public `track_parcel` : absente (prévue pour l'étape sécurité).

## Points d'attention (aucun changement effectué)
- **Inscription libre activée** (Authentication › Sign In / Providers) : n'importe qui peut créer
  un compte avec la clé publique. À désactiver si les comptes sont créés uniquement par FAST EXPRESS.
- Confirmation d'e-mail obligatoire : les comptes de test créés à la main doivent être confirmés.
- Les droits d'écriture (insertion, modification) n'ont pas été testés : cela aurait modifié des données.
