const express = require('express');
const router  = express.Router();
const { Op }  = require('sequelize');

const { Order, OrderItem, Product, User, Wallet, WalletTransaction } = require('../models');
const { auth: authenticate } = require('../middleware/auth.middleware');
const push = require('../services/notifications.service');

const ORDER_INCLUDE = [
    { model: User,    as: 'buyer',  attributes: ['id', 'name', 'phone'] },
    { model: User,    as: 'seller', attributes: ['id', 'name', 'phone'] },
    { model: OrderItem, as: 'items' },
];

// POST /orders — place order
router.post('/', authenticate, async (req, res) => {
    try {
        const { seller_id, items, delivery_type, delivery_address, notes, payment_method = 'cash' } = req.body;
        if (!seller_id || !items?.length) {
            return res.status(400).json({ error: 'seller_id and items required' });
        }
        if (req.user.id === seller_id) {
            return res.status(400).json({ error: 'Cannot order from yourself' });
        }

        // Validate products + compute total
        let total = 0;
        const resolvedItems = [];
        for (const item of items) {
            const product = await Product.findByPk(item.product_id);
            if (!product || product.status !== 'active') {
                return res.status(400).json({ error: `Product ${item.product_id} not available` });
            }
            if (String(product.seller_id) !== String(seller_id)) {
                return res.status(400).json({ error: 'All items must be from the same seller' });
            }
            const qty = Number(item.quantity) || 1;
            const subtotal = Number(product.price) * qty;
            total += subtotal;
            resolvedItems.push({
                product_id:   product.id,
                product_name: product.name,
                unit_price:   product.price,
                quantity:     qty,
                subtotal,
            });
        }

        // Wallet payment: check and debit buyer before creating order
        let paymentStatus = 'pending';
        if (payment_method === 'ombia_wallet') {
            const buyerWallet = await Wallet.findOne({ where: { user_id: req.user.id } });
            if (!buyerWallet || parseFloat(buyerWallet.balance) < total) {
                return res.status(400).json({ error: 'Solde insuffisant dans votre portefeuille Ombia.' });
            }
            const newBalance = parseFloat(buyerWallet.balance) - total;
            await buyerWallet.update({ balance: newBalance });
            await WalletTransaction.create({
                wallet_id:     buyerWallet.id,
                type:          'debit',
                amount:        total,
                balance_after: newBalance,
                source:        'ecommerce_payment',
                reference:     null,
                status:        'completed',
                description:   `Commande — paiement de ${total.toLocaleString('fr-FR')} XAF`,
            });
            paymentStatus = 'paid';
        }

        const order = await Order.create({
            buyer_id:         req.user.id,
            seller_id,
            total_amount:     total,
            delivery_type:    delivery_type || 'pickup',
            delivery_address: delivery_address || null,
            notes:            notes || null,
            payment_method,
            payment_status:   paymentStatus,
        });

        for (const ri of resolvedItems) {
            await OrderItem.create({ order_id: order.id, ...ri });
        }

        const full = await Order.findByPk(order.id, { include: ORDER_INCLUDE });

        // Auto-create delivery job if buyer requested home delivery
        if ((delivery_type === 'delivery' || delivery_type === 'livraison') && delivery_address) {
            try {
                const { Delivery } = require('../models');
                const deliveryFare = Math.ceil((500 + 300) / 50) * 50; // base estimate ~800 XAF
                const newDelivery = await Delivery.create({
                    sender_id:       seller_id,
                    pickup_address:  `Boutique du vendeur (Commande #${order.id.slice(0, 8)})`,
                    dropoff_address: delivery_address,
                    package_description: `Commande e-commerce — ${resolvedItems.map(i => i.product_name).join(', ')}`,
                    package_size:    'petit',
                    fare:            deliveryFare,
                    distance_km:     1,
                    order_id:        order.id,
                    notes:           notes || null,
                    status:          'pending',
                });
                // Notify available couriers
                const io2 = req.app.get('io');
                if (io2) {
                    io2.emit('new_delivery_request', {
                        deliveryId:      newDelivery.id,
                        pickup_address:  newDelivery.pickup_address,
                        dropoff_address: newDelivery.dropoff_address,
                        fare:            deliveryFare,
                        package_size:    'petit',
                        order_id:        order.id,
                    });
                }
            } catch (deliveryErr) {
                console.error('Auto-delivery creation error:', deliveryErr.message);
                // Non-fatal: order is still created
            }
        }

        // Socket + push notification to seller
        const io = req.app.get('io');
        io.to('user_' + seller_id).emit('new_order', { orderId: order.id, total });
        const seller = await User.findByPk(seller_id);
        if (seller) push.orderPlaced(seller, order.id, req.user.name || 'Un client', total);
        res.status(201).json({ order: full });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /orders/mine — buyer's orders
router.get('/mine', authenticate, async (req, res) => {
    try {
        const orders = await Order.findAll({
            where:   { buyer_id: req.user.id },
            include: ORDER_INCLUDE,
            order:   [['created_at', 'DESC']],
        });
        res.json({ orders });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /orders/received — seller's received orders
router.get('/received', authenticate, async (req, res) => {
    try {
        const orders = await Order.findAll({
            where:   { seller_id: req.user.id },
            include: ORDER_INCLUDE,
            order:   [['created_at', 'DESC']],
        });
        res.json({ orders });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /orders/:id
router.get('/:id', authenticate, async (req, res) => {
    try {
        const order = await Order.findByPk(req.params.id, { include: ORDER_INCLUDE });
        if (!order) return res.status(404).json({ error: 'Not found' });
        if (order.buyer_id !== req.user.id && order.seller_id !== req.user.id) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        res.json({ order });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /orders/:id/status — seller updates status
router.put('/:id/status', authenticate, async (req, res) => {
    try {
        const { status } = req.body;
        const valid = ['confirmed', 'ready', 'delivered', 'cancelled'];
        if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });

        const order = await Order.findByPk(req.params.id);
        if (!order) return res.status(404).json({ error: 'Not found' });
        if (String(order.seller_id) !== String(req.user.id)) {
            return res.status(403).json({ error: 'Only seller can update status' });
        }
        order.status = status;
        await order.save();
        // Socket + push notification to buyer
        const io = req.app.get('io');
        io.to('user_' + order.buyer_id).emit('order_status_changed', { orderId: order.id, status });
        const buyer = await User.findByPk(order.buyer_id);
        if (buyer) push.orderStatusChanged(buyer, order.id, status);
        res.json({ order });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /orders/:id — buyer cancels pending order
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const order = await Order.findByPk(req.params.id);
        if (!order) return res.status(404).json({ error: 'Not found' });
        if (String(order.buyer_id) !== String(req.user.id)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        if (order.status !== 'pending') {
            return res.status(400).json({ error: 'Can only cancel pending orders' });
        }
        order.status = 'cancelled';
        await order.save();
        // Socket + push notification to seller
        const io = req.app.get('io');
        io.to('user_' + order.seller_id).emit('order_cancelled', { orderId: order.id });
        const seller = await User.findByPk(order.seller_id);
        if (seller) push.orderCancelledByBuyer(seller, order.id, req.user.name || 'Un client');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
