
const express = require('express')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const pool = require('../config/db')
const rateLimit = require('express-rate-limit')
const { sendOtpEmail, sendPasswordResetOtp } = require('../config/mailer')
const {
  compareOtp,
  getRateLimitKey,
  hashOtp,
  isValidEmail,
  normalizeEmail,
  validatePassword,
} = require('../config/security')
const {
  createUserSession,
  recordAuditLog,
  recordAuthEvent,
  recordUserActivity,
  trackAuthRequest,
} = require('../config/securityEvents')

const router = express.Router()
router.use(trackAuthRequest)

const createLimiter = ({ windowMs, limit, message, keyGenerator }) => rateLimit({
  windowMs,
  limit,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler: (req, res) => {
    res.setHeader('Retry-After', Math.ceil(windowMs / 1000))
    res.status(429).json({ message })
  },
})

const signupLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 6,
  message: 'Too many account creation attempts. Please wait a few minutes and try again.',
  keyGenerator: (req) => getRateLimitKey(req),
})

const signinLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: 'Too many sign-in attempts. Please wait a few minutes and try again.',
  keyGenerator: (req) => getRateLimitKey(req),
})

const otpLimiter = createLimiter({
  windowMs: 10 * 60 * 1000,
  limit: 6,
  message: 'Too many verification attempts. Please wait a few minutes and try again.',
  keyGenerator: (req) => getRateLimitKey(req),
})

const passwordResetRequestLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: 'Too many password reset requests. Please wait a few minutes and try again.',
})

const passwordResetOtpLimiter = createLimiter({
  windowMs: 10 * 60 * 1000,
  limit: 8,
  message: 'Too many password reset attempts. Please wait a few minutes and try again.',
})

function generateOtp() {
  return crypto.randomInt(100000, 1000000).toString()
}

function sendToken(res, user, session, status = 200, message) {
  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      tokenVersion: Number(user.token_version || 0),
      sessionId: session.id,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '1h',
      issuer: process.env.JWT_ISSUER || 'agrisync',
      audience: process.env.JWT_AUDIENCE || 'agrisync-web',
      algorithm: 'HS256',
    },
  )

  res.cookie('agrisync_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 1000,
    path: '/',
  })

  return res.status(status).json({
    message: message || (
      status === 201
        ? 'Email verified and account created successfully'
        : 'Signed in successfully'
    ),
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
  })
}

router.post('/signup', signupLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body

    if (
      typeof name !== 'string' ||
      typeof email !== 'string' ||
      typeof password !== 'string'
    ) {
      return res.status(400).json({
        message: 'Please provide valid details',
      })
    }

    const cleanName = name.trim()
    const cleanEmail = normalizeEmail(email)
    req.authEmail = cleanEmail
    const passwordPolicy = validatePassword(password)

    if (cleanName.length < 2 || cleanName.length > 100) {
      return res.status(400).json({
        message: 'Name must be 2–100 characters',
      })
    }

    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({
        message: 'Enter a valid email address',
      })
    }

    if (!passwordPolicy.ok) {
      return res.status(400).json({
        message: passwordPolicy.message,
      })
    }

    const [existing] = await pool.execute(
      'SELECT id, email_verified FROM users WHERE email = ?',
      [cleanEmail],
    )

    if (existing.length && existing[0].email_verified) {
      return res.status(409).json({
        message: 'An account with this email already exists. Please sign in.',
      })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const otp = generateOtp()
    const otpHash = hashOtp(otp)

    await pool.execute(
      'DELETE FROM email_otps WHERE email = ?',
      [cleanEmail],
    )

    await pool.execute(
      `INSERT INTO email_otps
       (email, otp_hash, expires_at, attempts, pending_name, pending_password_hash)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 5 MINUTE), 0, ?, ?)`,
      [cleanEmail, otpHash, cleanName, passwordHash],
    )

    try {
      await sendOtpEmail(cleanEmail, otp)
    } catch (emailError) {
      await pool.execute(
        'DELETE FROM email_otps WHERE email = ?',
        [cleanEmail],
      )

      console.error('OTP email error:', emailError.message)

      return res.status(502).json({
        message: 'Unable to send verification email. Please try again.',
      })
    }

    return res.status(200).json({
      message: 'Verification code sent to your email',
      requiresVerification: true,
      email: cleanEmail,
    })
  } catch (error) {
    console.error('Signup error:', error.message)

    return res.status(500).json({
      message: 'Unable to start registration',
    })
  }
})

