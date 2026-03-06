const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
    delivery_id: {
        type: String,
        unique: true
    },
    donation_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Donation',
        required: true
    },
    volunteer_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    ngo_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    delivery_status: {
        type: String,
        enum: ['assigned', 'en_route', 'delivered', 'failed', 'cancelled'],
        default: 'assigned'
    },
    pickup_time: {
        type: Date
    },
    delivery_time: {
        type: Date
    },
    dropoffLocation: {
        address: String,
        city: String,
        state: String,
        zipCode: String,
        location: {
            type: {
                type: String,
                enum: ['Point'],
                default: 'Point'
            },
            coordinates: {
                type: [Number]
            }
        }
    },
    deliveryNotes: String,
    proofOfDelivery: String // URL to image/signature
}, { timestamps: true });

deliverySchema.index({ donation_id: 1 });
deliverySchema.index({ volunteer_id: 1 });
deliverySchema.index({ delivery_status: 1 });

module.exports = mongoose.model('Delivery', deliverySchema);
