const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { Wallet, WalletTransaction, WalletFeature, User } = require('../models');
const { auth } = require('../middleware/auth.middleware');
const { sequelize } = require('../config/database');
const { getSetting } = require('../services/settings.service');

// ── QR payment token store (in-memory, 10-min TTL, one-use) ──────────────────
const qrTokenStore = new Map();
setInterval(() => {
    const now = Date.now();
    for (const [k, v] of qrTokenStore) {
        if (v.expires_at < now) qrTokenStore.delete(k);
    }
}, 15 * 60 * 1000);

const signQR = (token, driverId, amount) =>
    crypto.createHmac('sha256', process.env.JWT_SECRET || 'ombia_secret')
          .update(`${token}|${driverId}|${amount}`)
          .digest('hex');

const router = express.Router();

// ── Luhn check digit — ensures card number passes ISO/IEC 7812 validation ─────
const luhnCheckDigit = (partial) => {
    const digits = partial.split('').map(Number);
    let sum = 0, shouldDouble = true;
    for (let i = digits.length - 1; i >= 0; i--) {
        let d = digits[i];
        if (shouldDouble) { d *= 2; if (d > 9) d -= 9; }
        sum += d;
        shouldDouble = !shouldDouble;
    }
    return ((10 - (sum % 10)) % 10).toString();
};

// ── Generate unique Luhn-valid 16-digit card number (BIN 6246 = Ombia) ────────
const generateCardNumber = async () => {
    let num, exists;
    do {
        // 4 (BIN) + 11 random + 1 Luhn check digit = 16
        const rand = Array.from({ length: 11 }, () => Math.floor(Math.random() * 10)).join('');
        const partial = '6246' + rand;
        num = partial + luhnCheckDigit(partial);
        exists = await Wallet.findOne({ where: { card_number: num } });
    } while (exists);
    return num;
};

// ── Helper: get or create wallet for user ─────────────────────────────────────
const getOrCreateWallet = async (userId) => {
    let wallet = await Wallet.findOne({ where: { user_id: userId } });
    if (!wallet) {
        wallet = await Wallet.create({ user_id: userId, balance: 0.00, card_number: await generateCardNumber() });
    } else if (!wallet.card_number) {
        await wallet.update({ card_number: await generateCardNumber() });
    }
    return wallet;
};

// ── GET /api/wallet/balance ───────────────────────────────────────────────────
router.get('/balance', auth, async (req, res) => {
    try {
        const wallet = await getOrCreateWallet(req.user.id);
        res.json({
            balance:     parseFloat(wallet.balance),
            currency:    wallet.currency,
            is_active:   wallet.is_active,
            card_number: wallet.card_number,
        });
    } catch (error) {
        console.error('Wallet balance error:', error);
        res.status(500).json({ error: 'Impossible de récupérer le solde' });
    }
});

// ── GET /api/wallet/transactions ──────────────────────────────────────────────
router.get('/transactions', auth, async (req, res) => {
    try {
        const wallet = await getOrCreateWallet(req.user.id);
        const page  = Math.max(1, parseInt(req.query.page)  || 1);
        const limit = Math.min(50, parseInt(req.query.limit) || 20);
        const offset = (page - 1) * limit;

        const { count, rows } = await WalletTransaction.findAndCountAll({
            where: { wallet_id: wallet.id },
            order: [['created_at', 'DESC']],
            limit,
            offset
        });

        res.json({
            transactions: rows,
            total: count,
            page,
            total_pages: Math.ceil(count / limit)
        });
    } catch (error) {
        console.error('Wallet transactions error:', error);
        res.status(500).json({ error: 'Impossible de récupérer les transactions' });
    }
});

