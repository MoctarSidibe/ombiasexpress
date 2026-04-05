/**
 * OpenAPI 3.0 — Ombia Express API (documentation en français)
 * Servi sur http://SERVER:5002
 */
const spec = {
    openapi: '3.0.0',
    info: {
        title: 'Ombia Express — API',
        version: '1.0.0',
        description:
            `Documentation complète de l'API Ombia Express.\n\n` +
            `**Base URL :** \`http://37.60.240.199:5001/api\`\n\n` +
            `**Authentification :** JWT Bearer token — obtenez un token via \`POST /auth/login\`, ` +
            `puis ajoutez \`Authorization: Bearer <token>\` à chaque requête protégée.`,
        contact: { name: 'Ombia Express', email: 'support@ombia.app' },
    },
    servers: [{ url: 'http://37.60.240.199:5001/api', description: 'Serveur de production' }],

    components: {
        securitySchemes: {
            bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
        schemas: {
            Erreur: {
                type: 'object',
                properties: {
                    error: { type: 'string', example: 'Message d\'erreur' },
                },
            },
            Utilisateur: {
                type: 'object',
                properties: {
                    id:         { type: 'integer' },
                    name:       { type: 'string', example: 'Jean Dupont' },
                    email:      { type: 'string', example: 'jean@exemple.com' },
                    phone:      { type: 'string', example: '+24101234567' },
                    role:       { type: 'string', enum: ['rider', 'driver', 'renter', 'rental_owner', 'fleet_owner'] },
                    created_at: { type: 'string', format: 'date-time' },
                },
            },
            TokenAuth: {
                type: 'object',
                properties: {
                    token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
                    user:  { $ref: '#/components/schemas/Utilisateur' },
                },
            },
            Portefeuille: {
                type: 'object',
                properties: {
                    id:           { type: 'integer' },
                    balance:      { type: 'number', example: 15000 },
                    currency:     { type: 'string', example: 'XAF' },
                    card_number:  { type: 'string', example: '6246XXXXXXXXXXXX' },
                },
            },
            Transaction: {
                type: 'object',
                properties: {
                    id:          { type: 'integer' },
                    type:        { type: 'string', example: 'credit' },
                    amount:      { type: 'number', example: 5000 },
                    source:      { type: 'string', example: 'airtel_money' },
                    description: { type: 'string' },
                    created_at:  { type: 'string', format: 'date-time' },
                },
            },
            Course: {
                type: 'object',
                properties: {
                    id:            { type: 'integer' },
                    status:        { type: 'string', enum: ['requested', 'accepted', 'started', 'completed', 'cancelled'] },
                    pickup_address:   { type: 'string' },
                    dropoff_address:  { type: 'string' },
                    fare_amount:      { type: 'number', example: 2500 },
                    distance_km:      { type: 'number', example: 4.5 },
                    rider_id:         { type: 'integer' },
                    driver_id:        { type: 'integer' },
                    created_at:       { type: 'string', format: 'date-time' },
                },
            },
            Vehicule: {
                type: 'object',
                properties: {
                    id:           { type: 'integer' },
                    make:         { type: 'string', example: 'Toyota' },
                    model:        { type: 'string', example: 'Corolla' },
                    year:         { type: 'integer', example: 2020 },
                    license_plate:{ type: 'string', example: 'GA-1234-AB' },
                    status:       { type: 'string', enum: ['active', 'inactive', 'pending'] },
                },
            },
            VehiculeLocation: {
                type: 'object',
                properties: {
                    id:        { type: 'integer' },
                    make:      { type: 'string', example: 'Toyota' },
                    model:     { type: 'string', example: 'Land Cruiser' },
                    price_per_hour: { type: 'number', example: 5000 },
                    price_per_day:  { type: 'number', example: 35000 },
                    deposit_amount: { type: 'number', example: 50000 },
                    available:      { type: 'boolean' },
                },
            },
            Reservation: {
                type: 'object',
                properties: {
                    id:              { type: 'integer' },
                    status:          { type: 'string', enum: ['pending', 'approved', 'active', 'completed', 'cancelled'] },
                    requested_start: { type: 'string', format: 'date-time' },
                    requested_end:   { type: 'string', format: 'date-time' },
                    total_amount:    { type: 'number', example: 70000 },
                },
            },
            Produit: {
                type: 'object',
                properties: {
                    id:          { type: 'integer' },
                    name:        { type: 'string', example: 'Casque moto' },
                    price:       { type: 'number', example: 15000 },
                    stock:       { type: 'integer', example: 10 },
                    category:    { type: 'string' },
                    description: { type: 'string' },
                },
            },
            Commande: {
                type: 'object',
                properties: {
                    id:           { type: 'integer' },
                    status:       { type: 'string', enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] },
                    total_amount: { type: 'number', example: 25000 },
                    items:        { type: 'array', items: { type: 'object' } },
                },
            },
            Livraison: {
                type: 'object',
                properties: {
                    id:               { type: 'integer' },
                    status:           { type: 'string', enum: ['pending', 'accepted', 'picked_up', 'delivered', 'cancelled'] },
                    pickup_address:   { type: 'string' },
                    dropoff_address:  { type: 'string' },
                    price:            { type: 'number', example: 1500 },
                },
            },
        },
    },

    security: [{ bearerAuth: [] }],

    paths: {
        // ── AUTHENTIFICATION ─────────────────────────────────────────────────────
        '/auth/register': {
            post: {
                tags: ['Authentification'],
                summary: 'Créer un compte utilisateur',
                security: [],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['name', 'phone', 'password'],
                                properties: {
                                    name:     { type: 'string', example: 'Jean Dupont' },
                                    phone:    { type: 'string', example: '+24101234567' },
                                    email:    { type: 'string', example: 'jean@exemple.com' },
                                    password: { type: 'string', example: 'MotDePasse123' },
                                    role:     { type: 'string', enum: ['rider', 'driver', 'renter', 'rental_owner', 'fleet_owner'], example: 'rider' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    201: { description: 'Compte créé', content: { 'application/json': { schema: { $ref: '#/components/schemas/TokenAuth' } } } },
                    400: { description: 'Données invalides ou numéro déjà utilisé', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erreur' } } } },
                },
            },
        },
        '/auth/login': {
            post: {
                tags: ['Authentification'],
                summary: 'Se connecter',
                security: [],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['phone', 'password'],
                                properties: {
                                    phone:    { type: 'string', example: '+24101234567' },
                                    password: { type: 'string', example: 'MotDePasse123' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: { description: 'Connexion réussie', content: { 'application/json': { schema: { $ref: '#/components/schemas/TokenAuth' } } } },
                    401: { description: 'Identifiants incorrects' },
                    423: { description: 'Compte temporairement verrouillé (trop de tentatives)' },
                },
            },
        },
        '/auth/logout': {
            post: {
                tags: ['Authentification'],
                summary: 'Se déconnecter (invalide le token)',
                responses: {
                    200: { description: 'Déconnexion réussie' },
                },
            },
        },
        '/auth/me': {
            get: {
                tags: ['Authentification'],
                summary: 'Obtenir le profil de l\'utilisateur connecté',
                responses: {
                    200: { description: 'Profil utilisateur', content: { 'application/json': { schema: { $ref: '#/components/schemas/Utilisateur' } } } },
                },
            },
            put: {
                tags: ['Authentification'],
                summary: 'Mettre à jour le profil',
                requestBody: {
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    name:  { type: 'string' },
                                    email: { type: 'string' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: { description: 'Profil mis à jour' },
                },
            },
        },
        '/auth/change-password': {
            post: {
                tags: ['Authentification'],
                summary: 'Changer le mot de passe',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['current_password', 'new_password'],
                                properties: {
                                    current_password: { type: 'string' },
                                    new_password:     { type: 'string' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: { description: 'Mot de passe modifié' },
                    400: { description: 'Mot de passe actuel incorrect' },
                },
            },
        },

        // ── COURSES ──────────────────────────────────────────────────────────────
        '/rides/pricing': {
            get: {
                tags: ['Courses'],
                summary: 'Obtenir la grille tarifaire dynamique',
                responses: {
                    200: {
                        description: 'Tarifs actuels (base, par km, par minute, nuit, etc.)',
                        content: { 'application/json': { schema: { type: 'object' } } },
                    },
                },
            },
        },
        '/rides/request': {
            post: {
                tags: ['Courses'],
                summary: 'Demander une course',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['pickup_lat', 'pickup_lng', 'dropoff_lat', 'dropoff_lng'],
                                properties: {
                                    pickup_lat:      { type: 'number', example: 0.3924 },
                                    pickup_lng:      { type: 'number', example: 9.4536 },
                                    dropoff_lat:     { type: 'number', example: 0.3800 },
                                    dropoff_lng:     { type: 'number', example: 9.4400 },
                                    pickup_address:  { type: 'string', example: 'Carrefour IAI, Libreville' },
                                    dropoff_address: { type: 'string', example: 'Aéroport Léon Mba, Libreville' },
                                    vehicle_type:    { type: 'string', enum: ['car', 'moto', 'van'], example: 'car' },
                                    coupon_code:     { type: 'string', example: 'BIENVENUE50' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    201: { description: 'Course créée, en attente de chauffeur', content: { 'application/json': { schema: { $ref: '#/components/schemas/Course' } } } },
                    400: { description: 'Paramètres invalides' },
                },
            },
        },
        '/rides/{id}': {
            get: {
                tags: ['Courses'],
                summary: 'Détails d\'une course',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                responses: {
                    200: { description: 'Détails de la course', content: { 'application/json': { schema: { $ref: '#/components/schemas/Course' } } } },
                    404: { description: 'Course introuvable' },
                },
            },
        },
        '/rides/{id}/cancel': {
            post: {
                tags: ['Courses'],
                summary: 'Annuler une course',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                responses: {
                    200: { description: 'Course annulée' },
                    403: { description: 'Non autorisé' },
                },
            },
        },
        '/rides/{id}/rate': {
            post: {
                tags: ['Courses'],
                summary: 'Noter une course terminée',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['rating'],
                                properties: {
                                    rating:  { type: 'integer', minimum: 1, maximum: 5, example: 5 },
                                    comment: { type: 'string', example: 'Excellent chauffeur, très ponctuel !' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: { description: 'Note enregistrée' },
                },
            },
        },
        '/rides/history': {
            get: {
                tags: ['Courses'],
                summary: 'Historique des courses de l\'utilisateur',
                parameters: [
                    { name: 'page',   in: 'query', schema: { type: 'integer', default: 1 } },
                    { name: 'limit',  in: 'query', schema: { type: 'integer', default: 20 } },
                    { name: 'status', in: 'query', schema: { type: 'string' } },
                ],
                responses: {
                    200: { description: 'Liste des courses', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Course' } } } } },
                },
            },
        },

        // ── VÉHICULES ────────────────────────────────────────────────────────────
        '/vehicles': {
            get: {
                tags: ['Véhicules'],
                summary: 'Lister les véhicules de l\'utilisateur',
                responses: {
                    200: { description: 'Liste des véhicules', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Vehicule' } } } } },
                },
            },
            post: {
                tags: ['Véhicules'],
                summary: 'Ajouter un véhicule',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['make', 'model', 'year', 'license_plate'],
                                properties: {
                                    make:          { type: 'string', example: 'Toyota' },
                                    model:         { type: 'string', example: 'Corolla' },
                                    year:          { type: 'integer', example: 2020 },
                                    license_plate: { type: 'string', example: 'GA-1234-AB' },
                                    color:         { type: 'string', example: 'Blanc' },
                                    vehicle_type:  { type: 'string', enum: ['car', 'moto', 'van'] },
                                },
                            },
                        },
                    },
                },
                responses: {
                    201: { description: 'Véhicule ajouté' },
                },
            },
        },
        '/vehicles/{id}': {
            get: {
                tags: ['Véhicules'],
                summary: 'Détails d\'un véhicule',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                responses: { 200: { description: 'Détails du véhicule' } },
            },
            put: {
                tags: ['Véhicules'],
                summary: 'Mettre à jour un véhicule',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                requestBody: { content: { 'application/json': { schema: { type: 'object' } } } },
                responses: { 200: { description: 'Véhicule mis à jour' } },
            },
            delete: {
                tags: ['Véhicules'],
                summary: 'Supprimer un véhicule',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                responses: { 200: { description: 'Véhicule supprimé' } },
            },
        },

        // ── PORTEFEUILLE ─────────────────────────────────────────────────────────
        '/wallet': {
            get: {
                tags: ['Portefeuille'],
                summary: 'Solde et informations du portefeuille',
                responses: {
                    200: { description: 'Portefeuille', content: { 'application/json': { schema: { $ref: '#/components/schemas/Portefeuille' } } } },
                },
            },
        },
        '/wallet/transactions': {
            get: {
                tags: ['Portefeuille'],
                summary: 'Historique des transactions',
                parameters: [
                    { name: 'page',   in: 'query', schema: { type: 'integer', default: 1 } },
                    { name: 'limit',  in: 'query', schema: { type: 'integer', default: 20 } },
                    { name: 'type',   in: 'query', schema: { type: 'string', enum: ['credit', 'debit'] } },
                    { name: 'source', in: 'query', schema: { type: 'string' } },
                ],
                responses: {
                    200: { description: 'Liste des transactions', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Transaction' } } } } },
                },
            },
        },
        '/wallet/topup': {
            post: {
                tags: ['Portefeuille'],
                summary: 'Recharger le portefeuille (Airtel Money, Moov, carte bancaire)',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['amount', 'method'],
                                properties: {
                                    amount: { type: 'number', example: 10000 },
                                    method: { type: 'string', enum: ['airtel_money', 'moov_money', 'bank_card'], example: 'airtel_money' },
                                    phone:  { type: 'string', example: '+24107654321', description: 'Requis pour Airtel / Moov' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: { description: 'Rechargement initié' },
                    400: { description: 'Montant ou méthode invalide' },
                },
            },
        },
        '/wallet/transfer': {
            post: {
                tags: ['Portefeuille'],
                summary: 'Transférer de l\'argent à un autre membre Ombia',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['amount', 'recipient_phone'],
                                properties: {
                                    amount:          { type: 'number', example: 5000 },
                                    recipient_phone: { type: 'string', example: '+24101111111' },
                                    note:            { type: 'string', example: 'Remboursement déjeuner' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: { description: 'Transfert effectué' },
                    400: { description: 'Solde insuffisant ou destinataire introuvable' },
                },
            },
        },
        '/wallet/qr/generate': {
            post: {
                tags: ['Portefeuille'],
                summary: 'Générer un token QR de paiement (valide 10 min, usage unique)',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['amount'],
                                properties: { amount: { type: 'number', example: 3500 } },
                            },
                        },
                    },
                },
                responses: {
                    200: { description: 'Token QR généré', content: { 'application/json': { schema: { type: 'object', properties: { token: { type: 'string' }, qr_data: { type: 'string' } } } } } },
                },
            },
        },
        '/wallet/qr/pay': {
            post: {
                tags: ['Portefeuille'],
                summary: 'Payer via token QR (scan par le chauffeur/marchand)',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['token'],
                                properties: { token: { type: 'string' } },
                            },
                        },
                    },
                },
                responses: {
                    200: { description: 'Paiement QR effectué' },
                    400: { description: 'Token expiré, invalide ou déjà utilisé' },
                },
            },
        },

        // ── LOCATION DE VÉHICULES ────────────────────────────────────────────────
        '/rentals/cars': {
            get: {
                tags: ['Location de véhicules'],
                summary: 'Lister les véhicules disponibles à la location',
                parameters: [
                    { name: 'lat',  in: 'query', schema: { type: 'number' }, description: 'Latitude de recherche' },
                    { name: 'lng',  in: 'query', schema: { type: 'number' }, description: 'Longitude de recherche' },
                    { name: 'radius_km', in: 'query', schema: { type: 'number', default: 20 } },
                ],
                responses: {
                    200: { description: 'Véhicules disponibles', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/VehiculeLocation' } } } } },
                },
            },
        },
        '/rentals/cars/{id}': {
            get: {
                tags: ['Location de véhicules'],
                summary: 'Détails d\'un véhicule en location',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                responses: { 200: { description: 'Détails du véhicule', content: { 'application/json': { schema: { $ref: '#/components/schemas/VehiculeLocation' } } } } },
            },
        },
        '/rentals/book': {
            post: {
                tags: ['Location de véhicules'],
                summary: 'Réserver un véhicule',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['rental_car_id', 'requested_start', 'requested_end'],
                                properties: {
                                    rental_car_id:   { type: 'integer', example: 1 },
                                    requested_start: { type: 'string', format: 'date-time', example: '2026-04-10T09:00:00Z' },
                                    requested_end:   { type: 'string', format: 'date-time', example: '2026-04-12T09:00:00Z' },
                                    payment_method:  { type: 'string', enum: ['wallet', 'cash'], example: 'wallet' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    201: { description: 'Réservation créée, en attente de confirmation propriétaire', content: { 'application/json': { schema: { $ref: '#/components/schemas/Reservation' } } } },
                    409: { description: 'Véhicule non disponible sur cette période' },
                },
            },
        },
        '/rentals/bookings': {
            get: {
                tags: ['Location de véhicules'],
                summary: 'Mes réservations (locataire ou propriétaire)',
                responses: { 200: { description: 'Liste des réservations', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Reservation' } } } } } },
            },
        },
        '/rentals/bookings/{id}/cancel': {
            post: {
                tags: ['Location de véhicules'],
                summary: 'Annuler une réservation',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                responses: { 200: { description: 'Réservation annulée' } },
            },
        },
        '/rentals/bookings/{id}/rate': {
            post: {
                tags: ['Location de véhicules'],
                summary: 'Noter une location terminée',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['rating'],
                                properties: {
                                    rating:  { type: 'integer', minimum: 1, maximum: 5 },
                                    comment: { type: 'string' },
                                },
                            },
                        },
                    },
                },
                responses: { 200: { description: 'Note enregistrée' } },
            },
        },

        // ── PRODUITS & E-COMMERCE ────────────────────────────────────────────────
        '/products': {
            get: {
                tags: ['Produits & Boutique'],
                summary: 'Lister les produits disponibles',
                parameters: [
                    { name: 'category', in: 'query', schema: { type: 'string' } },
                    { name: 'search',   in: 'query', schema: { type: 'string' } },
                    { name: 'page',     in: 'query', schema: { type: 'integer', default: 1 } },
                ],
                responses: { 200: { description: 'Liste des produits', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Produit' } } } } } },
            },
            post: {
                tags: ['Produits & Boutique'],
                summary: 'Créer un produit (marchand)',
                requestBody: {
                    required: true,
                    content: {
                        'multipart/form-data': {
                            schema: {
                                type: 'object',
                                required: ['name', 'price'],
                                properties: {
                                    name:        { type: 'string' },
                                    price:       { type: 'number' },
                                    stock:       { type: 'integer' },
                                    category:    { type: 'string' },
                                    description: { type: 'string' },
                                    image:       { type: 'string', format: 'binary' },
                                },
                            },
                        },
                    },
                },
                responses: { 201: { description: 'Produit créé' } },
            },
        },
        '/products/{id}': {
            get: {
                tags: ['Produits & Boutique'],
                summary: 'Détails d\'un produit',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                responses: { 200: { description: 'Détails du produit', content: { 'application/json': { schema: { $ref: '#/components/schemas/Produit' } } } } },
            },
        },

        // ── COMMANDES ────────────────────────────────────────────────────────────
        '/orders': {
            get: {
                tags: ['Commandes'],
                summary: 'Mes commandes',
                responses: { 200: { description: 'Liste des commandes', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Commande' } } } } } },
            },
            post: {
                tags: ['Commandes'],
                summary: 'Passer une commande',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['items', 'delivery_address'],
                                properties: {
                                    items:            { type: 'array', items: { type: 'object', properties: { product_id: { type: 'integer' }, quantity: { type: 'integer' } } } },
                                    delivery_address: { type: 'string', example: 'Quartier Louis, Libreville' },
                                    payment_method:   { type: 'string', enum: ['wallet', 'cash'] },
                                },
                            },
                        },
                    },
                },
                responses: { 201: { description: 'Commande créée', content: { 'application/json': { schema: { $ref: '#/components/schemas/Commande' } } } } },
            },
        },
        '/orders/{id}/cancel': {
            post: {
                tags: ['Commandes'],
                summary: 'Annuler une commande',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                responses: { 200: { description: 'Commande annulée' } },
            },
        },

        // ── LIVRAISONS ───────────────────────────────────────────────────────────
        '/deliveries': {
            post: {
                tags: ['Livraisons'],
                summary: 'Créer une demande de livraison',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['pickup_address', 'dropoff_address', 'package_description'],
                                properties: {
                                    pickup_lat:          { type: 'number' },
                                    pickup_lng:          { type: 'number' },
                                    pickup_address:      { type: 'string', example: 'Marché Mont-Bouët, Libreville' },
                                    dropoff_lat:         { type: 'number' },
                                    dropoff_lng:         { type: 'number' },
                                    dropoff_address:     { type: 'string', example: 'PK12, Owendo' },
                                    package_description: { type: 'string', example: 'Colis fragile — vêtements' },
                                    payment_method:      { type: 'string', enum: ['wallet', 'cash'] },
                                },
                            },
                        },
                    },
                },
                responses: { 201: { description: 'Livraison créée' } },
            },
            get: {
                tags: ['Livraisons'],
                summary: 'Mes livraisons',
                responses: { 200: { description: 'Liste des livraisons', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Livraison' } } } } } },
            },
        },
        '/deliveries/{id}': {
            get: {
                tags: ['Livraisons'],
                summary: 'Détails d\'une livraison',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                responses: { 200: { description: 'Détails de la livraison' } },
            },
        },
        '/deliveries/{id}/cancel': {
            post: {
                tags: ['Livraisons'],
                summary: 'Annuler une livraison',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                responses: { 200: { description: 'Livraison annulée' } },
            },
        },

        // ── ANNONCES AUTO ────────────────────────────────────────────────────────
        '/car-listings': {
            get: {
                tags: ['Annonces Auto'],
                summary: 'Lister les véhicules à vendre',
                parameters: [
                    { name: 'make',   in: 'query', schema: { type: 'string' } },
                    { name: 'model',  in: 'query', schema: { type: 'string' } },
                    { name: 'min_price', in: 'query', schema: { type: 'number' } },
                    { name: 'max_price', in: 'query', schema: { type: 'number' } },
                ],
                responses: { 200: { description: 'Liste des annonces' } },
            },
            post: {
                tags: ['Annonces Auto'],
                summary: 'Publier une annonce de vente',
                requestBody: {
                    required: true,
                    content: {
                        'multipart/form-data': {
                            schema: {
                                type: 'object',
                                required: ['make', 'model', 'year', 'price'],
                                properties: {
                                    make:        { type: 'string' },
                                    model:       { type: 'string' },
                                    year:        { type: 'integer' },
                                    price:       { type: 'number' },
                                    mileage:     { type: 'integer' },
                                    description: { type: 'string' },
                                    images:      { type: 'string', format: 'binary' },
                                },
                            },
                        },
                    },
                },
                responses: { 201: { description: 'Annonce publiée' } },
            },
        },
        '/car-listings/{id}': {
            get: {
                tags: ['Annonces Auto'],
                summary: 'Détails d\'une annonce',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                responses: { 200: { description: 'Détails de l\'annonce' } },
            },
            delete: {
                tags: ['Annonces Auto'],
                summary: 'Supprimer une annonce',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                responses: { 200: { description: 'Annonce supprimée' } },
            },
        },

        // ── VÉRIFICATIONS KYC ────────────────────────────────────────────────────
        '/verifications/driver': {
            post: {
                tags: ['Vérifications KYC'],
                summary: 'Soumettre les documents chauffeur',
                requestBody: {
                    required: true,
                    content: {
                        'multipart/form-data': {
                            schema: {
                                type: 'object',
                                properties: {
                                    license_front:    { type: 'string', format: 'binary', description: 'Photo recto du permis' },
                                    license_back:     { type: 'string', format: 'binary', description: 'Photo verso du permis' },
                                    national_id:      { type: 'string', format: 'binary', description: 'Carte nationale d\'identité' },
                                    selfie:           { type: 'string', format: 'binary', description: 'Selfie de vérification' },
                                },
                            },
                        },
                    },
                },
                responses: { 200: { description: 'Documents soumis, en attente de validation' } },
            },
            get: {
                tags: ['Vérifications KYC'],
                summary: 'Statut KYC chauffeur',
                responses: { 200: { description: 'Statut et raison du refus éventuel' } },
            },
        },
        '/verifications/car': {
            post: {
                tags: ['Vérifications KYC'],
                summary: 'Soumettre les documents véhicule (carte grise, assurance)',
                requestBody: {
                    required: true,
                    content: {
                        'multipart/form-data': {
                            schema: {
                                type: 'object',
                                properties: {
                                    vehicle_id:       { type: 'integer' },
                                    registration_doc: { type: 'string', format: 'binary' },
                                    insurance_doc:    { type: 'string', format: 'binary' },
                                    inspection_doc:   { type: 'string', format: 'binary' },
                                },
                            },
                        },
                    },
                },
                responses: { 200: { description: 'Documents soumis' } },
            },
        },
        '/verifications/merchant': {
            post: {
                tags: ['Vérifications KYC'],
                summary: 'Soumettre les documents marchand (RCCM, boutique)',
                requestBody: {
                    required: true,
                    content: {
                        'multipart/form-data': {
                            schema: {
                                type: 'object',
                                properties: {
                                    business_name:    { type: 'string', example: 'Garage Auto Libreville' },
                                    rccm_doc:         { type: 'string', format: 'binary' },
                                    store_photos:     { type: 'string', format: 'binary' },
                                },
                            },
                        },
                    },
                },
                responses: { 200: { description: 'Documents soumis' } },
            },
        },

        // ── COUPONS ──────────────────────────────────────────────────────────────
        '/coupons/validate': {
            post: {
                tags: ['Coupons & Promotions'],
                summary: 'Valider un code promo',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['code'],
                                properties: {
                                    code:   { type: 'string', example: 'BIENVENUE50' },
                                    amount: { type: 'number', example: 5000, description: 'Montant de la commande pour calculer la réduction' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: { description: 'Coupon valide', content: { 'application/json': { schema: { type: 'object', properties: { discount: { type: 'number' }, final_amount: { type: 'number' } } } } } },
                    400: { description: 'Coupon invalide, expiré ou déjà utilisé' },
                },
            },
        },

        // ── SUPPORT ──────────────────────────────────────────────────────────────
        '/support/tickets': {
            get: {
                tags: ['Support Client'],
                summary: 'Mes tickets de support',
                responses: { 200: { description: 'Liste des tickets' } },
            },
            post: {
                tags: ['Support Client'],
                summary: 'Ouvrir un ticket de support',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['subject', 'message'],
                                properties: {
                                    subject:  { type: 'string', example: 'Problème de paiement' },
                                    message:  { type: 'string', example: 'Mon rechargement Airtel n\'a pas été crédité.' },
                                    category: { type: 'string', enum: ['paiement', 'course', 'location', 'livraison', 'autre'] },
                                },
                            },
                        },
                    },
                },
                responses: { 201: { description: 'Ticket créé' } },
            },
        },
        '/support/tickets/{id}/reply': {
            post: {
                tags: ['Support Client'],
                summary: 'Répondre à un ticket',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { type: 'object', required: ['message'], properties: { message: { type: 'string' } } },
                        },
                    },
                },
                responses: { 200: { description: 'Réponse envoyée' } },
            },
        },

        // ── AUTHENTIFICATION MULTI-FACTEURS ──────────────────────────────────────
        '/mfa/setup': {
            post: {
                tags: ['MFA (2FA)'],
                summary: 'Activer l\'authentification à deux facteurs (TOTP)',
                responses: { 200: { description: 'QR code et clé secrète TOTP renvoyés', content: { 'application/json': { schema: { type: 'object', properties: { qr_url: { type: 'string' }, secret: { type: 'string' } } } } } } },
            },
        },
        '/mfa/verify': {
            post: {
                tags: ['MFA (2FA)'],
                summary: 'Vérifier le code TOTP et activer le 2FA',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { type: 'object', required: ['token'], properties: { token: { type: 'string', example: '123456' } } },
                        },
                    },
                },
                responses: {
                    200: { description: '2FA activé' },
                    400: { description: 'Code invalide' },
                },
            },
        },
        '/mfa/disable': {
            post: {
                tags: ['MFA (2FA)'],
                summary: 'Désactiver le 2FA',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { type: 'object', required: ['token'], properties: { token: { type: 'string' } } },
                        },
                    },
                },
                responses: { 200: { description: '2FA désactivé' } },
            },
        },

        // ── ADMINISTRATION ───────────────────────────────────────────────────────
        '/admin/stats': {
            get: {
                tags: ['Administration'],
                summary: 'Statistiques générales du tableau de bord',
                description: '⚠️ Requiert un token administrateur',
                responses: { 200: { description: 'KPIs : utilisateurs, courses, revenus, KYC en attente…' } },
            },
        },
        '/admin/users': {
            get: {
                tags: ['Administration'],
                summary: 'Lister tous les utilisateurs',
                parameters: [
                    { name: 'role',   in: 'query', schema: { type: 'string' } },
                    { name: 'search', in: 'query', schema: { type: 'string' } },
                    { name: 'page',   in: 'query', schema: { type: 'integer', default: 1 } },
                ],
                responses: { 200: { description: 'Liste des utilisateurs' } },
            },
        },
        '/admin/users/{id}/ban': {
            post: {
                tags: ['Administration'],
                summary: 'Bannir / débannir un utilisateur',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                responses: { 200: { description: 'Statut mis à jour' } },
            },
        },
        '/admin/kyc/drivers': {
            get: {
                tags: ['Administration'],
                summary: 'Demandes KYC chauffeur en attente',
                responses: { 200: { description: 'Liste des KYC' } },
            },
        },
        '/admin/kyc/drivers/{id}/approve': {
            post: {
                tags: ['Administration'],
                summary: 'Approuver un KYC chauffeur',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                responses: { 200: { description: 'KYC approuvé, rôle mis à jour' } },
            },
        },
        '/admin/kyc/drivers/{id}/reject': {
            post: {
                tags: ['Administration'],
                summary: 'Rejeter un KYC chauffeur',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { type: 'object', required: ['reason'], properties: { reason: { type: 'string', example: 'Document illisible' } } },
                        },
                    },
                },
                responses: { 200: { description: 'KYC rejeté' } },
            },
        },
        '/admin/rides': {
            get: {
                tags: ['Administration'],
                summary: 'Toutes les courses',
                parameters: [
                    { name: 'status', in: 'query', schema: { type: 'string' } },
                    { name: 'page',   in: 'query', schema: { type: 'integer', default: 1 } },
                ],
                responses: { 200: { description: 'Liste des courses' } },
            },
        },
    },

    tags: [
        { name: 'Authentification',      description: 'Inscription, connexion, profil, mot de passe' },
        { name: 'Courses',               description: 'Demande, suivi et historique des courses' },
        { name: 'Véhicules',             description: 'Gestion des véhicules (chauffeur/propriétaire)' },
        { name: 'Portefeuille',          description: 'Solde, transactions, recharge, transfert, QR Pay' },
        { name: 'Location de véhicules', description: 'Recherche, réservation et suivi de location' },
        { name: 'Produits & Boutique',   description: 'Catalogue produits et gestion marchand' },
        { name: 'Commandes',             description: 'Commandes e-commerce' },
        { name: 'Livraisons',            description: 'Service de livraison de colis' },
        { name: 'Annonces Auto',         description: 'Vente / achat de véhicules entre particuliers' },
        { name: 'Vérifications KYC',     description: 'Soumission et suivi des documents d\'identité' },
        { name: 'Coupons & Promotions',  description: 'Codes promo et réductions' },
        { name: 'Support Client',        description: 'Tickets d\'assistance' },
        { name: 'MFA (2FA)',             description: 'Authentification à deux facteurs TOTP' },
        { name: 'Administration',        description: '⚠️ Routes réservées aux administrateurs' },
    ],
};

module.exports = spec;
