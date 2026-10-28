const crypto = require('crypto')
const pool = require('./db')

const AUTH_EVENT_TYPES = new Set([
  'signup',
  'login_success',
  'login_failure',
  'logout',
  'google_login',
  'otp_requested',
  'otp_verified',
  'otp_failed',
  'password_changed',
  'session_revoked',
])

function requestMetadata(req) {
  return {
    ip: typeof req.ip === 'string' ? req.ip.slice(0, 45) : null,
    userAgent: typeof req.get('user-agent') === 'string'
      ? req.get('user-agent').slice(0, 1000)
      : null,
    requestId: req.requestId || crypto.randomUUID(),
  }
}

async function recordAuthEvent(req, event, executor = pool) {
  if (!AUTH_EVENT_TYPES.has(event.eventType)) {
    throw new TypeError('Unsupported authentication event type')
  }

  const metadata = requestMetadata(req)
  const [result] = await executor.execute(
    `INSERT INTO auth_events
     (user_id, session_id, attempted_email, event_type, success, ip_address, user_agent, details)
     VALUES (?, ?, ?, ?, ?, INET6_ATON(?), ?, ?)`,
    [
      event.userId || null,
      event.sessionId || null,
      event.email ? event.email.slice(0, 255) : null,
      event.eventType,
      Boolean(event.success),
      metadata.ip,
      metadata.userAgent,
      event.details ? JSON.stringify(event.details) : null,
    ],
  )
  return result.insertId
}

async function recordAuditLog(req, event, executor = pool) {
  const metadata = requestMetadata(req)
  await executor.execute(
    `INSERT INTO audit_logs
     (actor_user_id, action, entity_type, entity_id, before_data, after_data, request_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      event.actorUserId || null,
      event.action.slice(0, 100),
      event.entityType.slice(0, 100),
      event.entityId === undefined || event.entityId === null
        ? null
        : String(event.entityId).slice(0, 100),
      event.beforeData ? JSON.stringify(event.beforeData) : null,
      event.afterData ? JSON.stringify(event.afterData) : null,
      metadata.requestId,
    ],
  )
}

async function createUserSession(req, userId, loginMethod, executor = pool) {
  const metadata = requestMetadata(req)
  const sessionUuid = crypto.randomUUID()
  const [result] = await executor.execute(
    `INSERT INTO user_sessions
     (session_uuid, user_id, login_method, ip_address, user_agent, expires_at)
     VALUES (?, ?, ?, INET6_ATON(?), ?, DATE_ADD(NOW(3), INTERVAL 1 HOUR))`,
    [
      sessionUuid,
      userId,
      loginMethod,
      metadata.ip,
      metadata.userAgent,
    ],
  )

  return {
    id: result.insertId,
    uuid: sessionUuid,
  }
}

async function recordUserActivity(req, eventName, metadata = {}, executor = pool) {
  const userId = req.user && req.user.id
  if (!userId) {
    return
  }

  const safeMetadata = {
    ...metadata,
    requestId: req.requestId || null,
  }

  await executor.execute(
    `INSERT INTO user_activity_events
     (user_id, session_id, event_name, page_path, metadata)
     VALUES (?, ?, ?, ?, ?)`,
    [
      userId,
      req.sessionId || null,
      eventName.slice(0, 100),
      `${req.baseUrl || ''}${req.path || ''}`.slice(0, 500),
      JSON.stringify(safeMetadata),
    ],
  )
}

function trackAuthenticatedActivity(req, res, next) {
  res.once('finish', () => {
    const eventName = `${req.method} ${req.baseUrl || ''}${req.path || ''}`
    const metadata = { statusCode: res.statusCode }

    recordUserActivity(req, eventName, metadata).catch((error) => {
      console.error('User activity persistence failed:', error.code || error.message)
    })

    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && res.statusCode < 400) {
      recordAuditLog(req, {
        actorUserId: req.user.id,
        action: eventName,
        entityType: 'api_request',
        entityId: req.params && (req.params.postId || req.params.id),
        afterData: metadata,
      }).catch((error) => {
        console.error('Audit log persistence failed:', error.code || error.message)
      })
    }
  })
  next()
}

function trackAuthRequest(req, res, next) {
  res.once('finish', () => {
    let eventType
    let success = res.statusCode < 400
    const details = { statusCode: res.statusCode }

    if (req.path === '/signin') {
      eventType = success ? 'login_success' : 'login_failure'
    } else if (req.path === '/signup' || req.path === '/forgot-password') {
      eventType = 'otp_requested'
    } else if (req.path === '/verify-otp') {
      eventType = success ? 'otp_verified' : 'otp_failed'
    } else if (req.path === '/reset-password') {
      eventType = success ? 'password_changed' : 'otp_failed'
    }

    const writes = []
    if (eventType && !(req.authEventsPersisted || []).includes(eventType)) {
      writes.push(recordAuthEvent(req, {
        userId: req.authUserId,
        sessionId: req.sessionId,
        email: req.authEmail || req.body?.email,
        eventType,
        success,
        details,
      }))
    }

    writes.push(recordAuditLog(req, {
      actorUserId: req.authUserId || req.user?.id,
      action: `${req.method} /api/auth${req.path}`.slice(0, 100),
      entityType: 'auth_endpoint',
      entityId: req.path,
      afterData: details,
    }))

    Promise.all(writes).catch((error) => {
      console.error('Authentication event persistence failed:', error.code || error.message)
    })
  })
  next()
}

module.exports = {
  createUserSession,
  recordAuditLog,
  recordAuthEvent,
  recordUserActivity,
  trackAuthenticatedActivity,
  trackAuthRequest,
}