// ── POST /api/wallet/topup ────────────────────────────────────────────────────
// Simulated top-up (real Airtel/Moov/Card API will plug here later)
router.post('/topup', auth, [
    body('amount').isFloat({ min: 100 }).withMessage('Montant minimum : 100 XAF'),
    body('method').isIn(['airtel_money', 'moov_money', 'bank_card']).withMessage('Méthode invalide'),
    body('phone_or_card').optional().isString()
], async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const { amount, method, phone_or_card } = req.body;
        const wallet = await getOrCreateWallet(req.user.id);

        if (!wallet.is_active) {
            await t.rollback();
            return res.status(403).json({ error: 'Portefeuille désactivé' });
        }

        const newBalance = parseFloat(wallet.balance) + parseFloat(amount);

        // Simulated reference — replace with real provider reference later
        const reference = `SIM-${method.toUpperCase()}-${uuidv4().slice(0, 8).toUpperCase()}`;

        await wallet.update({ balance: newBalance }, { transaction: t });
        await WalletTransaction.create({
            wallet_id:     wallet.id,
            type:          'credit',
            amount:        parseFloat(amount),
            balance_after: newBalance,
            source:        method,
            reference,
            status:        'completed',
            description:   `Recharge via ${method.replace('_', ' ')}`,
            metadata: {
                simulated: true,
                phone_or_card: phone_or_card || null,
                note: 'Real API integration pending'
            }
        }, { transaction: t });

        await t.commit();

        res.json({
            message: 'Recharge effectuée avec succès',
            reference,
            amount: parseFloat(amount),
            new_balance: newBalance,
            currency: wallet.currency
        });
    } catch (error) {
        await t.rollback();
        console.error('Wallet topup error:', error);
        res.status(500).json({ error: 'Échec de la recharge' });
    }
});

// ── POST /api/wallet/withdraw ─────────────────────────────────────────────────
router.post('/withdraw', auth, [
    body('amount').isFloat({ min: 500 }).withMessage('Montant minimum de retrait : 500 XAF'),
    body('method').isIn(['airtel_money', 'moov_money', 'bank_card']).withMessage('Méthode invalide'),
    body('account').notEmpty().withMessage('Numéro de compte ou téléphone requis')
], async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const { amount, method, account } = req.body;
        const wallet = await getOrCreateWallet(req.user.id);

        if (!wallet.is_active) {
            await t.rollback();
            return res.status(403).json({ error: 'Portefeuille désactivé' });
        }

        if (parseFloat(wallet.balance) < parseFloat(amount)) {
            await t.rollback();
            return res.status(400).json({
                error: `Solde insuffisant. Solde disponible : ${parseFloat(wallet.balance).toFixed(0)} XAF`
            });
        }

        const newBalance = parseFloat(wallet.balance) - parseFloat(amount);
        const reference = `WD-${method.toUpperCase()}-${uuidv4().slice(0, 8).toUpperCase()}`;

        await wallet.update({ balance: newBalance }, { transaction: t });
        await WalletTransaction.create({
            wallet_id:     wallet.id,
            type:          'debit',
            amount:        parseFloat(amount),
            balance_after: newBalance,
            source:        'withdrawal',
            reference,
            status:        'completed',
            description:   `Retrait vers ${method.replace('_', ' ')} (${account})`,
            metadata: { simulated: true, account, note: 'Real API integration pending' }
        }, { transaction: t });

        await t.commit();

        res.json({
            message: 'Retrait effectué avec succès',
            reference,
            amount: parseFloat(amount),
            new_balance: newBalance,
            currency: wallet.currency
        });
    } catch (error) {
        await t.rollback();
        console.error('Wallet withdraw error:', error);
        res.status(500).json({ error: 'Échec du retrait' });
    }
});

// ── POST /api/wallet/generate-payment-qr ──────────────────────────────────────
// Driver calls this to create a one-time QR that the rider scans to pay.
router.post('/generate-payment-qr', auth, [
    body('amount').isFloat({ min: 100 }).withMessage('Montant minimum : 100 XAF'),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { amount, ride_id } = req.body;
    const driverId  = req.user.id;
    const token     = uuidv4();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    const sig       = signQR(token, driverId, parseFloat(amount));

    qrTokenStore.set(token, {
        driver_id:  driverId,
        amount:     parseFloat(amount),
        ride_id:    ride_id || null,
        expires_at: expiresAt,
        sig,
        used: false,
    });

    res.json({
        payload: { v: 1, t: token, a: parseFloat(amount), d: driverId, e: expiresAt, s: sig },
        expires_in_seconds: 600,
    });
});

