
const crypto = require('crypto')
const pool = require('../config/db')

function getRequestInfo(req) {
  return {
    ip: req.ip || null,
    userAgent: req.get('user-agent') || null,
  }
}

async function logAuthEvent(req, {
  userId = null,
  sessionId = null,
  email = null,
  eventType,
  success,
  details = null,
}) {
  try {
    const { ip, userAgent } = getRequestInfo(req)

    await pool.execute(
      `INSERT INTO auth_events
       (user_id, session_id, attempted_email, event_type, success,
        ip_address, user_agent, details)
       VALUES (?, ?, ?, ?, ?, INET6_ATON(?), ?, ?)`,
      [
        userId,
        sessionId,
        email,
        eventType,
        success ? 1 : 0,
        ip,
        userAgent,
        details ? JSON.stringify(details) : null,
      ],
    )
  } catch (error) {
    console.error('Auth event logging failed:', error.message)
  }
}

async function createSession(req, user, loginMethod = 'password') {
  const sessionUuid = crypto.randomUUID()
  const { ip, userAgent } = getRequestInfo(req)

  const [result] = await pool.execute(
    `INSERT INTO user_sessions
     (session_uuid, user_id, login_method, ip_address, user_agent, expires_at)
     VALUES (?, ?, ?, INET6_ATON(?), ?, DATE_ADD(NOW(3), INTERVAL 1 HOUR))`,
    [sessionUuid, user.id, loginMethod, ip, userAgent],
  )

  return {
    id: result.insertId,
    uuid: sessionUuid,
  }
}

async function logActivity(req, {
  userId,
  sessionId = null,
  eventName,
  pagePath = null,
  metadata = null,
}) {
  try {
    await pool.execute(
      `INSERT INTO user_activity_events
       (user_id, session_id, event_name, page_path, metadata)
       VALUES (?, ?, ?, ?, ?)`,
      [
        userId,
        sessionId,
        eventName,
        pagePath,
        metadata ? JSON.stringify(metadata) : null,
      ],
    )
  } catch (error) {
    console.error('Activity logging failed:', error.message)
  }
}

module.exports = {
  createSession,
  logAuthEvent,
  logActivity,
}
