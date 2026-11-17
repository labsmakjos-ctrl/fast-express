/* =====================================================================
   FAST EXPRESS — configuration
   ---------------------------------------------------------------------
   mode : 'demo'      → données de démonstration enregistrées dans le
                        navigateur (aucune connexion à Supabase).
          'supabase'  → données réelles de votre projet Supabase.

   IMPORTANT : ne mettez ici QUE l'adresse du projet et la clé publique
   « anon » (Supabase › Project Settings › API). Ne mettez JAMAIS la clé
   « service_role » dans ce fichier : il est visible par tous les
   navigateurs qui ouvrent l'application.
   ===================================================================== */
window.FE_CONFIG = {
  // Le site public reste en démonstration. Le mode Supabase s'ouvre avec le lien
  // « …/fast-express/?mode=supabase » (et « ?mode=demo » pour revenir à la démo).
  mode: 'demo',
  allowModeParam: true,

  supabaseUrl: 'https://cxrkzvnfbscdcddoatsp.supabase.co',
  supabaseAnonKey: '',  // clé PUBLIQUE uniquement : « sb_publishable_… » (jamais « sb_secret_… » ni « service_role »)

  // Colonnes facultatives : leur existence n'a pas encore été confirmée.
  // Laissez null tant qu'elles ne sont pas confirmées ; indiquez le nom
  // exact de la colonne pour activer l'enregistrement correspondant.
  optionalColumns: {
    parcels: {
      // Confirmées par le diagnostic du 16/11 sur le projet Supabase :
      createdAt: 'created_at',                 // date de création
      deliveredAt: 'delivered_at',             // date de livraison (remplie à la livraison)
      postponedReason: 'postponed_reason',     // motif de report et d'échec
      cancellationReason: 'cancellation_reason', // motif d'annulation
      // Absentes de la table parcels (laisser null tant qu'elles n'existent pas) :
      codAmount: null,        // montant à encaisser
      deliveryFee: null,      // frais de livraison
      parcelType: null,       // type de colis
      weight: null,           // poids
    },
    parcelEvents: { createdAt: 'created_at' },
  },

  // Espace de stockage Supabase pour les photos de preuve (null = désactivé)
  proofBucket: null,        // ex. 'delivery-proofs'

  // Fonction serveur de suivi public par tracking_token (null = indisponible)
  trackingRpc: null,        // ex. 'track_parcel'

  // Décision 4 : capacité provisoire selon le type de véhicule
  capacities: { moto: 5, scooter: 4, voiture: 8, velo: 3 },

  // Fond de carte : null = automatique (bascule entre plusieurs fournisseurs),
  // ou 'osm', 'carto', 'esri' pour en imposer un en premier.
  mapTiles: null,

  // Envoi AUTOMATIQUE de la position GPS des livreurs pendant le service
  gpsIntervalMs: 120000,   // envoi de sécurité au moins toutes les 2 minutes, même immobile
  gpsMoveMeters: 25,       // envoi dès que le livreur s'est déplacé d'au moins 25 m…
  gpsMinGapMs: 20000,      // …mais au plus une fois toutes les 20 secondes
  gpsMaxAccuracyM: 150,    // position trop imprécise : pas d'envoi lié au déplacement
  gpsQueueMax: 30,         // positions gardées sans connexion, envoyées au retour du réseau
  livePollMs: 30000,       // gestionnaire : relecture de sécurité des positions (lecture seule)

  // Rayon (km) autour d'un centre de quartier pour en déduire le quartier
  zoneRadiusKm: 1.2,

  // Mot de passe des comptes de démonstration (mode 'demo' uniquement)
  demoPassword: 'demo2026',
};