// ── POST /api/wallet/scan-pay ──────────────────────────────────────────────────
// Rider submits the scanned QR payload; server verifies and transfers funds.
router.post('/scan-pay', auth, async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { qr_data } = req.body;
        if (!qr_data) { await t.rollback(); return res.status(400).json({ error: 'Données QR manquantes' }); }

        let payload;
        try { payload = typeof qr_data === 'string' ? JSON.parse(qr_data) : qr_data; }
        catch { await t.rollback(); return res.status(400).json({ error: 'QR code invalide' }); }

        const { t: token, a: amount, d: driverId, e: expiresAt, s: sig } = payload;
        if (!token || !amount || !driverId || !expiresAt || !sig) {
            await t.rollback();
            return res.status(400).json({ error: 'QR code invalide ou incomplet' });
        }

        // Verify HMAC signature
        if (sig !== signQR(token, driverId, amount)) {
            await t.rollback();
            return res.status(400).json({ error: 'QR code invalide ou modifié' });
        }

        // Check expiry
        if (Date.now() > expiresAt) {
            await t.rollback();
            return res.status(400).json({ error: 'QR code expiré — demandez au conducteur d\'en générer un nouveau.' });
        }

        // Check token in store + used flag
        const stored = qrTokenStore.get(token);
        if (!stored || stored.used) {
            await t.rollback();
            return res.status(400).json({ error: 'QR code déjà utilisé ou invalide' });
        }

        // Prevent self-payment
        if (req.user.id === driverId) {
            await t.rollback();
            return res.status(400).json({ error: 'Vous ne pouvez pas vous payer vous-même' });
        }

        // Get rider (payer) wallet
        const riderWallet = await getOrCreateWallet(req.user.id);
        if (!riderWallet.is_active) { await t.rollback(); return res.status(403).json({ error: 'Votre portefeuille est désactivé' }); }
        if (parseFloat(riderWallet.balance) < amount) {
            await t.rollback();
            return res.status(400).json({
                error: `Solde insuffisant. Disponible : ${parseFloat(riderWallet.balance).toFixed(0)} XAF, requis : ${parseFloat(amount).toFixed(0)} XAF`
            });
        }

        // Get driver (payee) wallet
        const driverWallet    = await getOrCreateWallet(driverId);
        const riderNewBalance  = parseFloat(riderWallet.balance)  - parseFloat(amount);
        const driverNewBalance = parseFloat(driverWallet.balance) + parseFloat(amount);
        const txRef = `QR-${token.slice(0, 8).toUpperCase()}`;

        // Debit rider
        await riderWallet.update({ balance: riderNewBalance }, { transaction: t });
        await WalletTransaction.create({
            wallet_id:     riderWallet.id,
            type:          'debit',
            amount:        parseFloat(amount),
            balance_after: riderNewBalance,
            source:        'ride_payment',
            reference:     txRef,
            status:        'completed',
            description:   `Paiement QR Ombia — ${parseFloat(amount).toFixed(0)} XAF`,
            metadata:      { qr_token: token, driver_id: driverId, ride_id: stored.ride_id },
        }, { transaction: t });

        // Credit driver
        await driverWallet.update({ balance: driverNewBalance }, { transaction: t });
        await WalletTransaction.create({
            wallet_id:     driverWallet.id,
            type:          'credit',
            amount:        parseFloat(amount),
            balance_after: driverNewBalance,
            source:        'ride_earning',
            reference:     txRef,
            status:        'completed',
            description:   `Reçu paiement QR — ${parseFloat(amount).toFixed(0)} XAF`,
            metadata:      { qr_token: token, rider_id: req.user.id, ride_id: stored.ride_id },
        }, { transaction: t });

        await t.commit();
        stored.used = true; // mark one-use

        res.json({
            message:            'Paiement effectué avec succès',
            amount:             parseFloat(amount),
            reference:          txRef,
            rider_new_balance:  riderNewBalance,
        });
    } catch (error) {
        await t.rollback();
        console.error('QR scan-pay error:', error);
        res.status(500).json({ error: 'Échec du paiement' });
    }
});

