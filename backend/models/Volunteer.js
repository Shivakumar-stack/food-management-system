const mongoose = require('mongoose');

const volunteerSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    phone: {
        type: String
    },
    city: {
        type: String,
        required: true
    },
    availability: {
        type: Boolean,
        default: true
    },
    vehicle_type: {
        type: String,
        enum: ['none', 'bicycle', 'motorcycle', 'car', 'van', 'truck'],
        default: 'none'
    },
    serviceArea: [{
        type: String,
        trim: true
    }],
    completed_deliveries: {
        type: Number,
        default: 0
    },
    rating: {
        type: Number,
        default: 5,
        min: 1,
        max: 5
    },
    assignedPickups: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pickup'
    }],
    currentLocation: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number]
        }
    }
}, { timestamps: true });

volunteerSchema.index({ user_id: 1 });
volunteerSchema.index({ currentLocation: '2dsphere' });

module.exports = mongoose.model('Volunteer', volunteerSchema);
