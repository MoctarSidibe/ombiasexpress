const { CommissionRule, CashbackRule, CashbackTransaction, User } = require('../models');
const { getSetting } = require('./settings.service');

// ── Get commission rate for a service ────────────────────────────────────────
// One default rule per service. Falls back to settings key if none found.
const getCommissionRate = async (serviceType) => {
    try {
        const rule = await CommissionRule.findOne({
            where: { service_type: serviceType, is_default: true, enabled: true },
        });
        if (rule) return parseFloat(rule.rate) / 100;
    } catch (_) {}
    // Fallback: legacy settings key
    const legacyKey = `${serviceType}_commission_rate`;
    return parseFloat(await getSetting(legacyKey, 20)) / 100;
};

// ── Award cashback points to a user ──────────────────────────────────────────
// Returns points awarded (0 if no rule or disabled).
const awardCashback = async (userId, serviceType, amount, referenceId) => {
    try {
        const rule = await CashbackRule.findOne({
            where: { service_type: serviceType, enabled: true },
        });
        if (!rule) return 0;

        const points = Math.floor((amount * parseFloat(rule.earn_rate)) / 100);
        if (points <= 0) return 0;

        await User.increment('cashback_points', { by: points, where: { id: userId } });
        const user = await User.findByPk(userId, { attributes: ['cashback_points'] });

        const expiresAt = rule.expiry_days > 0
            ? new Date(Date.now() + rule.expiry_days * 86400000)
            : null;

        await CashbackTransaction.create({
            user_id:      userId,
            points,
            type:         'earn',
            source:       serviceType,
            reference_id: referenceId,
            description:  `+${points} pts — ${rule.name}`,
            balance_after: user.cashback_points,
            expires_at:   expiresAt,
        });

        return points;
    } catch (_) {
        return 0;
    }
};

// ── Redeem points as wallet credit ────────────────────────────────────────────
// redemption_rate setting: how many points = 1 XAF (default 100 pts = 1 XAF)
const redeemPoints = async (userId, pointsToRedeem) => {
    const rate = parseFloat(await getSetting('cashback_redemption_rate', 100));
    const xafValue = pointsToRedeem / rate;

    const user = await User.findByPk(userId, { attributes: ['cashback_points'] });
    if (!user || user.cashback_points < pointsToRedeem) return { ok: false, reason: 'Solde de points insuffisant' };

    await User.increment('cashback_points', { by: -pointsToRedeem, where: { id: userId } });
    const updated = await User.findByPk(userId, { attributes: ['cashback_points'] });

    await CashbackTransaction.create({
        user_id:      userId,
        points:       -pointsToRedeem,
        type:         'redeem',
        source:       'redemption',
        reference_id: null,
        description:  `−${pointsToRedeem} pts → ${xafValue.toFixed(0)} XAF crédités`,
        balance_after: updated.cashback_points,
    });

    return { ok: true, xaf_credited: xafValue };
};

module.exports = { getCommissionRate, awardCashback, redeemPoints };
