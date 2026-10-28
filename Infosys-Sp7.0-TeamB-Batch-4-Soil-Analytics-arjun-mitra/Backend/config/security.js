const crypto = require('crypto')

const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password12', 'password123', 'pass123', 'welcome',
  'welcome1', 'welcome123', 'letmein', 'letmein123', 'admin', 'admin123',
  'qwerty', 'qwerty123', 'changeme', 'iloveyou', 'sunshine', 'monkey',
  'football', 'baseball', 'dragon', 'login', 'master', 'agrisync', 'farm123'
])

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function isValidEmail(value) {
  const email = normalizeEmail(value)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254
}

function validatePassword(password) {
  if (typeof password !== 'string') {
    return { ok: false, message: 'Password must be provided as a string.' }
  }

  if (password.length < 12 || password.length > 72) {
    return { ok: false, message: 'Password must be between 12 and 72 characters long.' }
  }

  if (password.trim().length < 12) {
    return { ok: false, message: 'Password must not be blank or whitespace only.' }
  }

  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return { ok: false, message: 'Choose a less common password.' }
  }

  return { ok: true }
}

function hashOtp(otp) {
  const secret = process.env.OTP_HASH_SECRET || process.env.JWT_SECRET
  if (!secret) {
    throw new Error('OTP_HASH_SECRET or JWT_SECRET must be configured')
  }

  return crypto.createHmac('sha256', secret).update(String(otp).trim()).digest('hex')
}

function compareOtp(inputOtp, storedHash) {
  if (typeof inputOtp !== 'string' || typeof storedHash !== 'string') {
    return false
  }

  const inputHash = hashOtp(inputOtp)
  const inputBuffer = Buffer.from(inputHash, 'hex')
  const storedBuffer = Buffer.from(storedHash, 'hex')

  if (inputBuffer.length !== storedBuffer.length) {
    return false
  }

  try {
    return crypto.timingSafeEqual(inputBuffer, storedBuffer)
  } catch (error) {
    return false
  }
}

function getRateLimitKey(req) {
  const email = normalizeEmail(req.body?.email || req.query?.email)
  return `${req.ip}:${email || 'anonymous'}`
}

module.exports = {
  COMMON_PASSWORDS,
  normalizeEmail,
  isValidEmail,
  validatePassword,
  hashOtp,
  compareOtp,
  getRateLimitKey,
}
