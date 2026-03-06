const mongoose = require('mongoose');

const mealServerSchema = new mongoose.Schema({
    ngo_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true // Points to the NGO/Admin users managing the server
    },
    organization_name: {
        type: String,
        required: true,
        trim: true
    },
    contact_person: { type: String },
    phone: { type: String },
    city: { type: String, required: true },
    lat: { type: Number },
    lng: { type: Number },
    address: {
        type: String,
        required: true
    },
    capacity: {
        type: Number,
        required: true
    },
    mealsServedDaily: {
        type: Number,
        default: 0
    },
    operatingHours: {
        open: String,
        close: String
    },
    active: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

mealServerSchema.index({ city: 1 });

module.exports = mongoose.model('MealServer', mealServerSchema);
