
require('dotenv').config()

const express = require('express')
const crypto = require('crypto')
const path = require('path')
const { spawn } = require('child_process')
const cors = require('cors')
const helmet = require('helmet')
const pool = require('./config/db')
const cookieParser = require('cookie-parser')
const authRoutes = require('./routes/auth')
const communityRoutes = require('./routes/community')
const soilAnalysisRoutes = require('./routes/soilAnalysis')

const app = express()
app.set('trust proxy', Number(process.env.TRUST_PROXY || 1))
app.use((req, res, next) => {
  req.requestId = crypto.randomUUID()
  res.setHeader('X-Request-Id', req.requestId)
  next()
})

const frontendOrigin = process.env.FRONTEND_URL || 'http://localhost:5173'
const configuredOrigins = [frontendOrigin]
const environmentOrigins = (process.env.CORS_ALLOWED_ORIGINS || '').split(',').map((origin) => origin.trim()).filter(Boolean)
configuredOrigins.push(...environmentOrigins)
const frontendOrigins = [...new Set(configuredOrigins.filter(Boolean))]

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", ...frontendOrigins],
      styleSrc: ["'self'", "'unsafe-inline'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
}))

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || frontendOrigins.includes(origin)) {
      callback(null, true)
      return
    }

    callback(new Error('Not allowed by CORS'))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

// Base64 image uploads are roughly 4/3 the original file size.
app.use(express.json({ limit: '14mb' }))
app.use(cookieParser())
app.use('/api/auth', authRoutes)
app.use('/api/community', communityRoutes)
app.use('/api/soil-analysis', soilAnalysisRoutes)

app.get('/', (req, res) => {
  res.json({
    name: 'AgriSync API',
    health: '/api/health',
    status: 'running',
  })
})

app.get('/api/health', (req, res) => {
  res.json({ message: 'AgriSync API is running' })
})

app.get('/api/db-check', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT DATABASE() AS database_name')
    res.json({
      message: 'MySQL connected successfully',
      database: rows[0].database_name,
    })
  } catch (error) {
    console.error('Database connection failed:', error.message)
    res.status(500).json({ message: 'Database connection failed' })
  }
})

app.use((error, req, res, next) => {
  if (error && error.message === 'Not allowed by CORS') {
    return res.status(403).json({ message: 'Origin not allowed' })
  }

  return next(error)
})

const PORT = process.env.PORT || 5000

function warmModels() {
  const python = process.env.ML_PYTHON_PATH || (process.platform === 'win32' ? 'python' : 'python3')
  const predictor = path.join(__dirname, '..', 'ml_backend', 'predict_crop.py')
  const child = spawn(python, [predictor, '--warmup'], { windowsHide: true })
  child.stdout.on('data', (data) => console.log(data.toString().trim()))
  child.stderr.on('data', (data) => console.error(data.toString().trim()))
  child.on('error', (error) => console.error(`Crop model warmup failed: ${error.message}`))
  child.on('close', (code) => {
    if (code === 0) console.log('Crop model ready')
  })
}

app.listen(PORT, () => {
  console.log(`AgriSync API running at http://localhost:${PORT}`)
  warmModels()
})
