const { validationResult } = require('express-validator');
const { AppError } = require('./errorHandler');

/**
 * Middleware to check for express-validator errors and reject bad requests.
 * DRYs up controllers.
 */
const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // We can either throw an AppError or return a 400 response directly.
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }
    next();
};

module.exports = {
    validateRequest
};
