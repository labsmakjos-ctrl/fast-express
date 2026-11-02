# FAST EXPRESS — plateforme de livraison (Libreville)

Application web de gestion des livraisons : espace **manager**, espace **livreur** (mobile Android), espace **partenaire** (boutiques expéditrices) et **suivi client** par lien privé.

Deux modes de fonctionnement, choisis dans `js/config.js` :

| Mode | Données | Usage |
|---|---|---|
| `demo` (par défaut) | Données fictives enregistrées dans le navigateur | Présentation au client, aucune connexion requise |
| `supabase` | Vos vraies tables Supabase | Utilisation réelle |

---

## 1. Lancer la démonstration (2 minutes)

**Méthode la plus simple :** ouvrez le dossier `fast-express-app` et **double-cliquez sur `index.html`**. L'application s'ouvre dans votre navigateur.

**Méthode recommandée** (nécessaire pour tester le GPS) : lancer un petit serveur local.

- Avec **Visual Studio Code** : installez l'extension « Live Server », faites un clic droit sur `index.html` › « Open with Live Server ».
- Ou avec **Python** installé, dans un terminal ouvert dans le dossier `fast-express-app` :
  ```bash
  python -m http.server 8080
  ```
  puis ouvrez http://localhost:8080 dans le navigateur.

### Comptes de démonstration

Mot de passe pour tous : **`demo2026`**. Sur l'écran de connexion, touchez un compte pour remplir le formulaire.

| Rôle | Compte |
|---|---|
| Responsable (manager) | `manager@fastexpress.demo` |
| Livreur | `rodrigue.ondo@fastexpress.demo` (et les 7 autres livreurs listés) |
| Partenaire | `gabon.tech.store@fastexpress.demo`, `elegance.couture@fastexpress.demo`, `saveurs.du.komo@fastexpress.demo` |

### Parcours conseillé pour la présentation

1. **Manager** : tableau de bord › Carte en direct › Colis › « Nouveau colis » (expéditeur « Comptoir agence », quartier ou coordonnées GPS) › Attribution automatique.
2. **Livreur** (sur téléphone ou fenêtre étroite) : accepter le partage de position › « J'ai récupéré le colis » › « Commencer la livraison » › « Confirmer la livraison » (code affiché pour la démo, photo de preuve facultative) › « Signaler un problème » (Reporter / Échec / Annuler, motif obligatoire).
3. **Partenaire** : son tableau de bord, ses colis uniquement, création d'un envoi.
4. **Suivi client** : dans une fiche colis, « Copier le lien de suivi », puis ouvrir ce lien sans être connecté.

« Réinitialiser la démo » (en bas du menu, manager) remet les données de départ.

---

## 2. Brancher votre projet Supabase (quand vous serez prêt)

> Rien n'est modifié dans votre base par cette étape : l'application **lit et écrit** dans vos tables existantes, selon vos règles RLS.

1. Supabase › **Project Settings › API** : copiez l'**URL du projet** et la clé **`anon` (public)**.
2. Dans `js/config.js` :
   ```js
   mode: 'supabase',
   supabaseUrl: 'https://VOTRE-PROJET.supabase.co',
   supabaseAnonKey: 'VOTRE-CLE-ANON',
   ```
   ⚠️ **Ne mettez jamais la clé `service_role`** dans ce fichier : il est lu par tous les navigateurs.
3. Créez des comptes de test (Supabase › Authentication › Users › Add user), puis pour chacun :
   - une ligne dans `profiles` (même `id` que le compte, `full_name`, `phone`, `role` = `manager`, `driver` ou `partner`) ;
   - pour un livreur : une ligne dans `drivers` (`profile_id`, `vehicle_type`, `vehicle_plate`, `zone`, `is_on_duty`) ;
   - pour un partenaire : une ligne dans `partners` (`company_name`, `contact_name`, `contact_phone`, `profile_id`).
4. Ouvrez l'application et connectez-vous avec ces comptes.

Le script `supabase/04_proposition_comptoir_agence.sql` ajoute l'expéditeur « Comptoir agence ». **Il n'a pas été exécuté** : exécutez-le seulement après l'avoir validé.

### Correspondance avec vos tables

