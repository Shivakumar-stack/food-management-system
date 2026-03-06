const { Server } = require('socket.io');
const logger = require('../config/logger');

const initializeSockets = (server, allowedOrigins) => {
    const io = new Server(server, {
        cors: {
            origin: allowedOrigins,
            methods: ['GET', 'POST', 'PUT']
        }
    });

    io.on('connection', (socket) => {
        logger.debug(`Socket connected: ${socket.id}`);

        // Set up other socket listeners here in modules
        // Example: require('./donationSockets')(io, socket);

        socket.on('disconnect', () => {
            logger.debug(`Socket disconnected: ${socket.id}`);
        });
    });

    return io;
};

module.exports = {
    initializeSockets
};
