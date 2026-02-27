const Pickup = require('../models/Pickup');
const Donation = require('../models/Donation');
const User = require('../models/User');

// @desc    Assign a volunteer to a pickup
// @route   PUT /api/pickups/:id/assign
// @access  Private (Admin)
exports.assignVolunteerToPickup = async (req, res) => {
    try {
        const pickup = await Pickup.findById(req.params.id);

        if (!pickup) {
            return res.status(404).json({ success: false, message: 'Pickup not found' });
        }

        const { volunteerId } = req.body;
        const volunteer = await User.findById(volunteerId);

        if (!volunteer || volunteer.role !== 'volunteer') {
            return res.status(404).json({ success: false, message: 'Volunteer not found' });
        }

        pickup.volunteer = volunteerId;
        pickup.status = 'assigned';
        pickup.assignedBy = req.user.id;
        await pickup.save();

        res.json({ success: true, data: pickup });
    } catch (error) {
        console.error('Assign volunteer error:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Update pickup status
// @route   PUT /api/pickups/:id/status
// @access  Private (Volunteer)
exports.updatePickupStatus = async (req, res) => {
    try {
        const pickup = await Pickup.findById(req.params.id);

        if (!pickup) {
            return res.status(404).json({ success: false, message: 'Pickup not found' });
        }

        // Make sure the logged in user is the assigned volunteer
        if (pickup.volunteer.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized to update this pickup' });
        }

        const { status } = req.body;

        // Add more status validation if needed
        pickup.status = status;
        if (status === 'completed') {
            pickup.completionTime = Date.now();
            
            const donation = await Donation.findById(pickup.donation);
            if(donation){
                donation.status = 'closed';
                await donation.save();
            }
        }
        await pickup.save();

        res.json({ success: true, data: pickup });
    } catch (error) {
        console.error('Update pickup status error:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Get all pickups for the logged in volunteer
// @route   GET /api/pickups/my-pickups
// @access  Private (Volunteer)
exports.getMyPickups = async (req, res) => {
    try {
        const pickups = await Pickup.find({ volunteer: req.user.id }).populate({
            path: 'donation',
            select: 'pickupAddress foodItems'
        });
        res.json({ success: true, data: pickups });
    } catch (error) {
        console.error('Get my pickups error:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Get all pickups
// @route   GET /api/pickups
// @access  Private (Admin)
exports.getAllPickups = async (req, res) => {
    try {
        const pickups = await Pickup.find().populate('donation volunteer assignedBy');
        res.json({ success: true, data: pickups });
    } catch (error) {
        console.error('Get all pickups error:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
