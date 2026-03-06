const mongoose = require('mongoose');

const inventoryLogSchema = new mongoose.Schema({
    mealServer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MealServer'
    },
    donation_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Donation'
    },
    itemName: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    quantity: {
        type: Number,
        required: true // Positive for incoming, negative for outgoing
    },
    unit: {
        type: String,
        default: 'kg'
    },
    operationType: {
        type: String,
        enum: ['received', 'consumed', 'spoiled', 'transferred'],
        required: true
    },
    loggedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    city: { type: String },
    timestamp: { type: Date, default: Date.now },
    notes: String
}, { timestamps: true });

inventoryLogSchema.index({ mealServer: 1 });
inventoryLogSchema.index({ donation_id: 1 });
inventoryLogSchema.index({ operationType: 1 });
inventoryLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('InventoryLog', inventoryLogSchema);