router.post('/verify-otp', otpLimiter, async (req, res) => {
  try {
    const { email, otp } = req.body

    if (
      typeof email !== 'string' ||
      typeof otp !== 'string' ||
      !/^\d{6}$/.test(otp)
    ) {
      return res.status(400).json({
        message: 'Enter your email and six-digit verification code',
      })
    }

    const cleanEmail = normalizeEmail(email)
    req.authEmail = cleanEmail

    const [rows] = await pool.execute(
      `SELECT id, otp_hash, expires_at, attempts,
              pending_name, pending_password_hash
       FROM email_otps
       WHERE email = ?
       LIMIT 1`,
      [cleanEmail],
    )

    if (!rows.length) {
      return res.status(400).json({
        message: 'Code expired or not found. Please sign up again.',
      })
    }

    const record = rows[0]

    if (record.attempts >= 5) {
      await pool.execute(
        'DELETE FROM email_otps WHERE id = ?',
        [record.id],
      )

      return res.status(429).json({
        message: 'Too many incorrect attempts. Please sign up again.',
      })
    }

    if (new Date(record.expires_at).getTime() <= Date.now()) {
      await pool.execute(
        'DELETE FROM email_otps WHERE id = ?',
        [record.id],
      )

      return res.status(400).json({
        message: 'Verification code expired. Please sign up again.',
      })
    }

    if (!compareOtp(otp, record.otp_hash)) {
      await pool.execute(
        'UPDATE email_otps SET attempts = attempts + 1 WHERE id = ?',
        [record.id],
      )

      return res.status(400).json({
        message: 'Incorrect verification code',
      })
    }

    const connection = await pool.getConnection()

    try {
      await connection.beginTransaction()

      const [existing] = await connection.execute(
        `SELECT id, name, email, email_verified, token_version
         FROM users
         WHERE email = ?
         FOR UPDATE`,
        [cleanEmail],
      )

      if (existing.length && existing[0].email_verified) {
        await connection.execute(
          'DELETE FROM email_otps WHERE id = ?',
          [record.id],
        )

        await connection.commit()

        return res.status(409).json({
          message: 'This account is already verified. Please sign in.',
        })
      }

      let user

      if (existing.length) {
        await connection.execute(
          `UPDATE users
           SET name = ?, password_hash = ?, email_verified = TRUE
           WHERE id = ?`,
          [
            record.pending_name,
            record.pending_password_hash,
            existing[0].id,
          ],
        )

        user = {
          id: existing[0].id,
          name: record.pending_name,
          email: cleanEmail,
        }
      } else {
        const [result] = await connection.execute(
          `INSERT INTO users
           (name, email, password_hash, email_verified)
           VALUES (?, ?, ?, TRUE)`,
          [
            record.pending_name,
            cleanEmail,
            record.pending_password_hash,
          ],
        )

        user = {
          id: result.insertId,
          name: record.pending_name,
          email: cleanEmail,
        }
      }

      await connection.execute(
        'DELETE FROM email_otps WHERE id = ?',
        [record.id],
      )

      const session = await createUserSession(req, user.id, 'password', connection)
      user.token_version = Number(existing[0]?.token_version || 0)
      req.authUserId = user.id
      req.authEmail = user.email
      req.sessionId = session.id
      req.user = { id: user.id, email: user.email }
      await recordAuthEvent(req, {
        userId: user.id,
        sessionId: session.id,
        email: user.email,
        eventType: 'otp_verified',
        success: true,
      }, connection)
      await recordAuthEvent(req, {
        userId: user.id,
        sessionId: session.id,
        email: user.email,
        eventType: 'signup',
        success: true,
      }, connection)
      await recordAuthEvent(req, {
        userId: user.id,
        sessionId: session.id,
        email: user.email,
        eventType: 'login_success',
        success: true,
      }, connection)
      await recordUserActivity(req, 'auth.signup', {}, connection)
      await recordAuditLog(req, {
        actorUserId: user.id,
        action: 'signup',
        entityType: 'user',
        entityId: user.id,
        afterData: { emailVerified: true },
      }, connection)

      await connection.commit()
      req.authEventsPersisted = ['otp_verified', 'signup', 'login_success']

      return sendToken(
        res,
        user,
        session,
        existing.length ? 200 : 201,
        'Email verified successfully. You are now signed in.',
      )
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  } catch (error) {
    console.error('OTP verification error:', error.message)

    return res.status(500).json({
      message: 'Unable to verify your email right now',
    })
  }
})

router.post('/signin', signinLimiter, async (req, res) => {
  try {
    const { email, password } = req.body

    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !isValidEmail(email) ||
      password.length > 72
    ) {
      return res.status(400).json({
        message: 'Please enter a valid email and password',
      })
    }

    const cleanEmail = normalizeEmail(email)
    req.authEmail = cleanEmail

    const [users] = await pool.execute(
      `SELECT id, name, email, password_hash, email_verified, token_version
       FROM users
       WHERE email = ?`,
      [cleanEmail],
    )

    if (!users.length || !users[0].password_hash) {
      return res.status(401).json({
        message: 'Invalid email or password',
      })
    }

    const user = users[0]
    req.authUserId = user.id

    const passwordMatches = await bcrypt.compare(
      password,
      user.password_hash,
    )

    if (!passwordMatches) {
      return res.status(401).json({
        message: 'Invalid email or password',
      })
    }

    if (!user.email_verified) {
      return res.status(403).json({
        message: 'Please verify your email before signing in',
      })
    }

    const connection = await pool.getConnection()
    let session
    try {
      await connection.beginTransaction()
      await connection.execute(
        'UPDATE users SET last_login_at = NOW(3) WHERE id = ?',
        [user.id],
      )
      session = await createUserSession(req, user.id, 'password', connection)
      req.sessionId = session.id
      await recordAuthEvent(req, {
        userId: user.id,
        sessionId: session.id,
        email: cleanEmail,
        eventType: 'login_success',
        success: true,
      }, connection)
      await recordUserActivity(req, 'auth.login', {}, connection)
      await recordAuditLog(req, {
        actorUserId: user.id,
        action: 'login_success',
        entityType: 'user_session',
        entityId: session.id,
        afterData: { loginMethod: 'password' },
      }, connection)
      await connection.commit()
      req.authEventsPersisted = ['login_success']
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }

    return sendToken(res, user, session)
  } catch (error) {
    console.error('Signin error:', error.message)

    return res.status(500).json({
      message: 'Unable to sign in',
    })
  }
})

