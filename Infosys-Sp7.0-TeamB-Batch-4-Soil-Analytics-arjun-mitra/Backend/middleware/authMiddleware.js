const jwt = require('jsonwebtoken')
const pool = require('../config/db')

async function authenticate(req, res, next) {
  const token = req.cookies?.agrisync_token

  if (!token) {
    return res.status(401).json({ message: 'Sign in to use the farmer community.' })
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: process.env.JWT_ISSUER || 'agrisync',
      audience: process.env.JWT_AUDIENCE || 'agrisync-web',
    })

    if (!payload.id) {
      return res.status(401).json({ message: 'Your session is invalid. Please sign in again.' })
    }

    const [users] = await pool.execute(
      'SELECT token_version FROM users WHERE id = ?',
      [payload.id],
    )

    if (
      !users.length ||
      Number(users[0].token_version) !== Number(payload.tokenVersion || 0)
    ) {
      return res.status(401).json({ message: 'Your session has expired. Please sign in again.' })
    }

    if (payload.sessionId) {
      await pool.execute(
        `UPDATE user_sessions
         SET ended_at = NOW(3), end_reason = 'expired'
         WHERE id = ? AND user_id = ? AND ended_at IS NULL AND expires_at <= NOW(3)`,
        [payload.sessionId, payload.id],
      )

      const [sessions] = await pool.execute(
        `SELECT id
         FROM user_sessions
         WHERE id = ? AND user_id = ? AND ended_at IS NULL AND expires_at > NOW(3)
         LIMIT 1`,
        [payload.sessionId, payload.id],
      )

      if (!sessions.length) {
        return res.status(401).json({ message: 'Your session has expired. Please sign in again.' })
      }

      await pool.execute(
        'UPDATE user_sessions SET last_seen_at = NOW(3) WHERE id = ?',
        [payload.sessionId],
      )
      req.sessionId = payload.sessionId
    }

    req.user = { id: payload.id, email: payload.email }
    return next()
  } catch (error) {
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Your session has expired. Please sign in again.' })
    }

    console.error('Community authentication error:', error.message)
    return res.status(500).json({ message: 'Unable to verify your session.' })
  }
}

module.exports = authenticate