// ── POST /api/wallet/request-physical-card ────────────────────────────────────
router.post('/request-physical-card', auth, [
    body('full_name').notEmpty().withMessage('Nom complet requis'),
    body('phone').notEmpty().withMessage('Téléphone requis'),
    body('address').notEmpty().withMessage('Adresse de livraison requise'),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
        const wallet = await getOrCreateWallet(req.user.id);
        if (wallet.physical_card_status !== 'none') {
            return res.status(400).json({
                error: wallet.physical_card_status === 'delivered'
                    ? 'Vous avez déjà une carte Ombia Express active.'
                    : `Demande déjà en cours (statut : ${wallet.physical_card_status}).`
            });
        }

        await wallet.update({ physical_card_requested: true, physical_card_status: 'pending' });

        await WalletTransaction.create({
            wallet_id:     wallet.id,
            type:          'credit',
            amount:        0,
            balance_after: parseFloat(wallet.balance),
            source:        'promo',
            reference:     `CARD-REQ-${uuidv4().slice(0, 8).toUpperCase()}`,
            status:        'completed',
            description:   'Demande de carte Ombia Express soumise',
            metadata:      { full_name: req.body.full_name, phone: req.body.phone, address: req.body.address, payment_method: req.body.payment_method || null, amount_paid: req.body.amount || null, requested_at: new Date().toISOString() }
        });

        const deliveryTime = await getSetting('physical_card_delivery', '24–48h');
        res.json({ message: `Commande confirmée ! Votre carte Ombia Express sera livrée sous ${deliveryTime}.`, status: 'pending', delivery_time: deliveryTime });
    } catch (error) {
        console.error('Card request error:', error);
        res.status(500).json({ error: 'Échec de la demande' });
    }
});

// ── POST /api/wallet/register-nfc-card ───────────────────────────────────────
router.post('/register-nfc-card', auth, [
    body('card_uid').notEmpty().withMessage('UID de carte requis'),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
        const { card_uid } = req.body;
        const existing = await Wallet.findOne({ where: { nfc_card_uid: card_uid } });
        if (existing && existing.user_id !== req.user.id) {
            return res.status(409).json({ error: 'Cette carte est déjà liée à un autre compte.' });
        }
        const wallet = await getOrCreateWallet(req.user.id);
        await wallet.update({ nfc_card_uid: card_uid });
        res.json({ message: 'Carte NFC liée avec succès', card_uid });
    } catch (error) {
        console.error('NFC register error:', error);
        res.status(500).json({ error: 'Échec de l\'enregistrement' });
    }
});

