# FAST EXPRESS — future application Android (Capacitor)

## Pourquoi une application Android

Sur la **version web**, le partage de position fonctionne seulement quand FAST EXPRESS est
**ouvert à l'écran**. Quand le livreur verrouille son téléphone ou change d'application,
le navigateur suspend la localisation : aucune position n'est envoyée pendant ce temps.
L'application affiche alors un avertissement au livreur, et le gestionnaire voit la position
passer à « Ancienne » puis « Indisponible ». **Le suivi en arrière-plan n'est pas garanti sur le web.**

Une application Android peut, elle, continuer le suivi écran verrouillé grâce à un
**service au premier plan** avec une notification visible en permanence
(« FAST EXPRESS · service en cours — votre position est partagée pendant votre service »).

## Ce qui est déjà prêt dans le code

Tout l'accès à la position passe par `js/geo.js` (`FEGeo`). Dans l'application Android,
ce module utilise automatiquement les plugins natifs s'ils sont présents :

| Plugin | Rôle |
|---|---|
| `@capacitor/geolocation` | Autorisation et position ponctuelle |
| `@capacitor-community/background-geolocation` | Suivi continu avec service au premier plan |

Le reste (service obligatoire, envoi toutes les 2 minutes vers `driver_locations`,
demandes de position par Broadcast, fin de service) ne change pas.

## Étapes (à réaliser plus tard, sur validation)

1. Créer le projet : `npm init @capacitor/app`, dossier web = racine du projet FAST EXPRESS.
2. Ajouter Android : `npx cap add android`.
3. Installer les plugins : `npm install @capacitor/geolocation @capacitor-community/background-geolocation`,
   puis `npx cap sync`.
4. `android/app/src/main/AndroidManifest.xml` : permissions
   `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `ACCESS_BACKGROUND_LOCATION` (Android 10+),
   `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION` (Android 14+), `POST_NOTIFICATIONS` (Android 13+).
5. Le livreur doit choisir « **Toujours autoriser** » pour la position.
6. **Économie de batterie** : sur les téléphones Tecno, Infinix, Itel et autres, désactiver
   l'optimisation de batterie pour FAST EXPRESS, sinon le système arrête le suivi.
7. Distribution : fichier APK installé sur les téléphones de la flotte, ou Google Play
   (Google demande alors une justification du suivi en arrière-plan : « suivi des livreurs
   pendant leur service, avec notification permanente »).

## Transparence et données personnelles

- Le suivi est limité au temps de service et s'arrête à la fin du service ou à la déconnexion.
- La date d'information du livreur est enregistrée dans `drivers.consent_at` au premier passage en service.
- Informer les livreurs par écrit et vérifier les obligations de la loi gabonaise sur la protection
  des données personnelles (loi n° 001/2011, CNPDCP) avec un juriste.
