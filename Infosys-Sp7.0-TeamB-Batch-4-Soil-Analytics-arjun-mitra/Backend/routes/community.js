const express = require('express')
const pool = require('../config/db')
const authenticate = require('../middleware/authMiddleware')
const { trackAuthenticatedActivity } = require('../config/securityEvents')

const router = express.Router()
let schemaReady

async function initializeCommunitySchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS community_posts (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      author_id BIGINT UNSIGNED NOT NULL,
      content TEXT NOT NULL,
      photo_data MEDIUMBLOB NULL,
      visibility VARCHAR(10) NOT NULL DEFAULT 'public',
      scheduled_at DATETIME NULL,
      repost_of_id BIGINT UNSIGNED NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_community_posts_created (created_at),
      KEY idx_community_posts_author (author_id),
      KEY idx_community_posts_repost (repost_of_id),
      UNIQUE KEY uq_community_repost_author (repost_of_id, author_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)
  const [photoColumns] = await pool.execute(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'community_posts'
       AND COLUMN_NAME = 'photo_data'`,
  )
  if (!photoColumns.length) {
    await pool.query('ALTER TABLE community_posts ADD COLUMN photo_data MEDIUMBLOB NULL')
  }
  const [visibilityColumns] = await pool.execute(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'community_posts'
       AND COLUMN_NAME = 'visibility'`,
  )
  if (!visibilityColumns.length) {
    await pool.query(
      "ALTER TABLE community_posts ADD COLUMN visibility VARCHAR(10) NOT NULL DEFAULT 'public'",
    )
  }
  const [scheduleColumns] = await pool.execute(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'community_posts'
       AND COLUMN_NAME = 'scheduled_at'`,
  )
  if (!scheduleColumns.length) {
    await pool.query('ALTER TABLE community_posts ADD COLUMN scheduled_at DATETIME NULL')
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS community_likes (
      post_id BIGINT UNSIGNED NOT NULL,
      user_id BIGINT UNSIGNED NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (post_id, user_id),
      KEY idx_community_likes_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS community_comments (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      post_id BIGINT UNSIGNED NOT NULL,
      author_id BIGINT UNSIGNED NOT NULL,
      content VARCHAR(1000) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_community_comments_post (post_id, created_at),
      KEY idx_community_comments_author (author_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)
}

router.use(authenticate)
router.use(trackAuthenticatedActivity)
router.use(async (req, res, next) => {
  if (!schemaReady) {
    schemaReady = initializeCommunitySchema().catch((error) => {
      schemaReady = null
      throw error
    })
  }

  try {
    await schemaReady
    return next()
  } catch (error) {
    console.error('Community database setup failed:', error.message)
    return res.status(503).json({ message: 'The farmer community is temporarily unavailable.' })
  }
})

function validId(value) {
  return /^[1-9]\d*$/.test(value)
}

router.get('/posts', async (req, res) => {
  try {
    const [posts] = await pool.execute(
      `SELECT
         CAST(p.id AS CHAR) AS id,
         CAST(p.author_id AS CHAR) AS authorId,
         author.name AS authorName,
         p.content,
         p.photo_data IS NOT NULL AS hasPhoto,
         p.visibility,
         DATE_FORMAT(p.scheduled_at, '%Y-%m-%dT%H:%i:%sZ') AS scheduledAt,
         (p.scheduled_at IS NOT NULL AND p.scheduled_at > UTC_TIMESTAMP()) AS isScheduled,
         p.created_at AS createdAt,
         CAST(p.repost_of_id AS CHAR) AS repostOfId,
         (
           original.visibility = 'public'
           AND (original.scheduled_at IS NULL OR original.scheduled_at <= UTC_TIMESTAMP())
         ) AS originalAvailable,
         CASE
           WHEN original.visibility = 'public'
             AND (original.scheduled_at IS NULL OR original.scheduled_at <= UTC_TIMESTAMP())
           THEN original.content
           ELSE NULL
         END AS originalContent,
         CASE
           WHEN original.visibility = 'public'
             AND (original.scheduled_at IS NULL OR original.scheduled_at <= UTC_TIMESTAMP())
           THEN original.photo_data IS NOT NULL
           ELSE FALSE
         END AS originalHasPhoto,
         CASE
           WHEN original.visibility = 'public'
             AND (original.scheduled_at IS NULL OR original.scheduled_at <= UTC_TIMESTAMP())
           THEN original_author.name
           ELSE NULL
         END AS originalAuthorName,
         CASE
           WHEN original.visibility = 'public'
             AND (original.scheduled_at IS NULL OR original.scheduled_at <= UTC_TIMESTAMP())
           THEN CAST(original.author_id AS CHAR)
           ELSE NULL
         END AS originalAuthorId,
         (SELECT COUNT(*) FROM community_likes l WHERE l.post_id = p.id) AS likesCount,
         (SELECT COUNT(*) FROM community_comments c WHERE c.post_id = p.id) AS commentsCount,
         (SELECT COUNT(*) FROM community_posts r WHERE r.repost_of_id = p.id) AS repostsCount,
         EXISTS(SELECT 1 FROM community_likes mine WHERE mine.post_id = p.id AND mine.user_id = ?) AS likedByMe,
         EXISTS(SELECT 1 FROM community_posts mine WHERE mine.repost_of_id = p.id AND mine.author_id = ?) AS repostedByMe
       FROM community_posts p
       JOIN users author ON author.id = p.author_id
       LEFT JOIN community_posts original ON original.id = p.repost_of_id
       LEFT JOIN users original_author ON original_author.id = original.author_id
       WHERE p.author_id = ?
          OR (
            p.visibility = 'public'
            AND (p.scheduled_at IS NULL OR p.scheduled_at <= UTC_TIMESTAMP())
            AND (
              p.repost_of_id IS NULL
              OR (
                original.visibility = 'public'
                AND (original.scheduled_at IS NULL OR original.scheduled_at <= UTC_TIMESTAMP())
              )
            )
          )
       ORDER BY COALESCE(p.scheduled_at, p.created_at) DESC, p.id DESC
       LIMIT 50`,
      [req.user.id, req.user.id, req.user.id],
    )

    return res.json({
      posts: posts.map((post) => ({
        id: post.id,
        authorId: post.authorId,
        authorName: post.authorName,
        content: post.content,
        createdAt: post.createdAt,
        visibility: post.visibility,
        scheduledAt: post.scheduledAt,
        isScheduled: Boolean(post.isScheduled),
        photoUrl: post.hasPhoto ? `/api/community/posts/${post.id}/photo` : null,
        likesCount: Number(post.likesCount),
        commentsCount: Number(post.commentsCount),
        repostsCount: Number(post.repostsCount),
        likedByMe: Boolean(post.likedByMe),
        repostedByMe: Boolean(post.repostedByMe),
        repostOf: post.repostOfId
          ? {
              id: post.repostOfId,
              available: Boolean(post.originalAvailable),
              authorId: post.originalAuthorId,
              authorName: post.originalAuthorName,
              content: post.originalContent,
              photoUrl: post.originalHasPhoto
                ? `/api/community/posts/${post.repostOfId}/photo`
                : null,
            }
          : null,
      })),
    })
  } catch (error) {
    console.error('Community feed error:', error.message)
    return res.status(500).json({ message: 'Unable to load community posts.' })
  }
})

router.post('/posts', async (req, res) => {
  const content = typeof req.body?.content === 'string' ? req.body.content.trim() : ''
  const photoData = req.body?.photoData
  const visibility = req.body?.visibility ?? 'public'
  const scheduledAt = req.body?.scheduledAt ?? null
  if (content.length > 2000) {
    return res.status(400).json({ message: 'Captions must not exceed 2000 characters.' })
  }
  if (!['public', 'private'].includes(visibility)) {
    return res.status(400).json({ message: 'Choose public or private visibility.' })
  }
  if (scheduledAt !== null && typeof scheduledAt !== 'string') {
    return res.status(400).json({ message: 'Choose a valid post time.' })
  }
  let scheduleDate = null
  if (scheduledAt) {
    const parsedSchedule = new Date(scheduledAt)
    if (Number.isNaN(parsedSchedule.getTime()) || parsedSchedule.getTime() <= Date.now()) {
      return res.status(400).json({ message: 'Choose a post time in the future.' })
    }
    scheduleDate = parsedSchedule.toISOString().slice(0, 19).replace('T', ' ')
  }
  if (photoData !== undefined && photoData !== null && typeof photoData !== 'string') {
    return res.status(400).json({ message: 'Choose a valid photo.' })
  }
  if (!content && !photoData) {
    return res.status(400).json({ message: 'Add a caption or photo before publishing your post.' })
  }

  let photoBuffer = null
  if (photoData) {
    const match = /^data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/.exec(photoData)
    if (!match) {
      return res.status(400).json({ message: 'Community photos must be valid JPEG images.' })
    }

    photoBuffer = Buffer.from(match[1], 'base64')
    if (
      photoBuffer.length > 2 * 1024 * 1024 ||
      photoBuffer.length < 3 ||
      photoBuffer[0] !== 0xff ||
      photoBuffer[1] !== 0xd8 ||
      photoBuffer[2] !== 0xff
    ) {
      return res.status(400).json({ message: 'Choose a valid JPEG photo smaller than 2 MB.' })
    }
  }

  try {
    const [result] = await pool.execute(
      `INSERT INTO community_posts (author_id, content, photo_data, visibility, scheduled_at)
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, content, photoBuffer, visibility, scheduleDate],
    )
    return res.status(201).json({
      id: String(result.insertId),
      message: scheduleDate
        ? 'Post scheduled successfully.'
        : visibility === 'private'
          ? 'Private post saved successfully.'
          : 'Post published.',
    })
  } catch (error) {
    console.error('Community post creation error:', error.message)
    return res.status(500).json({ message: 'Unable to publish your post.' })
  }
})

