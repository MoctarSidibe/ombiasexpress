const express = require('express');
const { body, validationResult } = require('express-validator');
const { AdminRole, AdminStaff, User, Wallet } = require('../models');
const { auth, superAdminOnly } = require('../middleware/auth.middleware');
const { hashPassword } = require('../utils/helpers');

const router = express.Router();

// All staff routes require super-admin
router.use(auth, superAdminOnly);

// ── Permission key catalog ────────────────────────────────────────────────────
const ALL_PERMISSIONS = [
    { key: 'dashboard',     label: 'Tableau de bord',       group: 'Général' },
    { key: 'users',         label: 'Utilisateurs',           group: 'Général' },
    { key: 'rides',         label: 'Courses',                group: 'Services' },
    { key: 'rentals',       label: 'Location véhicules',     group: 'Services' },
    { key: 'deliveries',    label: 'Livraisons',             group: 'Services' },
    { key: 'orders',        label: 'Commandes e-commerce',   group: 'Services' },
    { key: 'products',      label: 'Produits',               group: 'Services' },
    { key: 'car_listings',  label: 'Annonces auto',          group: 'Services' },
    { key: 'kyc',           label: 'Vérifications KYC',      group: 'Vérifications' },
    { key: 'ratings',       label: 'Évaluations',            group: 'Vérifications' },
    { key: 'support',       label: 'Support client',         group: 'Support' },
    { key: 'wallet',        label: 'Portefeuilles',          group: 'Finance' },
    { key: 'card_printing', label: 'Impression cartes NFC',  group: 'Finance' },
    { key: 'coupons',       label: 'Coupons & promos',       group: 'Finance' },
    { key: 'commissions',   label: 'Règles de commission',   group: 'Finance' },
    { key: 'cashback',      label: 'Cashback & points',      group: 'Finance' },
    { key: 'settings',      label: 'Paramètres système',     group: 'Système' },
    { key: 'employees',     label: 'Gestion employés',       group: 'Système' },
    { key: 'roles',         label: 'Gestion des rôles',      group: 'Système' },
];

router.get('/permissions', (req, res) => res.json({ permissions: ALL_PERMISSIONS }));

// ── Roles CRUD ────────────────────────────────────────────────────────────────

