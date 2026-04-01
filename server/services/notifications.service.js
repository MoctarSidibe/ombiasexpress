// Node 18+ has native fetch — no dependency needed
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Send a push notification to one or multiple Expo push tokens.
 *
 * @param {string|string[]} tokens   - Expo push token(s)
 * @param {string}  title
 * @param {string}  body
 * @param {object}  data             - Extra payload for notification tap handling
 * @param {string}  [channelId]      - Android channel (default: 'ombia')
 */
const sendPush = async (tokens, title, body, data = {}, channelId = 'ombia') => {
    const tokenList = Array.isArray(tokens) ? tokens : [tokens];
    const valid = tokenList.filter(t => t && t.startsWith('ExponentPushToken'));

    if (valid.length === 0) return;

    const messages = valid.map(to => ({
        to,
        title,
        body,
        data,
        sound: 'default',
        channelId,
        priority: 'high',
    }));

    try {
        const res = await fetch(EXPO_PUSH_URL, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body:    JSON.stringify(messages),
        });
        const json = await res.json();
        const errors = json.data?.filter(r => r.status === 'error') || [];
        if (errors.length) console.error('[Push] Errors:', errors);
    } catch (e) {
        console.error('[Push] Failed to send:', e.message);
    }
};

/**
 * Send push to a single User model instance (or userId + token).
 * Pass the User sequelize object — it reads push_token automatically.
 */
const sendToUser = async (user, title, body, data = {}) => {
    if (!user?.push_token) return;
    await sendPush(user.push_token, title, body, data);
};

// ── Typed notification helpers ─────────────────────────────────────────────────