router.patch('/posts/:postId', async (req, res) => {
  if (!validId(req.params.postId)) {
    return res.status(400).json({ message: 'Invalid post.' })
  }
  const { visibility } = req.body || {}
  if (!['public', 'private'].includes(visibility)) {
    return res.status(400).json({ message: 'Choose public or private visibility.' })
  }

  try {
    const [result] = await pool.execute(
      'UPDATE community_posts SET visibility = ? WHERE id = ? AND author_id = ?',
      [visibility, req.params.postId, req.user.id],
    )
    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Post not found or you do not own it.' })
    }
    return res.json({ visibility, message: `Post is now ${visibility}.` })
  } catch (error) {
    console.error('Community post update error:', error.message)
    return res.status(500).json({ message: 'Unable to update post visibility.' })
  }
})

router.delete('/posts/:postId', async (req, res) => {
  if (!validId(req.params.postId)) {
    return res.status(400).json({ message: 'Invalid post.' })
  }

  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [posts] = await connection.execute(
      'SELECT id FROM community_posts WHERE id = ? AND author_id = ? FOR UPDATE',
      [req.params.postId, req.user.id],
    )
    if (!posts.length) {
      await connection.rollback()
      return res.status(404).json({ message: 'Post not found or you do not own it.' })
    }
    await connection.execute(
      'DELETE FROM community_likes WHERE post_id = ?',
      [req.params.postId],
    )
    await connection.execute(
      'DELETE FROM community_comments WHERE post_id = ?',
      [req.params.postId],
    )
    await connection.execute(
      'DELETE FROM community_posts WHERE repost_of_id = ?',
      [req.params.postId],
    )
    await connection.execute(
      'DELETE FROM community_posts WHERE id = ? AND author_id = ?',
      [req.params.postId, req.user.id],
    )
    await connection.commit()
    return res.json({ message: 'Post deleted.' })
  } catch (error) {
    await connection.rollback()
    console.error('Community post deletion error:', error.message)
    return res.status(500).json({ message: 'Unable to delete post.' })
  } finally {
    connection.release()
  }
})