router.get('/roles', async (req, res) => {
    try {
        const roles = await AdminRole.findAll({
            order: [['is_system', 'DESC'], ['name', 'ASC']],
            include: [{ model: AdminStaff, as: 'staffMembers', attributes: ['id'] }],
        });
        res.json({ roles });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/roles', [
    body('name').trim().notEmpty().isLength({ max: 100 }),
    body('permissions').isArray(),
    body('description').optional().trim().isLength({ max: 300 }),
    body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
        const { name, description, color, permissions } = req.body;
        const role = await AdminRole.create({
            name, description, color: color || '#1565C0',
            permissions: permissions.filter(p => ALL_PERMISSIONS.some(ap => ap.key === p)),
            created_by: req.user.id,
        });
        res.status(201).json({ role });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/roles/:id', [
    body('name').optional().trim().notEmpty().isLength({ max: 100 }),
    body('permissions').optional().isArray(),
    body('description').optional().trim().isLength({ max: 300 }),
    body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/),
], async (req, res) => {
    try {
        const role = await AdminRole.findByPk(req.params.id);
        if (!role) return res.status(404).json({ error: 'Rôle introuvable' });
        if (role.is_system) return res.status(400).json({ error: 'Les rôles système ne peuvent pas être modifiés' });
        const updates = {};
        if (req.body.name !== undefined)        updates.name = req.body.name;
        if (req.body.description !== undefined)  updates.description = req.body.description;
        if (req.body.color !== undefined)        updates.color = req.body.color;
        if (req.body.permissions !== undefined)  updates.permissions = req.body.permissions.filter(p => ALL_PERMISSIONS.some(ap => ap.key === p));
        await role.update(updates);
        res.json({ role });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/roles/:id', async (req, res) => {
    try {
        const role = await AdminRole.findByPk(req.params.id);
        if (!role) return res.status(404).json({ error: 'Rôle introuvable' });
        if (role.is_system) return res.status(400).json({ error: 'Les rôles système ne peuvent pas être supprimés' });
        const inUse = await AdminStaff.count({ where: { role_id: role.id } });
        if (inUse > 0) return res.status(400).json({ error: `Ce rôle est assigné à ${inUse} employé(s)` });
        await role.destroy();
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Staff CRUD ────────────────────────────────────────────────────────────────

router.get('/staff', async (req, res) => {
    try {
        const { page = 1, limit = 30 } = req.query;
        const { count, rows } = await AdminStaff.findAndCountAll({
            include: [
                { model: User,      as: 'user',  attributes: ['id', 'name', 'email', 'phone', 'profile_photo', 'is_active', 'created_at'] },
                { model: AdminRole, as: 'role',  attributes: ['id', 'name', 'color', 'permissions'] },
            ],
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit),
        });
        res.json({ staff: rows, total: count });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Create staff account — creates a User + AdminStaff record in one shot
router.post('/staff', [
    body('name').trim().notEmpty(),
    body('email').isEmail(),
    body('phone').trim().notEmpty(),
    body('password').isLength({ min: 6 }),
    body('role_id').isUUID(),
    body('department').optional().trim(),
    body('notes').optional().trim(),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const { name, email, phone, password, role_id, department, notes } = req.body;

        const role = await AdminRole.findByPk(role_id);
        if (!role) return res.status(400).json({ error: 'Rôle introuvable' });

        const existing = await User.findOne({ where: { email } });
        if (existing) return res.status(400).json({ error: 'Cet email est déjà utilisé' });

        const passwordHash = await hashPassword(password);
        const user = await User.create({
            name, email, phone,
            password_hash: passwordHash,
            role: 'rider',          // mobile role — staff don't ride
            is_staff: true,
            active_services: [],
        });

        // Create wallet so user record is complete
        try {
            const { Wallet } = require('../models');
            await Wallet.create({ user_id: user.id });
        } catch (_) {}

        const staff = await AdminStaff.create({
            user_id:    user.id,
            role_id,
            department: department || null,
            notes:      notes      || null,
            invited_by: req.user.id,
        });

        const result = await AdminStaff.findByPk(staff.id, {
            include: [
                { model: User,      as: 'user',  attributes: ['id', 'name', 'email', 'phone', 'is_active'] },
                { model: AdminRole, as: 'role',  attributes: ['id', 'name', 'color', 'permissions'] },
            ],
        });
        res.status(201).json({ staff: result });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Update staff role / department / active status
router.put('/staff/:id', [
    body('role_id').optional().isUUID(),
    body('department').optional().trim(),
    body('notes').optional().trim(),
    body('is_active').optional().isBoolean(),
], async (req, res) => {
    try {
        const staff = await AdminStaff.findByPk(req.params.id, {
            include: [{ model: User, as: 'user' }],
        });
        if (!staff) return res.status(404).json({ error: 'Employé introuvable' });

        const { role_id, department, notes, is_active } = req.body;
        const updates = {};
        if (role_id !== undefined)    updates.role_id = role_id;
        if (department !== undefined) updates.department = department;
        if (notes !== undefined)      updates.notes = notes;
        if (is_active !== undefined)  updates.is_active = is_active;
        await staff.update(updates);

        // Sync user.is_active if deactivating
        if (is_active === false) await staff.user.update({ is_active: false });
        if (is_active === true)  await staff.user.update({ is_active: true });

        const updated = await AdminStaff.findByPk(staff.id, {
            include: [
                { model: User,      as: 'user',  attributes: ['id', 'name', 'email', 'phone', 'is_active'] },
                { model: AdminRole, as: 'role',  attributes: ['id', 'name', 'color', 'permissions'] },
            ],
        });
        res.json({ staff: updated });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Reset staff password
router.put('/staff/:id/password', [
    body('password').isLength({ min: 6 }),
], async (req, res) => {
    try {
        const staff = await AdminStaff.findByPk(req.params.id, {
            include: [{ model: User, as: 'user' }],
        });
        if (!staff) return res.status(404).json({ error: 'Employé introuvable' });
        const passwordHash = await hashPassword(req.body.password);
        await staff.user.update({ password_hash: passwordHash });
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Hard delete (removes staff record + deactivates user)
router.delete('/staff/:id', async (req, res) => {
    try {
        const staff = await AdminStaff.findByPk(req.params.id, {
            include: [{ model: User, as: 'user' }],
        });
        if (!staff) return res.status(404).json({ error: 'Employé introuvable' });
        await staff.user.update({ is_staff: false, is_active: false });
        await staff.destroy();
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
