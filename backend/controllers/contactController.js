const { validationResult } = require('express-validator');
const Contact = require('../models/Contact');

/**
 * Submit Contact Form
 */
exports.submitContactForm = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors.array()
    });
  }

  try {
    const { name, email, subject, message, type } = req.body;

    const contact = new Contact({
      name,
      email,
      subject,
      message,
      type: type || 'general',
      status: 'open',
      submittedAt: new Date()
    });

    await contact.save();

    res.status(201).json({
      success: true,
      message: 'Thank you for contacting us. We will get back to you soon!',
      data: { contact }
    });
  } catch (error) {
    console.error('Submit contact form error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Subscribe to Newsletter
 */
exports.subscribeToNewsletter = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors.array()
    });
  }

  try {
    const { email } = req.body;

    // Check if already subscribed
    const existingSubscription = await Contact.findOne({
      email,
      type: 'newsletter'
    });

    if (existingSubscription) {
      return res.status(200).json({
        success: true,
        message: 'You are already subscribed to our newsletter!'
      });
    }

    const contact = new Contact({
      name: 'Newsletter Subscriber',
      email,
      subject: 'Newsletter Subscription',
      message: 'User subscribed to newsletter',
      type: 'newsletter',
      status: 'subscribed',
      submittedAt: new Date()
    });

    await contact.save();

    res.status(201).json({
      success: true,
      message: 'Successfully subscribed to our newsletter!',
      data: { email }
    });
  } catch (error) {
    console.error('Newsletter subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Get All Contact Submissions (Admin)
 */
exports.getAllContactSubmissions = async (req, res) => {
  try {
    const { status, type, page = 1, limit = 10 } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (type) filter.type = type;

    const skip = (page - 1) * limit;

    const contacts = await Contact.find(filter)
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Contact.countDocuments(filter);

    res.json({
      success: true,
      data: { 
        contacts,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get all contacts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Get Contact by ID (Admin)
 */
exports.getContactById = async (req, res) => {
  try {
    const { id } = req.params;

    const contact = await Contact.findById(id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact submission not found'
      });
    }

    res.json({
      success: true,
      data: { contact }
    });
  } catch (error) {
    console.error('Get contact by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Respond to Contact Submission (Admin)
 */
exports.respondToContactSubmission = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors.array()
    });
  }

  try {
    const { id } = req.params;
    const { message } = req.body;

    const contact = await Contact.findByIdAndUpdate(
      id,
      {
        $set: {
          response: message,
          respondedAt: new Date(),
          status: 'responded'
        }
      },
      { new: true }
    );

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact submission not found'
      });
    }

    res.json({
      success: true,
      message: 'Response sent successfully',
      data: { contact }
    });
  } catch (error) {
    console.error('Respond to contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Resolve Complaint (Admin)
 */
exports.resolveComplaint = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors.array()
    });
  }

  try {
    const { id } = req.params;
    const { resolution } = req.body;

    const contact = await Contact.findByIdAndUpdate(
      id,
      {
        $set: {
          resolution,
          resolvedAt: new Date(),
          status: 'resolved'
        }
      },
      { new: true }
    );

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact submission not found'
      });
    }

    res.json({
      success: true,
      message: 'Complaint resolved successfully',
      data: { contact }
    });
  } catch (error) {
    console.error('Resolve complaint error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
