const express = require('express');
const { body, validationResult } = require('express-validator');
const { Vehicle, User } = require('../models');
const { auth, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();

/**
 * POST /api/vehicles
 * Register a new vehicle
 */
router.post('/', [auth, requireRole('driver', 'fleet_owner')], [
    body('make').trim().notEmpty().withMessage('Make is required'),
    body('model').trim().notEmpty().withMessage('Model is required'),
    body('year').isInt({ min: 2000 }).withMessage('Valid year is required'),
    body('color').trim().notEmpty().withMessage('Color is required'),
    body('license_plate').trim().notEmpty().withMessage('License plate is required'),
    body('vehicle_type').isIn(['economy', 'comfort', 'premium', 'xl']),
    body('seats').optional().isInt({ min: 1, max: 8 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { make, model, year, color, license_plate, vehicle_type, seats, photo_url, documents, is_fleet_car, owner_drives } = req.body;

        // Check if license plate already exists
        const existingVehicle = await Vehicle.findOne({ where: { license_plate } });
        if (existingVehicle) {
            return res.status(400).json({ error: 'License plate already registered' });
        }

        const isFleet = req.user.role === 'fleet_owner';
        const vehicle = await Vehicle.create({
            driver_id: req.user.id,
            make,
            model,
            year,
            color,
            license_plate,
            vehicle_type: vehicle_type || 'economy',
            seats: seats || 4,
            photo_url,
            documents,
            is_fleet_car: isFleet ? true : (is_fleet_car || false),
            owner_drives: isFleet ? (owner_drives || false) : false,
        });

        res.status(201).json({
            message: 'Vehicle registered successfully',
            vehicle
        });
    } catch (error) {
        console.error('Vehicle registration error:', error);
        res.status(500).json({ error: 'Failed to register vehicle' });
    }
});

/**
 * GET /api/vehicles
 * Get user's vehicles
 */
router.get('/', [auth, requireRole('driver', 'fleet_owner')], async (req, res) => {
    try {
        const vehicles = await Vehicle.findAll({
            where: { driver_id: req.user.id },
            order: [['created_at', 'DESC']]
        });

        res.json({ vehicles });
    } catch (error) {
        console.error('Fetch vehicles error:', error);
        res.status(500).json({ error: 'Failed to fetch vehicles' });
    }
});

/**
 * GET /api/vehicles/:id
 * Get specific vehicle
 */
router.get('/:id', auth, async (req, res) => {
    try {
        const vehicle = await Vehicle.findByPk(req.params.id, {
            include: [{
                model: User,
                as: 'driver',
                attributes: ['id', 'name', 'rating', 'profile_photo']
            }]
        });

        if (!vehicle) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }

        res.json({ vehicle });
    } catch (error) {
        console.error('Fetch vehicle error:', error);
        res.status(500).json({ error: 'Failed to fetch vehicle' });
    }
});

/**
 * PUT /api/vehicles/:id
 * Update vehicle
 */
router.put('/:id', [auth, requireRole('driver')], async (req, res) => {
    try {
        const vehicle = await Vehicle.findOne({
            where: { id: req.params.id, driver_id: req.user.id }
        });

        if (!vehicle) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }

        const { make, model, year, color, vehicle_type, seats, photo_url, documents } = req.body;
        const updateData = {};

        if (make) updateData.make = make;
        if (model) updateData.model = model;
        if (year) updateData.year = year;
        if (color) updateData.color = color;
        if (vehicle_type) updateData.vehicle_type = vehicle_type;
        if (seats) updateData.seats = seats;
        if (photo_url) updateData.photo_url = photo_url;
        if (documents) updateData.documents = documents;

        await vehicle.update(updateData);

        res.json({
            message: 'Vehicle updated successfully',
            vehicle
        });
    } catch (error) {
        console.error('Vehicle update error:', error);
        res.status(500).json({ error: 'Failed to update vehicle' });
    }
});

/**
 * DELETE /api/vehicles/:id
 * Delete vehicle
 */
router.delete('/:id', [auth, requireRole('driver')], async (req, res) => {
    try {
        const vehicle = await Vehicle.findOne({
            where: { id: req.params.id, driver_id: req.user.id }
        });

        if (!vehicle) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }

        await vehicle.destroy();

        res.json({ message: 'Vehicle deleted successfully' });
    } catch (error) {
        console.error('Vehicle deletion error:', error);
        res.status(500).json({ error: 'Failed to delete vehicle' });
    }
});

module.exports = router;