// ── POST /api/wallet/nfc-pay ──────────────────────────────────────────────────
// Driver reads rider's NFC card → triggers wallet-to-wallet payment.
router.post('/nfc-pay', auth, [
    body('card_uid').notEmpty().withMessage('UID de carte requis'),
    body('amount').isFloat({ min: 100 }).withMessage('Montant minimum : 100 XAF'),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const t = await sequelize.transaction();
    try {
        const { card_uid, amount, ride_id } = req.body;
        const payerWallet = await Wallet.findOne({ where: { nfc_card_uid: card_uid } });
        if (!payerWallet) { await t.rollback(); return res.status(404).json({ error: 'Aucun portefeuille associé à cette carte Ombia.' }); }
        if (!payerWallet.is_active) { await t.rollback(); return res.status(403).json({ error: 'Le portefeuille de cette carte est désactivé.' }); }
        if (payerWallet.user_id === req.user.id) { await t.rollback(); return res.status(400).json({ error: 'Vous ne pouvez pas vous payer vous-même.' }); }
        if (parseFloat(payerWallet.balance) < amount) {
            await t.rollback();
            return res.status(400).json({ error: `Solde insuffisant sur la carte. Disponible : ${parseFloat(payerWallet.balance).toFixed(0)} XAF` });
        }

        const receiverWallet     = await getOrCreateWallet(req.user.id);
        const payerNewBalance    = parseFloat(payerWallet.balance)   - parseFloat(amount);
        const receiverNewBalance = parseFloat(receiverWallet.balance) + parseFloat(amount);
        const txRef = `NFC-${card_uid.slice(-6).toUpperCase()}-${uuidv4().slice(0, 6).toUpperCase()}`;

        await payerWallet.update({ balance: payerNewBalance }, { transaction: t });
        await WalletTransaction.create({
            wallet_id: payerWallet.id, type: 'debit', amount: parseFloat(amount),
            balance_after: payerNewBalance, source: 'ride_payment', reference: txRef, status: 'completed',
            description: `Paiement Ombia Card — ${parseFloat(amount).toFixed(0)} XAF`,
            metadata: { card_uid, receiver_id: req.user.id, ride_id: ride_id || null }
        }, { transaction: t });

        await receiverWallet.update({ balance: receiverNewBalance }, { transaction: t });
        await WalletTransaction.create({
            wallet_id: receiverWallet.id, type: 'credit', amount: parseFloat(amount),
            balance_after: receiverNewBalance, source: 'ride_earning', reference: txRef, status: 'completed',
            description: `Reçu via Ombia Card — ${parseFloat(amount).toFixed(0)} XAF`,
            metadata: { card_uid, payer_wallet_id: payerWallet.id, ride_id: ride_id || null }
        }, { transaction: t });

        await t.commit();
        res.json({ message: 'Paiement NFC effectué', amount: parseFloat(amount), reference: txRef, payer_new_balance: payerNewBalance });
    } catch (error) {
        await t.rollback();
        console.error('NFC pay error:', error);
        res.status(500).json({ error: 'Échec du paiement NFC' });
    }
});

// ── GET /api/wallet/card-status ───────────────────────────────────────────────
router.get('/card-status', auth, async (req, res) => {
    try {
        const wallet = await getOrCreateWallet(req.user.id);
        const [cardPrice, deliveryTime] = await Promise.all([
            getSetting('physical_card_price', '2500'),
            getSetting('physical_card_delivery', '24–48h'),
        ]);
        res.json({
            card_number:             wallet.card_number,
            nfc_card_uid:            wallet.nfc_card_uid || null,
            physical_card_requested: wallet.physical_card_requested,
            physical_card_status:    wallet.physical_card_status,
            physical_card_price:     parseInt(cardPrice, 10),
            physical_card_delivery:  deliveryTime,
        });
    } catch (error) {
        res.status(500).json({ error: 'Impossible de récupérer le statut' });
    }
});

// ── GET /api/wallet/features ──────────────────────────────────────────────────
// Returns enabled wallet feature cards for the mobile dashboard (dynamic).
router.get('/features', auth, async (req, res) => {
    try {
        const features = await WalletFeature.findAll({
            where:  { enabled: true },
            order:  [['sort_order', 'ASC']],
        });
        res.json({ features });
    } catch (error) {
        res.status(500).json({ error: 'Impossible de charger les fonctionnalités' });
    }
});