module.exports = {
    sendPush,
    sendToUser,

    rideAccepted: (rider, rideId, driverName) =>
        sendToUser(rider, '🚗 Chauffeur trouvé !', `${driverName} est en route vers vous.`, { type: 'ride_accepted', rideId }),

    driverArrived: (rider, rideId) =>
        sendToUser(rider, '📍 Chauffeur arrivé', 'Votre chauffeur vous attend.', { type: 'driver_arrived', rideId }),

    rideStarted: (rider, rideId) =>
        sendToUser(rider, '🛣️ Trajet commencé', 'Bon voyage !', { type: 'ride_started', rideId }),

    rideCompleted: (rider, rideId, fare) =>
        sendToUser(rider, '✅ Trajet terminé', `Montant : ${Number(fare).toLocaleString('fr-FR')} XAF`, { type: 'ride_completed', rideId }),

    rideCancelled: (user, rideId) =>
        sendToUser(user, '❌ Trajet annulé', 'Le trajet a été annulé.', { type: 'ride_cancelled', rideId }),

    newRideRequest: (driver, rideId) =>
        sendToUser(driver, '🔔 Nouvelle demande', 'Un passager cherche un chauffeur près de vous.', { type: 'new_ride_request', rideId }),

    rentalBookingRequest: (owner, bookingId, renterName) =>
        sendToUser(owner, '📋 Nouvelle réservation', `${renterName} souhaite louer votre véhicule.`, { type: 'rental_booking_request', bookingId }),

    rentalApproved: (renter, bookingId) =>
        sendToUser(renter, '✅ Réservation approuvée', 'Le propriétaire a accepté votre demande de location.', { type: 'rental_booking_approved', bookingId }),

    rentalRejected: (renter, bookingId) =>
        sendToUser(renter, '❌ Réservation refusée', 'Le propriétaire n\'a pas pu accepter votre demande.', { type: 'rental_booking_rejected', bookingId }),

    rentalStarted: (renter, bookingId) =>
        sendToUser(renter, '🔑 Location démarrée', 'Bonne route !', { type: 'rental_started', bookingId }),

    rentalCompleted: (user, bookingId) =>
        sendToUser(user, '✅ Location terminée', 'Merci d\'avoir utilisé Ombia Express.', { type: 'rental_completed', bookingId }),

    walletCredit: (user, amount, source) =>
        sendToUser(user, '💰 Portefeuille crédité', `+${Number(amount).toLocaleString('fr-FR')} XAF (${source})`, { type: 'wallet_credit' }),

    walletTransfer: (recipient, amount, senderName) =>
        sendToUser(recipient, '💸 Transfert reçu', `${senderName} vous a envoyé ${Number(amount).toLocaleString('fr-FR')} XAF`, { type: 'wallet_transfer' }),

    kycApproved: (user, kycType) =>
        sendToUser(user, '🎉 Vérification approuvée !', 'Votre compte a été validé. Le service est maintenant actif.', { type: 'kyc_approved', kycType }),

    kycRejected: (user, kycType) =>
        sendToUser(user, '❌ Vérification refusée', 'Votre dossier n\'a pas été approuvé. Consultez les détails.', { type: 'kyc_rejected', kycType }),

    // ── Vehicle ─────────────────────────────────────────────────────────────
    vehicleApproved: (driver, vehicleId) =>
        sendToUser(driver, '✅ Véhicule approuvé', 'Votre véhicule a été validé. Vous pouvez maintenant accepter des courses.', { type: 'vehicle_approved', vehicleId }),

    vehicleRejected: (driver, vehicleId) =>
        sendToUser(driver, '❌ Véhicule refusé', 'Votre véhicule n\'a pas été approuvé. Vérifiez les informations et réessayez.', { type: 'vehicle_rejected', vehicleId }),

    vehicleSuspended: (driver, vehicleId) =>
        sendToUser(driver, '⏸ Véhicule suspendu', 'Votre véhicule a été suspendu. Contactez le support pour plus d\'informations.', { type: 'vehicle_suspended', vehicleId }),

    // ── Rental car listing ───────────────────────────────────────────────────
    rentalCarApproved: (owner, carId, make, model) =>
        sendToUser(owner, '✅ Annonce approuvée', `Votre ${make} ${model} est maintenant disponible à la location.`, { type: 'rental_car_approved', carId }),

    rentalCarSuspended: (owner, carId, adminNotes) =>
        sendToUser(owner, '⏸ Annonce suspendue', adminNotes || 'Votre annonce de location a été suspendue.', { type: 'rental_car_suspended', carId }),

    // ── Physical card ────────────────────────────────────────────────────────
    cardStatusChanged: (user, status) => {
        const msgs = {
            printing:  ['🖨 Carte en production',   'Votre carte Ombia est en cours d\'impression.'],
            shipped:   ['🚚 Carte expédiée',         'Votre carte Ombia est en route vers vous.'],
            delivered: ['💳 Carte livrée !',          'Votre carte NFC Ombia est arrivée. Activez-la depuis l\'appli.'],
        };
        const [title, body] = msgs[status] || ['📬 Statut carte mis à jour', `Nouveau statut : ${status}`];
        return sendToUser(user, title, body, { type: 'card_status_changed', status });
    },

    // ── E-commerce orders ────────────────────────────────────────────────────
    orderPlaced: (seller, orderId, buyerName, total) =>
        sendToUser(seller, '🛒 Nouvelle commande !', `${buyerName} vient de passer une commande de ${Number(total).toLocaleString('fr-FR')} XAF.`, { type: 'new_order', orderId }),

    orderStatusChanged: (buyer, orderId, status) => {
        const msgs = {
            confirmed: ['✅ Commande confirmée',  'Le vendeur a confirmé votre commande.'],
            ready:     ['📦 Commande prête',       'Votre commande est prête pour la livraison / le retrait.'],
            delivered: ['🎉 Commande livrée',      'Votre commande a été livrée. Merci !'],
            cancelled: ['❌ Commande annulée',     'Votre commande a été annulée.'],
        };
        const [title, body] = msgs[status] || ['📬 Commande mise à jour', `Statut : ${status}`];
        return sendToUser(buyer, title, body, { type: 'order_status_changed', orderId, status });
    },

    orderCancelledBySeller: (buyer, orderId) =>
        sendToUser(buyer, '❌ Commande annulée', 'Le vendeur a annulé votre commande.', { type: 'order_cancelled', orderId }),

    orderCancelledByBuyer: (seller, orderId, buyerName) =>
        sendToUser(seller, '↩️ Commande annulée', `${buyerName} a annulé sa commande.`, { type: 'order_cancelled', orderId }),

    // ── Car sales listings ───────────────────────────────────────────────────
    carListingApproved: (user, listingId) =>
        sendToUser(user, '✅ Annonce publiée', 'Votre annonce de vente a été approuvée et est maintenant visible.', { type: 'car_listing_approved', listingId }),

    carListingRejected: (user, listingId) =>
        sendToUser(user, '❌ Annonce refusée', 'Votre annonce de vente n\'a pas été approuvée.', { type: 'car_listing_rejected', listingId }),
};
