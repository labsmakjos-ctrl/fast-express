# Gestion des utilisateurs — mise en service (étape 09)

Ordre conseillé :

1. **Vérifications** : lancer `09_gestion_utilisateurs.sql`, section 09.0 (lecture seule).
2. **Déployer la fonction serveur** `supabase/functions/admin-users/index.ts` :
   - Dashboard Supabase › **Edge Functions › Deploy a new function › Via editor**,
     nom `admin-users`, coller le contenu du fichier ; ou avec la CLI :
     `supabase functions deploy admin-users`
   - **Secrets** : aucun à ajouter pour la clé. `SUPABASE_URL` et
     `SUPABASE_SERVICE_ROLE_KEY` sont fournis automatiquement par Supabase à la fonction ;
     la clé service_role n'est jamais copiée dans le site.
   - Facultatif : `FE_ALLOWED_ORIGINS` (sites autorisés à appeler la fonction), par défaut
     `https://labsmakjos-ctrl.github.io`. Ajouter `http://localhost:8765` pour un essai local.
   - **« Verify JWT » doit être DÉSACTIVÉ** (CLI : `supabase functions deploy admin-users --no-verify-jwt`).
     La première connexion se fait volontairement SANS session ; toutes les autres actions
     vérifient elles-mêmes le jeton et le rôle de manager actif (`requireManager`).
3. **Activer dans l'application** : `js/config.js` → `adminFunction: 'admin-users'`, puis publier.
   Tant que ce réglage vaut `null`, la page « Gestion des utilisateurs » affiche la liste en
   lecture seule et explique que la fonction n'est pas encore active.
4. **Tester** avec des comptes de TEST : créer un livreur, se connecter avec son mot de passe
   provisoire (changement obligatoire), le désactiver (connexion refusée), le réactiver.
5. **Recommandé ensuite** : désactiver l'inscription libre (Authentication › Sign In / Providers ›
   « Allow new users to sign up ») puisque les comptes sont désormais créés par le manager.

## Ce que fait la fonction
| Action | Effet |
|---|---|
| `list` | e-mail, dernière connexion, blocage des comptes livreurs/partenaires (jamais de mot de passe) |
| `create_driver` | compte de connexion + profil `driver` + fiche `drivers` ; mot de passe provisoire |
| `create_partner` | compte + profil `partner` + fiche `partners` liée à CE compte |
| `create_partner_login` | accès pour une entreprise existante qui n'en a pas |
| `update_driver` / `update_partner` | nom, téléphone, véhicule, entreprise, e-mail (jamais le rôle) |
| `set_active` | désactive / réactive (profil + connexion bloquée) ; aucune donnée supprimée |
| `reset_password` | nouveau mot de passe provisoire, changement obligatoire à la connexion |
| `first_login` (publique) | e-mail + mot de passe provisoire → nouveau mot de passe imposé, compte débloqué |

## Mot de passe provisoire : obligation imposée par le serveur
- Le mot de passe provisoire n'est **pas** le mot de passe Supabase du compte. Le compte reçoit un
  mot de passe aléatoire inconnu de tous et reste **bloqué** (ban) jusqu'à la première connexion.
  Avec le mot de passe provisoire, **aucune session ne peut s'ouvrir** : aucune donnée accessible,
  même par une requête directe à l'API, même après actualisation ou reconnexion.
- Seule une empreinte du mot de passe provisoire (PBKDF2-SHA256 salé) est gardée dans
  `app_metadata`, que seul le serveur peut modifier (l'utilisateur ne peut pas lever l'obligation).
- `first_login` vérifie l'empreinte, impose un mot de passe solide (10 caractères, lettres et
  chiffres), l'enregistre et débloque le compte. 5 essais faux → bloqué jusqu'à un nouveau mot de
  passe provisoire du manager.
- Comptes existants : non concernés (ils n'ont pas l'indicateur `fe_pending`).

Refus systématiques : appelant non manager ou désactivé ; compte cible manager ; livreur qui
transporte encore des colis (désactivation) ; entreprise ayant déjà un compte.

## Diagnostic d'une erreur 500 (`erreur_serveur`)
La réponse d'erreur serveur contient `step` (étape en échec) et `rid` (référence). Le message
affiché dans le site se termine par `[étape : …, réf. …]`. Détail dans Supabase :
**Edge Functions › admin-users › Logs**, chercher la référence `rid`.
Les journaux ne contiennent jamais de clé, jeton, mot de passe, e-mail ni téléphone.

| Étape | Signification probable |
|---|---|
| `configuration` | `SUPABASE_URL` ou `SUPABASE_SERVICE_ROLE_KEY` absent (voir la ligne `demarrage` : `key`) |
| `manager.lecture_profil` | lecture de `profiles` refusée : la clé n'est pas une clé service_role valide |
| `list.lecture_profiles` | même cause, ou colonne `role` illisible |
| `list.listUsers` / `first_login.listUsers` | l'API Auth refuse la liste des comptes : clé non admin, ou compte `auth.users` créé à la main par SQL avec des champs vides (« Database error finding users ») |
| `exception_inattendue` | erreur imprévue : lire `cause.name` et `cause.message` |

La ligne `demarrage` indique la nature de la clé (jamais sa valeur) : `jwt:service_role` attendu ;
`jwt:anon`, `sb_publishable` ou `absente` = mauvaise configuration.