router.post('/forgot-password', passwordResetRequestLimiter, async (req, res) => {
  const genericMessage = 'If an account exists for that email, a password reset code has been sent.'

  try {
    const { email } = req.body

    if (typeof email !== 'string' || !isValidEmail(email)) {
      return res.status(400).json({
        message: 'Enter a valid email address',
      })
    }

    const cleanEmail = normalizeEmail(email)
    req.authEmail = cleanEmail
    const connection = await pool.getConnection()
    let otp = null

    try {
      await connection.beginTransaction()

      const [users] = await connection.execute(
        `SELECT id
         FROM users
         WHERE email = ? AND email_verified = TRUE
         FOR UPDATE`,
        [cleanEmail],
      )

      if (users.length) {
        req.authUserId = users[0].id
        const [recentRequests] = await connection.execute(
          `SELECT id
           FROM email_password_resets
           WHERE email = ? AND created_at > DATE_SUB(NOW(), INTERVAL 60 SECOND)
           LIMIT 1`,
          [cleanEmail],
        )

        if (!recentRequests.length) {
          otp = generateOtp()
          await connection.execute(
            'DELETE FROM email_password_resets WHERE email = ?',
            [cleanEmail],
          )
          await connection.execute(
            `INSERT INTO email_password_resets
             (email, otp_hash, expires_at, attempts)
             VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 5 MINUTE), 0)`,
            [cleanEmail, hashOtp(otp)],
          )
        }
      }

      await connection.commit()
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }

    if (otp) {
      try {
        await sendPasswordResetOtp(cleanEmail, otp)
      } catch (emailError) {
        await pool.execute(
          'DELETE FROM email_password_resets WHERE email = ? AND otp_hash = ?',
          [cleanEmail, hashOtp(otp)],
        )
        console.error('Password reset email error:', emailError.message)
      }
    }

    return res.json({ message: genericMessage })
  } catch (error) {
    console.error('Password reset request error:', error.message)
    return res.status(500).json({
      message: 'Unable to process your password reset request right now',
    })
  }
})

