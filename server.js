require('dotenv').config()

const express = require('express')
const logger = require('morgan')
const cors = require('cors')
const app = express()
const PORT = process.env.PORT || 3001
const emailRoutes = require('./routes/emailRoutes.js')

// Heroku sits behind a proxy; trust it so rate limiting sees real client IPs
app.set('trust proxy', 1)

app.use(cors())
app.use(logger('dev'))
app.use(express.json({ limit: '50kb' }))

app.get('/', (req, res) => {
    res.json({ message: 'API root', success: 'API successfully loaded' })
})

app.use('/email', emailRoutes)

app.listen(PORT, (err) => {
    console.log(err || `👏🏾 Server running on ${PORT}`)
})