// ── POST /api/wallet/transfer ─────────────────────────────────────────────────
// Send money from authenticated user's wallet to another user by phone or email.
router.post('/transfer', auth, [
    body('recipient').notEmpty().withMessage('Destinataire requis (téléphone ou email)'),
    body('amount').isFloat({ min: 100 }).withMessage('Montant minimum : 100 XAF'),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const t = await sequelize.transaction();
    try {
        const { recipient, amount, message } = req.body;

        // Find recipient by phone or email
        const recipientUser = await User.findOne({
            where: { [require('sequelize').Op.or]: [{ phone: recipient }, { email: recipient }] }
        });
        if (!recipientUser) {
            await t.rollback();
            return res.status(404).json({ error: 'Aucun utilisateur trouvé avec ce numéro ou cet email.' });
        }
        if (recipientUser.id === req.user.id) {
            await t.rollback();
            return res.status(400).json({ error: 'Vous ne pouvez pas vous transférer de l\'argent.' });
        }

        const senderWallet = await getOrCreateWallet(req.user.id);
        if (parseFloat(senderWallet.balance) < amount) {
            await t.rollback();
            return res.status(400).json({
                error: `Solde insuffisant. Disponible : ${parseFloat(senderWallet.balance).toFixed(0)} XAF`
            });
        }
        if (!senderWallet.is_active) {
            await t.rollback();
            return res.status(403).json({ error: 'Votre portefeuille est désactivé.' });
        }

        const recipientWallet    = await getOrCreateWallet(recipientUser.id);
        const senderNewBalance    = parseFloat(senderWallet.balance)    - parseFloat(amount);
        const recipientNewBalance = parseFloat(recipientWallet.balance) + parseFloat(amount);
        const txRef = `TRF-${uuidv4().slice(0, 10).toUpperCase()}`;
        const note  = message ? ` · "${message}"` : '';

        await senderWallet.update({ balance: senderNewBalance }, { transaction: t });
        await WalletTransaction.create({
            wallet_id:     senderWallet.id,
            type:          'debit',
            amount:        parseFloat(amount),
            balance_after: senderNewBalance,
            source:        'transfer_out',
            reference:     txRef,
            status:        'completed',
            description:   `Envoi à ${recipientUser.name}${note}`,
            metadata:      { recipient_id: recipientUser.id, recipient_name: recipientUser.name, message: message || null }
        }, { transaction: t });

        await recipientWallet.update({ balance: recipientNewBalance }, { transaction: t });
        await WalletTransaction.create({
            wallet_id:     recipientWallet.id,
            type:          'credit',
            amount:        parseFloat(amount),
            balance_after: recipientNewBalance,
            source:        'transfer_in',
            reference:     txRef,
            status:        'completed',
            description:   `Reçu de ${req.user.name}${note}`,
            metadata:      { sender_id: req.user.id, sender_name: req.user.name, message: message || null }
        }, { transaction: t });

        await t.commit();
        res.json({
            message:           `${parseFloat(amount).toFixed(0)} XAF envoyés à ${recipientUser.name}`,
            reference:         txRef,
            new_balance:       senderNewBalance,
            recipient_name:    recipientUser.name,
        });
    } catch (error) {
        await t.rollback();
        console.error('Transfer error:', error);
        res.status(500).json({ error: 'Échec du transfert' });
    }
});

// ── GET /api/wallet/lookup-user ───────────────────────────────────────────────
// Preview recipient before confirming transfer.
router.get('/lookup-user', auth, async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.trim().length < 3) return res.status(400).json({ error: 'Requête trop courte' });
        const user = await User.findOne({
            where: { [require('sequelize').Op.or]: [{ phone: q.trim() }, { email: q.trim() }] },
            attributes: ['id', 'name', 'phone', 'email'],
        });
        if (!user) return res.status(404).json({ error: 'Aucun utilisateur trouvé' });
        if (user.id === req.user.id) return res.status(400).json({ error: 'C\'est votre propre compte' });
        res.json({ user: { id: user.id, name: user.name, phone: user.phone } });
    } catch (error) {
        res.status(500).json({ error: 'Échec de la recherche' });
    }
});

module.exports = router;
module.exports.getOrCreateWallet = getOrCreateWallet;
