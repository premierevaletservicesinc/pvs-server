// Screens form submissions before any email is sent. Bots tend to fill every
// field with random strings like "kJhGfDsAqW", so obvious junk is dropped
// silently (the bot sees a normal success response and has nothing to adapt
// to), while honest mistakes like a mistyped email get a 400 the form can show.

const MAX_FIELD_LENGTH = 5000

// Hidden field the site's forms can include. Real visitors never see it, so
// any value means a bot filled in the form.
const HONEYPOT_FIELD = 'website'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const isBlank = (value) =>
    value === undefined || value === null || String(value).trim() === ''

// A single letters-only "word" with several capitals after the first letter,
// e.g. "kMrOQjdptTtBiiHMD". Real values like "McDonald", "LinkedIn" or "NASCAR"
// don't match; times, dates, numbers and URLs never do.
const looksRandom = (value) => {
    const word = String(value).trim()
    if (word.length < 6 || !/^[A-Za-z]+$/.test(word)) return false
    const innerCapitals = word.slice(1).match(/[A-Z]/g) || []
    return innerCapitals.length >= 3 && /[a-z]/.test(word)
}

// Bots fill most fields with junk, so one odd-looking value isn't enough to
// throw away a submission, but this many is.
const RANDOM_FIELD_THRESHOLD = 2

const hasValidPhone = (value) => {
    const phone = String(value)
    const digits = phone.replace(/\D/g, '')
    return /^[\d\s()+.\-xext]*$/i.test(phone) && digits.length >= 7
}

const reject = (res, message) =>
    res.status(400).json({ success: false, message })

const dropSilently = (req, res, reason) => {
    console.log(`Dropped spam submission to ${req.originalUrl}: ${reason}`)
    res.json({ success: true, message: 'Received.' })
}

module.exports =
    ({ nameFields }) =>
    (req, res, next) => {
        const body = req.body

        if (!body || typeof body !== 'object' || Array.isArray(body)) {
            return reject(res, 'Invalid submission.')
        }

        const values = Object.values(body)
        if (
            values.some(
                (value) =>
                    value !== null &&
                    !['string', 'number', 'boolean'].includes(typeof value),
            )
        ) {
            return reject(res, 'Invalid submission.')
        }
        if (values.some((value) => String(value).length > MAX_FIELD_LENGTH)) {
            return reject(res, 'One of the fields is too long.')
        }

        if (!isBlank(body[HONEYPOT_FIELD])) {
            return dropSilently(req, res, 'honeypot filled')
        }

        const randomFields = Object.keys(body).filter(
            (field) => field !== 'email' && looksRandom(body[field]),
        )
        if (randomFields.length >= RANDOM_FIELD_THRESHOLD) {
            return dropSilently(
                req,
                res,
                `random-looking ${randomFields.join(', ')} (email: ${body.email})`,
            )
        }

        if (nameFields.every((field) => isBlank(body[field]))) {
            return reject(res, 'Please enter your name.')
        }
        if (
            isBlank(body.email) ||
            !EMAIL_PATTERN.test(String(body.email).trim())
        ) {
            return reject(res, 'Please enter a valid email address.')
        }
        if (!isBlank(body.phone) && !hasValidPhone(body.phone)) {
            return reject(res, 'Please enter a valid phone number.')
        }

        next()
    }
