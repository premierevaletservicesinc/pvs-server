const express = require('express')
const { rateLimit } = require('express-rate-limit')
const emailRouter = new express.Router()
const emailController = require('../controllers/emailController.js')
const spamFilter = require('../middleware/spamFilter.js')

// Each submission sends email, so cap how often one visitor can submit
const submissionLimit = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    message: {
        success: false,
        message: 'Too many submissions. Please try again later.',
    },
})

emailRouter.post(
    '/quote',
    submissionLimit,
    spamFilter({ nameFields: ['name'] }),
    emailController.quote,
)
emailRouter.post(
    '/work',
    submissionLimit,
    spamFilter({ nameFields: ['firstName', 'lastName'] }),
    emailController.work,
)

module.exports = emailRouter
