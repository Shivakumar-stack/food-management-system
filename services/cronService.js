const cron = require('node-cron');
const Donation = require('../models/Donation');
const logger = require('../config/logger');

const NON_EXPIRABLE_STATUSES = ['delivered', 'cancelled', 'expired'];

async function runAutoExpireJob() {
    try {
        const result = await Donation.updateMany(
            {
                pickupTime: { $lt: new Date() },
                status: { $nin: NON_EXPIRABLE_STATUSES }
            },
            {
                $set: {
                    status: 'expired',
                    priorityScore: 0
                }
            }
        );

        if (result.modifiedCount > 0) {
            logger.info(`Auto-expire job updated ${result.modifiedCount} donation(s)`);
        }
    } catch (error) {
        logger.error('Auto-expire background job error:', error);
    }
}

/**
 * Initialize all cron jobs
 * The auto-expire job runs every 10 minutes (* /10 * * * *)
 */
const initializeCronJobs = () => {
    if (process.env.NODE_ENV !== 'test') {
        logger.info('Initializing background cron jobs...');

        // Run every 10 minutes
        cron.schedule('*/10 * * * *', runAutoExpireJob);

        // Initial warmup run 15 seconds after boot
        setTimeout(runAutoExpireJob, 15 * 1000);
    }
};

module.exports = {
    initializeCronJobs,
    runAutoExpireJob
};
