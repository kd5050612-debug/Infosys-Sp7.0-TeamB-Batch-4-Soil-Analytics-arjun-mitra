
const mysql = require('mysql2/promise')
require('dotenv').config()

const requiredSettings = ['DB_HOST', 'DB_USER', 'DB_NAME']
const missingSettings = requiredSettings.filter((setting) => !process.env[setting])

if (missingSettings.length) {
  throw new Error(`Missing required database configuration: ${missingSettings.join(', ')}`)
}

const port = Number(process.env.DB_PORT || 3306)
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('DB_PORT must be a valid TCP port')
}

if (process.env.NODE_ENV === 'production' && process.env.DB_SSL !== 'true') {
  throw new Error('DB_SSL=true is required in production')
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  charset: 'utf8mb4',
  ssl: process.env.DB_SSL === 'true'
    ? { rejectUnauthorized: true }
    : undefined,
})

module.exports = pool
