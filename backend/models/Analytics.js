const mongoose = require('mongoose');

/**
 * Analytics Schema
 * Stores aggregated or computed data for performance-intensive queries.
 */
const analyticsSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        index: true,
        enum: ['daily_summary', 'weekly_trend', 'monthly_summary', 'user_stats']
    },
    date: {
        type: Date,
        index: true
    },
    data: {
        type: Object,
        required: true
    }
}, { timestamps: true });

analyticsSchema.index({ type: 1, date: -1 });

module.exports = mongoose.model('Analytics', analyticsSchema);