| Interface | Supabase |
|---|---|
| En attente / Attribué | `parcels.status = pending` sans / avec `driver_id` |
| Colis récupéré | `picked_up` |
| En cours de livraison | `in_transit` |
| Livré | `delivered` |
| Reporté | `postponed` **avec** `postponed_date` |
| Échec | `postponed` **sans** `postponed_date` (événement « Échec : motif ») |
| Annulé | `cancelled` |
| En service / Hors service | `drivers.is_on_duty` |
| Accord de partage GPS | `drivers.consent_at` |
| Historique d'un colis | `parcel_events` (`status`, `reason`, `author_id`, `author_role`, `lat`, `lng`) |
| Positions GPS (toutes les 2 min) | `driver_locations` |
| Lien de suivi client | `parcels.tracking_token` |
| Code de remise | `parcels.confirmation_code` |

### Fonctionnalités en attente de confirmation

Ces informations n'ont pas encore de colonne confirmée. Elles sont **masquées en mode Supabase** jusqu'à ce que vous indiquiez le nom exact de la colonne dans `optionalColumns` (fichier `js/config.js`) :

- montant à encaisser à la livraison, frais de livraison, type et poids du colis ;
- colonne de motif dans `parcels` (le motif est de toute façon enregistré dans `parcel_events.reason`) ;
- date de création des colis (`parcels.created_at` probable) ;
- photos de preuve : indiquer un espace de stockage dans `proofBucket` ;
- suivi public sans connexion : nécessite une fonction serveur sécurisée (`trackingRpc`), prévue pour l'étape sécurité ;
- capacité des livreurs : provisoirement selon le type de véhicule (`capacities`).

Le niveau de batterie est envoyé de 0 à 100. Si votre colonne attend une valeur de 0 à 1, ajoutez `batteryAsFraction: true` dans `config.js`.

---

## 3. Tester le GPS sur un téléphone Android

Les navigateurs n'autorisent la localisation que sur une adresse sécurisée (**https**) ou `localhost`. Pour l'essayer sur un vrai téléphone, l'application devra être mise en ligne (étape hébergement, plus tard). D'ici là, le GPS se teste sur ordinateur avec le serveur local.

Le livreur doit être **En service** et avoir **accepté le partage de position**. La position n'est jamais envoyée hors service.

---

## 4. Sécurité : à faire avant la mise en production

Ces points ont été identifiés et seront traités après validation par le client. Ils ne sont pas encore appliqués :

1. Remplacer les modifications directes de `parcels` par les livreurs par des fonctions serveur (vérification du code de remise côté serveur, ordre des étapes, auteur imposé).
2. Rendre `confirmation_code` illisible pour les livreurs et les partenaires.
3. Vérifier qu'un utilisateur ne peut pas modifier son propre `role` dans `profiles`.
4. Positions GPS : lecture réservée aux managers et au livreur lui-même ; aucune modification ni suppression.
5. Suivi client : fonction serveur par `tracking_token`, sans aucun accès direct aux tables pour les visiteurs.
6. Espace de stockage privé pour les photos de preuve.

---

## 5. Structure du projet

```
fast-express-app/
├── index.html            Page de l'application
├── manifest.webmanifest  Installation sur l'écran d'accueil Android
├── css/styles.css        Design (couleurs du logo, clair et sombre)
├── js/config.js          ← Réglages : mode, adresse Supabase, colonnes facultatives
├── js/supabase-data.js   Lecture et écriture dans Supabase (noms réels des colonnes)
├── js/app.js             Écrans et règles métier
├── assets/logo.png       Logo officiel
├── vendor/               Bibliothèques incluses : Supabase 2.45.4, Leaflet 1.9.4
├── supabase/             Scripts SQL (lecture seule, et proposition non exécutée)
└── tests/                Tests automatiques (mode démo et mode Supabase simulé)
```

### Lancer les tests automatiques (facultatif, pour un développeur)

Avec Node.js et Playwright installés, et le serveur local lancé sur le port 8765 :

```bash
python -m http.server 8765
```

```bash
node tests/test-mode-demo.js
```

```bash
node tests/test-mode-supabase.js
```

Le second test fait fonctionner l'application contre un Supabase simulé qui **n'accepte que les colonnes réelles** de votre projet et vos 6 statuts : toute erreur de nom de colonne fait échouer le test.