router.get('/posts/:postId/photo', async (req, res) => {
  if (!validId(req.params.postId)) {
    return res.status(400).json({ message: 'Invalid post.' })
  }

  try {
    const [photos] = await pool.execute(
      `SELECT photo_data FROM community_posts
       WHERE id = ? AND photo_data IS NOT NULL
         AND (
           author_id = ?
           OR (visibility = 'public' AND (scheduled_at IS NULL OR scheduled_at <= UTC_TIMESTAMP()))
         )`,
      [req.params.postId, req.user.id],
    )
    if (!photos.length) return res.status(404).json({ message: 'Photo not found.' })

    return res
      .type('image/jpeg')
      .set('Cache-Control', 'private, max-age=300')
      .send(photos[0].photo_data)
  } catch (error) {
    console.error('Community photo error:', error.message)
    return res.status(500).json({ message: 'Unable to load this photo.' })
  }
})

router.get('/posts/:postId/comments', async (req, res) => {
  if (!validId(req.params.postId)) {
    return res.status(400).json({ message: 'Invalid post.' })
  }

  try {
    const [comments] = await pool.execute(
      `SELECT CAST(c.id AS CHAR) AS id, u.name AS authorName,
              c.content, c.created_at AS createdAt
       FROM community_comments c
       JOIN users u ON u.id = c.author_id
       JOIN community_posts p ON p.id = c.post_id
       WHERE c.post_id = ?
         AND (
           p.author_id = ?
           OR (p.visibility = 'public' AND (p.scheduled_at IS NULL OR p.scheduled_at <= UTC_TIMESTAMP()))
         )
       ORDER BY c.created_at ASC, c.id ASC`,
      [req.params.postId, req.user.id],
    )
    return res.json({ comments })
  } catch (error) {
    console.error('Community comments error:', error.message)
    return res.status(500).json({ message: 'Unable to load comments.' })
  }
})

