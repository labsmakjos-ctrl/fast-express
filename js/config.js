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
  mode: 'demo',

  supabaseUrl: '',      // ex. 'https://abcdefghijkl.supabase.co'
  supabaseAnonKey: '',  // clé publique « anon »

  // Colonnes facultatives : leur existence n'a pas encore été confirmée.
  // Laissez null tant qu'elles ne sont pas confirmées ; indiquez le nom
  // exact de la colonne pour activer l'enregistrement correspondant.
  optionalColumns: {
    parcels: {
      createdAt: null,        // ex. 'created_at'
      codAmount: null,        // montant à encaisser, ex. 'cod_amount'
      deliveryFee: null,      // frais de livraison
      parcelType: null,       // type de colis
      weight: null,           // poids
      reason: null,           // colonne de motif (échec, report, annulation)
    },
    parcelEvents: { createdAt: 'created_at' },
  },

  // Espace de stockage Supabase pour les photos de preuve (null = désactivé)
  proofBucket: null,        // ex. 'delivery-proofs'

  // Fonction serveur de suivi public par tracking_token (null = indisponible)
  trackingRpc: null,        // ex. 'track_parcel'

  // Décision 4 : capacité provisoire selon le type de véhicule
  capacities: { moto: 5, scooter: 4, voiture: 8, velo: 3 },

  // Envoi de la position GPS des livreurs (millisecondes)
  gpsIntervalMs: 120000,

  // Rayon (km) autour d'un centre de quartier pour en déduire le quartier
  zoneRadiusKm: 1.2,

  // Mot de passe des comptes de démonstration (mode 'demo' uniquement)
  demoPassword: 'demo2026',
};