router.post('/reset-password', passwordResetOtpLimiter, async (req, res) => {
  const { email, otp, newPassword } = req.body

  if (
    typeof email !== 'string' ||
    !isValidEmail(email) ||
    typeof otp !== 'string' ||
    !/^\d{6}$/.test(otp) ||
    typeof newPassword !== 'string'
  ) {
    return res.status(400).json({
      message: 'Enter a valid email, six-digit code, and new password',
    })
  }

  const passwordPolicy = validatePassword(newPassword)
  if (!passwordPolicy.ok) {
    return res.status(400).json({ message: passwordPolicy.message })
  }

  try {
    const cleanEmail = normalizeEmail(email)
    const connection = await pool.getConnection()

    try {
      await connection.beginTransaction()

      const [resetRecords] = await connection.execute(
        `SELECT id, otp_hash, expires_at, attempts, expires_at <= NOW() AS expired
         FROM email_password_resets
         WHERE email = ?
         LIMIT 1
         FOR UPDATE`,
        [cleanEmail],
      )

      if (!resetRecords.length) {
        await connection.rollback()
        return res.status(400).json({
          message: 'The reset code is invalid or expired. Request a new code.',
        })
      }

      const resetRecord = resetRecords[0]

      if (resetRecord.attempts >= 5) {
        await connection.execute(
          'DELETE FROM email_password_resets WHERE id = ?',
          [resetRecord.id],
        )
        await connection.commit()
        return res.status(429).json({
          message: 'Too many incorrect codes. Request a new password reset code.',
        })
      }

      if (Boolean(resetRecord.expired)) {
        await connection.execute(
          'DELETE FROM email_password_resets WHERE id = ?',
          [resetRecord.id],
        )
        await connection.commit()
        return res.status(400).json({
          message: 'The reset code is invalid or expired. Request a new code.',
        })
      }

      if (!compareOtp(otp, resetRecord.otp_hash)) {
        await connection.execute(
          'UPDATE email_password_resets SET attempts = attempts + 1 WHERE id = ?',
          [resetRecord.id],
        )
        await connection.commit()
        return res.status(400).json({ message: 'Incorrect verification code' })
      }

      const passwordHash = await bcrypt.hash(newPassword, 12)
      const [users] = await connection.execute(
        `SELECT id
         FROM users
         WHERE email = ? AND email_verified = TRUE
         FOR UPDATE`,
        [cleanEmail],
      )

      if (!users.length) {
        await connection.execute(
          'DELETE FROM email_password_resets WHERE id = ?',
          [resetRecord.id],
        )
        await connection.commit()
        return res.status(400).json({
          message: 'The reset code is invalid or expired. Request a new code.',
        })
      }

      await connection.execute(
        `UPDATE users
         SET password_hash = ?, token_version = token_version + 1
         WHERE id = ?`,
        [passwordHash, users[0].id],
      )
      req.authUserId = users[0].id
      req.authEmail = cleanEmail
      req.user = { id: users[0].id, email: cleanEmail }
      const [revokedSessions] = await connection.execute(
        `UPDATE user_sessions
         SET ended_at = NOW(3), end_reason = 'security_action'
         WHERE user_id = ? AND ended_at IS NULL`,
        [users[0].id],
      )
      await connection.execute(
        'DELETE FROM email_password_resets WHERE id = ?',
        [resetRecord.id],
      )
      await recordAuthEvent(req, {
        userId: users[0].id,
        email: cleanEmail,
        eventType: 'password_changed',
        success: true,
      }, connection)
      await recordAuthEvent(req, {
        userId: users[0].id,
        email: cleanEmail,
        eventType: 'session_revoked',
        success: true,
        details: { reason: 'password_changed', count: revokedSessions.affectedRows },
      }, connection)
      await recordUserActivity(req, 'auth.password_reset', {}, connection)
      await recordAuditLog(req, {
        actorUserId: users[0].id,
        action: 'password_reset',
        entityType: 'user',
        entityId: users[0].id,
        afterData: { sessionsRevoked: revokedSessions.affectedRows },
      }, connection)
      await connection.commit()
      req.authEventsPersisted = ['password_changed']

      return res.json({
        message: 'Password reset successfully. Sign in with your new password.',
      })
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  } catch (error) {
    console.error('Password reset error:', error.message)
    return res.status(500).json({
      message: 'Unable to reset your password right now',
    })
  }
})

router.post('/logout', async (req, res) => {
  const token = req.cookies?.agrisync_token
  if (token && process.env.JWT_SECRET) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET, {
        algorithms: ['HS256'],
        issuer: process.env.JWT_ISSUER || 'agrisync',
        audience: process.env.JWT_AUDIENCE || 'agrisync-web',
      })

      if (payload.id && payload.sessionId) {
        const connection = await pool.getConnection()
        try {
          await connection.beginTransaction()
          await connection.execute(
            `UPDATE user_sessions
             SET ended_at = NOW(3), end_reason = 'logout'
             WHERE id = ? AND user_id = ? AND ended_at IS NULL`,
            [payload.sessionId, payload.id],
          )
          const reqContext = {
            requestId: req.requestId,
            ip: req.ip,
            get: req.get.bind(req),
            user: { id: payload.id, email: payload.email },
            sessionId: payload.sessionId,
          }
          await recordAuthEvent(reqContext, {
            userId: payload.id,
            sessionId: payload.sessionId,
            email: payload.email,
            eventType: 'logout',
            success: true,
          }, connection)
          await recordAuditLog(reqContext, {
            actorUserId: payload.id,
            action: 'logout',
            entityType: 'user_session',
            entityId: payload.sessionId,
          }, connection)
          await connection.commit()
        } catch (error) {
          await connection.rollback()
          throw error
        } finally {
          connection.release()
        }
      }
    } catch (error) {
      if (error.name !== 'TokenExpiredError' && error.name !== 'JsonWebTokenError') {
        console.error('Logout persistence failed:', error.code || error.message)
        return res.status(500).json({ message: 'Unable to sign out right now.' })
      }
    }
  }

  res.clearCookie('agrisync_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  })

  return res.json({
    message: 'Signed out successfully',
  })
})

module.exports = router