router.post('/posts/:postId/comments', async (req, res) => {
  if (!validId(req.params.postId)) {
    return res.status(400).json({ message: 'Invalid post.' })
  }

  const content = typeof req.body?.content === 'string' ? req.body.content.trim() : ''
  if (!content || content.length > 1000) {
    return res.status(400).json({ message: 'Comments must contain 1–1000 characters.' })
  }

  try {
    const [posts] = await pool.execute(
      `SELECT id FROM community_posts
       WHERE id = ?
         AND (
           author_id = ?
           OR (visibility = 'public' AND (scheduled_at IS NULL OR scheduled_at <= UTC_TIMESTAMP()))
         )`,
      [req.params.postId, req.user.id],
    )
    if (!posts.length) return res.status(404).json({ message: 'That post no longer exists.' })

    const [result] = await pool.execute(
      'INSERT INTO community_comments (post_id, author_id, content) VALUES (?, ?, ?)',
      [req.params.postId, req.user.id, content],
    )
    return res.status(201).json({ id: String(result.insertId), message: 'Comment added.' })
  } catch (error) {
    console.error('Community comment creation error:', error.message)
    return res.status(500).json({ message: 'Unable to add your comment.' })
  }
})

router.post('/posts/:postId/like', async (req, res) => {
  if (!validId(req.params.postId)) {
    return res.status(400).json({ message: 'Invalid post.' })
  }

  try {
    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()
      const [posts] = await connection.execute(
        `SELECT id FROM community_posts
         WHERE id = ?
           AND (
             author_id = ?
             OR (visibility = 'public' AND (scheduled_at IS NULL OR scheduled_at <= UTC_TIMESTAMP()))
           )
         FOR UPDATE`,
        [req.params.postId, req.user.id],
      )
      if (!posts.length) {
        await connection.rollback()
        return res.status(404).json({ message: 'That post no longer exists.' })
      }

      const [likes] = await connection.execute(
        'SELECT post_id FROM community_likes WHERE post_id = ? AND user_id = ?',
        [req.params.postId, req.user.id],
      )
      if (likes.length) {
        await connection.execute(
          'DELETE FROM community_likes WHERE post_id = ? AND user_id = ?',
          [req.params.postId, req.user.id],
        )
      } else {
        await connection.execute(
          'INSERT INTO community_likes (post_id, user_id) VALUES (?, ?)',
          [req.params.postId, req.user.id],
        )
      }

      await connection.commit()
      return res.json({ liked: !likes.length })
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  } catch (error) {
    console.error('Community like error:', error.message)
    return res.status(500).json({ message: 'Unable to update your like.' })
  }
})

router.post('/posts/:postId/repost', async (req, res) => {
  if (!validId(req.params.postId)) {
    return res.status(400).json({ message: 'Invalid post.' })
  }

  try {
    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()
      const [posts] = await connection.execute(
        `SELECT id FROM community_posts
         WHERE id = ? AND repost_of_id IS NULL
           AND visibility = 'public'
           AND (scheduled_at IS NULL OR scheduled_at <= UTC_TIMESTAMP())
         FOR UPDATE`,
        [req.params.postId],
      )
      if (!posts.length) {
        await connection.rollback()
        return res.status(404).json({ message: 'That original post no longer exists.' })
      }

      const [reposts] = await connection.execute(
        'SELECT id FROM community_posts WHERE repost_of_id = ? AND author_id = ?',
        [req.params.postId, req.user.id],
      )
      if (reposts.length) {
        await connection.execute(
          'DELETE FROM community_likes WHERE post_id = ?',
          [reposts[0].id],
        )
        await connection.execute(
          'DELETE FROM community_comments WHERE post_id = ?',
          [reposts[0].id],
        )
        await connection.execute(
          'DELETE FROM community_posts WHERE id = ?',
          [reposts[0].id],
        )
      } else {
        await connection.execute(
          'INSERT INTO community_posts (author_id, content, repost_of_id) VALUES (?, ?, ?)',
          [req.user.id, '', req.params.postId],
        )
      }

      await connection.commit()
      return res.json({ reposted: !reposts.length })
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  } catch (error) {
    console.error('Community repost error:', error.message)
    return res.status(500).json({ message: 'Unable to update your repost.' })
  }
})

module.exports = router
