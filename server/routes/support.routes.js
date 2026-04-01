const express = require('express');
const { body, validationResult } = require('express-validator');
const { SupportTicket, SupportMessage, User } = require('../models');
const { auth } = require('../middleware/auth.middleware');

const router = express.Router();

// ── Bot auto-reply on ticket creation ─────────────────────────────────────────
const BOT_WELCOME = `Bonjour 👋 Merci de nous contacter. Nous avons bien reçu votre demande et un agent Ombia va vous répondre très rapidement.

En attendant, vous pouvez :
• Consulter vos courses / réservations dans l'historique
• Vérifier votre solde portefeuille
• Nous décrire votre problème avec plus de détails ci-dessous

Temps de réponse moyen : < 10 minutes 🕐`;

// ── POST /api/support/tickets — open a new ticket ─────────────────────────────
router.post('/tickets', auth, [
    body('subject').trim().notEmpty().isLength({ max: 200 }),
    body('type').isIn(['chat', 'incident', 'complaint', 'question']),
    body('service_type').optional().isIn(['ride', 'rental', 'delivery', 'order', 'wallet', 'general']),
    body('service_id').optional().isUUID(),
    body('incident_category').optional().isIn([
        'driver_behavior', 'payment_issue', 'app_bug', 'safety_concern',
        'item_damaged', 'wrong_address', 'overcharge', 'vehicle_condition', 'other',
    ]),
    body('first_message').trim().notEmpty().withMessage('Décrivez votre problème'),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const { subject, type, service_type, service_id, incident_category, first_message } = req.body;

        // Auto-set priority for safety/urgent incidents
        let priority = 'medium';
        if (incident_category === 'safety_concern') priority = 'urgent';
        else if (type === 'incident') priority = 'high';

        const ticket = await SupportTicket.create({
            user_id: req.user.id,
            type,
            subject,
            service_type: service_type || 'general',
            service_id: service_id || null,
            incident_category: incident_category || null,
            priority,
            last_message_at: new Date(),
            unread_support: 1,
        });

        // User's first message
        await SupportMessage.create({
            ticket_id:   ticket.id,
            sender_type: 'user',
            content:     first_message,
        });

        // Bot auto-reply
        await SupportMessage.create({
            ticket_id:   ticket.id,
            sender_type: 'bot',
            content:     BOT_WELCOME,
        });

        // Notify support agents via socket
        const io = req.app.get('io');
        if (io) io.to('support_agents').emit('support_new_ticket', { ticket_id: ticket.id, subject, priority });

        res.status(201).json({ ticket });
    } catch (e) {
        console.error('Create ticket error:', e);
        res.status(500).json({ error: e.message });
    }
});

// ── GET /api/support/tickets — list my tickets ────────────────────────────────
router.get('/tickets', auth, async (req, res) => {
    try {
        const tickets = await SupportTicket.findAll({
            where: { user_id: req.user.id },
            order: [['last_message_at', 'DESC']],
            include: [{
                model: SupportMessage,
                as: 'messages',
                limit: 1,
                order: [['created_at', 'DESC']],
                attributes: ['content', 'sender_type', 'created_at'],
            }],
        });
        res.json({ tickets });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/support/tickets/:id — ticket detail with messages ────────────────
router.get('/tickets/:id', auth, async (req, res) => {
    try {
        const ticket = await SupportTicket.findOne({
            where: { id: req.params.id, user_id: req.user.id },
            include: [{
                model: SupportMessage,
                as: 'messages',
                order: [['created_at', 'ASC']],
            }],
        });
        if (!ticket) return res.status(404).json({ error: 'Ticket introuvable' });

        // Mark support messages as read
        await SupportMessage.update(
            { is_read: true },
            { where: { ticket_id: ticket.id, sender_type: ['support', 'bot'], is_read: false } }
        );
        await ticket.update({ unread_user: 0 });

        res.json({ ticket });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/support/tickets/:id/messages — send a message ──────────────────
router.post('/tickets/:id/messages', auth, [
    body('content').trim().notEmpty(),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const ticket = await SupportTicket.findOne({
            where: { id: req.params.id, user_id: req.user.id },
        });
        if (!ticket) return res.status(404).json({ error: 'Ticket introuvable' });
        if (ticket.status === 'closed') return res.status(400).json({ error: 'Ce ticket est fermé' });

        const message = await SupportMessage.create({
            ticket_id:   ticket.id,
            sender_type: 'user',
            content:     req.body.content,
        });

        await ticket.update({
            last_message_at: new Date(),
            status:          ticket.status === 'open' ? 'open' : ticket.status,
            unread_support:  ticket.unread_support + 1,
        });

        // Real-time push to support agents
        const io = req.app.get('io');
        if (io) {
            io.to('support_agents').emit('support_new_message', {
                ticket_id: ticket.id,
                message:   { ...message.toJSON() },
            });
            io.to(`support_ticket_${ticket.id}`).emit('support_new_message', {
                ticket_id: ticket.id,
                message:   { ...message.toJSON() },
            });
        }

        res.status(201).json({ message });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/support/unread — count unread messages ──────────────────────────
router.get('/unread', auth, async (req, res) => {
    try {
        const count = await SupportTicket.sum('unread_user', {
            where: { user_id: req.user.id },
        });
        res.json({ unread: count || 0 });
    } catch (e) { res.status(500).json({ error: 0 }); }
});

// ── POST /api/support/tickets/:id/rate — rate after resolution ────────────────
router.post('/tickets/:id/rate', auth, [
    body('rating').isInt({ min: 1, max: 5 }),
], async (req, res) => {
    try {
        const ticket = await SupportTicket.findOne({
            where: { id: req.params.id, user_id: req.user.id },
        });
        if (!ticket) return res.status(404).json({ error: 'Ticket introuvable' });
        await ticket.update({ user_rating: req.body.rating });
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PUT /api/support/tickets/:id/close — close from user side ────────────────
router.put('/tickets/:id/close', auth, async (req, res) => {
    try {
        const ticket = await SupportTicket.findOne({
            where: { id: req.params.id, user_id: req.user.id },
        });
        if (!ticket) return res.status(404).json({ error: 'Ticket introuvable' });
        await ticket.update({ status: 'closed' });
        const io = req.app.get('io');
        if (io) {
            io.to(`support_ticket_${ticket.id}`).emit('support_ticket_resolved', { ticket_id: ticket.id, status: 'closed' });
            io.to('support_agents').emit('support_ticket_resolved', { ticket_id: ticket.id, status: 'closed' });
        }
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
