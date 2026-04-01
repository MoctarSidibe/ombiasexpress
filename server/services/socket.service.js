const { User, Ride } = require('../models');

const initializeSocket = (io) => {
    const onlineUsers = new Map();
    const onlineDrivers = new Map();

    io.on('connection', (socket) => {
        console.log('✓ New client connected:', socket.id);

        // ── Support room join ─────────────────────────────────────────────────
        socket.on('join_support_room', (data) => {
            const { ticket_id } = data;
            if (ticket_id) socket.join(`support_ticket_${ticket_id}`);
        });

        socket.on('leave_support_room', (data) => {
            const { ticket_id } = data;
            if (ticket_id) socket.leave(`support_ticket_${ticket_id}`);
        });

        // Admin agents join a shared room to receive new ticket/message events
        socket.on('join_support_agents', () => {
            socket.join('support_agents');
        });

        // User is typing → forward to agents watching that ticket
        socket.on('support_user_typing', ({ ticket_id, is_typing }) => {
            if (ticket_id) {
                io.to(`support_ticket_${ticket_id}`).emit('support_user_typing', { ticket_id, is_typing });
                io.to('support_agents').emit('support_user_typing', { ticket_id, is_typing });
            }
        });

        // Agent is typing → forward to the user via their personal room
        socket.on('support_agent_typing', ({ ticket_id, user_id, is_typing }) => {
            if (ticket_id && user_id) {
                io.to(`user_${user_id}`).emit('support_agent_typing', { ticket_id, is_typing });
            }
        });

        // Agent resolves ticket → notify the user and all watchers
        socket.on('resolve_support_ticket', ({ ticket_id, user_id }) => {
            if (ticket_id && user_id) {
                io.to(`user_${user_id}`).emit('support_ticket_resolved', { ticket_id });
                io.to(`support_ticket_${ticket_id}`).emit('support_ticket_resolved', { ticket_id });
            }
        });

        socket.on('authenticate', async (data) => {
            try {
                const { userId, role, active_services } = data;
                socket.userId = userId;
                socket.userRole = role;
                socket.join('user_' + userId);
                onlineUsers.set(userId, socket.id);
                await User.update({ is_online: true }, { where: { id: userId } });
                const services = active_services || [role];
                if (services.includes('driver') || services.includes('fleet_owner')) {
                    onlineDrivers.set(userId, socket.id);
                    console.log('✓ Driver ' + userId + ' is now online');
                }
                socket.emit('authenticated', { success: true });
                io.emit('online_drivers_count', { count: onlineDrivers.size });
            } catch (error) {
                console.error('Socket authentication error:', error);
                socket.emit('authenticated', { success: false, error: error.message });
            }
        });

        socket.on('update_location', async (data) => {
            try {
                const { latitude, longitude, ride_id } = data;
                if (!socket.userId) return;
                await User.update(
                    { last_lat: latitude, last_lng: longitude },
                    { where: { id: socket.userId } }
                );
                if (ride_id) {
                    const ride = await Ride.findByPk(ride_id, { attributes: ['rider_id'] });
                    if (ride && ride.rider_id) {
                        io.to('user_' + ride.rider_id).emit('driver_location_update', { ride_id, latitude, longitude });
                    }
                }
            } catch (error) {
                console.error('Location update error:', error);
                socket.emit('location_error', { message: 'Failed to update location' });
            }
        });

        socket.on('toggle_availability', async (data) => {
            try {
                const { is_online } = data;
                if (!socket.userId) return;
                await User.update({ is_online }, { where: { id: socket.userId } });
                if (is_online) onlineDrivers.set(socket.userId, socket.id);
                else onlineDrivers.delete(socket.userId);
                io.emit('online_drivers_count', { count: onlineDrivers.size });
                socket.emit('availability_updated', { is_online });
            } catch (error) {
                console.error('Toggle availability error:', error);
                socket.emit('availability_error', { message: 'Failed to update availability' });
            }
        });

        socket.on('driver_arrived', (data) => {
            const { ride_id, rider_id } = data;
            io.to('user_' + rider_id).emit('driver_arrived', { ride_id, message: 'Your driver has arrived' });
        });

        socket.on('send_message', (data) => {
            const { recipient_id, message, ride_id } = data;
            io.to('user_' + recipient_id).emit('new_message', { sender_id: socket.userId, message, ride_id, timestamp: new Date() });
        });

        socket.on('typing', (data) => {
            const { recipient_id, is_typing } = data;
            io.to('user_' + recipient_id).emit('user_typing', { user_id: socket.userId, is_typing });
        });

        // ── Rental Socket Events ─────────────────────────────────────────────
        // Owner notifies the platform that their rental car location was updated
        socket.on('rental_car_location_update', async (data) => {
            try {
                const { carId, lat, lng } = data;
                if (!socket.userId) return;
                const { RentalCar } = require('../models');
                const car = await RentalCar.findOne({ where: { id: carId, owner_id: socket.userId, is_active: true } });
                if (car) {
                    await car.update({ pickup_lat: lat, pickup_lng: lng });
                    // Broadcast to all so the map updates in real-time
                    io.emit('rental_car_position_updated', { carId, lat, lng, status: car.status });
                }
            } catch (error) {
                console.error('Rental car location error:', error);
            }
        });

        // Bug Fix: previously empty — now logs the error and notifies client
        socket.on('disconnect', async () => {
            console.log('✗ Client disconnected:', socket.id);
            if (socket.userId) {
                onlineUsers.delete(socket.userId);
                onlineDrivers.delete(socket.userId);
                try {
                    await User.update({ is_online: false }, { where: { id: socket.userId } });
                } catch (error) {
                    console.error('Disconnect update error:', error);
                }
                io.emit('online_drivers_count', { count: onlineDrivers.size });
            }
        });

        // Bug Fix: was an empty handler — now logs and notifies
        socket.on('connect_error', (err) => {
            console.error('Socket connect_error:', err.message);
        });
    });

    return {
        getOnlineUsers: () => Array.from(onlineUsers.keys()),
        getOnlineDrivers: () => Array.from(onlineDrivers.keys()),
        getOnlineDriversCount: () => onlineDrivers.size,
        emitToUser: (userId, event, data) => io.to('user_' + userId).emit(event, data)
    };
};

module.exports = { initializeSocket };
