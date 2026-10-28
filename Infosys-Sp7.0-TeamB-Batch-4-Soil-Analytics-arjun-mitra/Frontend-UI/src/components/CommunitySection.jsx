import { useEffect, useRef, useState } from 'react'
import {
  Heart,
  Globe2,
  ImagePlus,
  LockKeyhole,
  MessageCircle,
  Repeat2,
  Share2,
  Send,
  Sprout,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'

const API_URL = 'http://localhost:5000/api/community'
const MAX_UPLOAD_SIZE = 12 * 1024 * 1024
const MAX_COMPRESSED_SIZE = 2 * 1024 * 1024

function extractHashtags(content) {
  return [...new Set([...content.matchAll(/#([\p{L}\p{N}_]+)/gu)].map((match) => match[1].toLowerCase()))]
}

function photoUrl(path) {
  return path ? `${new URL(API_URL).origin}${path}` : null
}

function Caption({ content, onHashtagClick }) {
  return (
    <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-[#514b3e]">
      {content.split(/(#[\p{L}\p{N}_]+)/gu).map((part, index) =>
        part.startsWith('#') ? (
          <button
            key={`${part}-${index}`}
            type="button"
            onClick={() => onHashtagClick(part.slice(1).toLowerCase())}
            className="font-semibold text-[#52764a] hover:underline"
          >
            {part}
          </button>
        ) : (
          part
        ),
      )}
    </p>
  )
}

async function compressPhoto(file) {
  if (typeof createImageBitmap !== 'function') {
    throw new Error('Photo editing is not supported in this browser. Try a newer browser.')
  }

  const bitmap = await createImageBitmap(file)
  try {
    let scale = Math.min(1, 1440 / Math.max(bitmap.width, bitmap.height))

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(bitmap.width * scale))
      canvas.height = Math.max(1, Math.round(bitmap.height * scale))
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Unable to prepare this photo. Please try another image.')

      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.8))
      if (!blob) throw new Error('Unable to prepare this photo. Please try another image.')

      if (blob.size <= MAX_COMPRESSED_SIZE) {
        return await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result)
          reader.onerror = () => reject(new Error('Unable to read this photo. Please try another image.'))
          reader.readAsDataURL(blob)
        })
      }

      scale *= 0.75
    }

    throw new Error('This photo could not be reduced enough. Please choose a smaller image.')
  } finally {
    bitmap.close()
  }
}

function displayName(name, email) {
  return name?.trim() || email || 'Farmer'
}

function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function formatDate(date) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date))
}

function localDateTimeMinimum() {
  const now = new Date()
  now.setMinutes(now.getMinutes() + 1)
  now.setSeconds(0, 0)
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16)
}

function parseJsonResponse(responseText) {
  try {
    return JSON.parse(responseText)
  } catch {
    return null
  }
}

async function communityRequest(path, options = {}) {
  let response
  try {
    response = await fetch(`${API_URL}${path}`, {
      credentials: 'include',
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new Error(
      'Cannot reach the AgriSync community API. Start or restart the backend, then try again.',
      { cause: error },
    )
  }

  const responseText = await response.text()
  const data = responseText ? parseJsonResponse(responseText) : null

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('The community API route was not found. Restart the backend server to load the community routes.')
    }
    if (response.status === 401) {
      throw new Error(data.message || 'Your sign-in has expired. Sign in again to use the community.')
    }
    throw new Error(data.message || `Community request failed (${response.status}). Please try again.`)
  }

  if (!responseText) throw new Error('The community API returned an empty response. Restart the backend and try again.')
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('The community API returned an invalid response. Restart the backend and try again.')
  }
  return data
}

function FarmerAvatar({ name, image }) {
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#35583b]/10 bg-[#e7ebdf] text-sm font-semibold text-[#35583b]">
      {image ? (
        <img src={image} alt="" className="h-full w-full object-cover" />
      ) : name ? (
        initials(name)
      ) : (
        <UserRound size={19} />
      )}
    </div>
  )
}

export default function CommunitySection({ user, profile, profileImage }) {
  const name = displayName(profile?.name, user?.email)
  const [posts, setPosts] = useState([])
  const [draft, setDraft] = useState('')
  const [draftPhoto, setDraftPhoto] = useState('')
  const [draftVisibility, setDraftVisibility] = useState('public')
  const [scheduledAt, setScheduledAt] = useState('')
  const [photoLoading, setPhotoLoading] = useState(false)
  const [hashtagDraft, setHashtagDraft] = useState('')
  const [hashtagFilter, setHashtagFilter] = useState('')
  const [commentsByPost, setCommentsByPost] = useState({})
  const [commentsLoading, setCommentsLoading] = useState(null)
  const [commentDrafts, setCommentDrafts] = useState({})
  const [openComments, setOpenComments] = useState(null)
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [busyPost, setBusyPost] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const galleryInputRef = useRef(null)
  const cameraVideoRef = useRef(null)
  const cameraStreamRef = useRef(null)
  const [cameraStream, setCameraStream] = useState(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraFacingMode, setCameraFacingMode] = useState('environment')
  const [cameraError, setCameraError] = useState('')

  useEffect(() => {
    if (cameraVideoRef.current && cameraStream) {
      cameraVideoRef.current.srcObject = cameraStream
    }
    return () => cameraStream?.getTracks().forEach((track) => track.stop())
  }, [cameraStream])

  useEffect(
    () => () => cameraStreamRef.current?.getTracks().forEach((track) => track.stop()),
    [],
  )

  async function loadPosts() {
    try {
      const data = await communityRequest('/posts')
      setPosts(data.posts)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const controller = new AbortController()

    communityRequest('/posts', { signal: controller.signal })
      .then((data) => setPosts(data.posts))
      .catch((requestError) => {
        if (!controller.signal.aborted) setError(requestError.message)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [])

  async function selectPostPhoto(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Choose a photo image file.')
      return
    }
    if (file.size > MAX_UPLOAD_SIZE) {
      setError('Choose a photo smaller than 12 MB.')
      return
    }

    setError('')
    setPhotoLoading(true)
    try {
      setDraftPhoto(await compressPhoto(file))
    } catch (photoError) {
      setError(photoError.message)
    } finally {
      setPhotoLoading(false)
    }
  }

  async function openCamera(facingMode = cameraFacingMode) {
    setCameraError('')
    setCameraOpen(true)
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera access requires a secure connection (HTTPS or localhost) and a supported browser.')
      return
    }

    cameraStreamRef.current?.getTracks().forEach((track) => track.stop())
    cameraStreamRef.current = null
    setCameraStream(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })
      cameraStreamRef.current = stream
      setCameraStream(stream)
    } catch (cameraRequestError) {
      setCameraError(
        cameraRequestError.name === 'NotAllowedError'
          ? 'Camera permission was denied. Allow camera access in your browser settings and try again.'
          : cameraRequestError.name === 'NotFoundError'
            ? 'No camera was found on this device. Use Add from gallery instead.'
            : 'Unable to open the camera. Check that it is available and not being used by another app.',
      )
    }
  }

  function closeCamera() {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop())
    cameraStreamRef.current = null
    setCameraStream(null)
    setCameraOpen(false)
    setCameraError('')
  }

  async function captureCommunityPhoto() {
    const video = cameraVideoRef.current
    if (!video?.videoWidth || !video.videoHeight) {
      setCameraError('The camera is not ready yet. Please wait a moment and try again.')
      return
    }

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const context = canvas.getContext('2d')
    if (!context) {
      setCameraError('Unable to capture the photo. Please try again.')
      return
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))
    if (!blob) {
      setCameraError('Unable to capture the photo. Please try again.')
      return
    }

    closeCamera()
    setError('')
    setPhotoLoading(true)
    try {
      setDraftPhoto(await compressPhoto(blob))
    } catch (photoError) {
      setError(photoError.message)
    } finally {
      setPhotoLoading(false)
    }
  }

  function addHashtag(event) {
    event.preventDefault()
    const tag = hashtagDraft.trim().replace(/^#+/, '').replace(/[^\p{L}\p{N}_]/gu, '')
    if (!tag) return
    const currentTags = extractHashtags(draft)
    if (currentTags.includes(tag.toLowerCase())) {
      setHashtagDraft('')
      return
    }
    setDraft((current) => `${current.trimEnd()}${current.trim() ? ' ' : ''}#${tag}`.slice(0, 2000))
    setHashtagDraft('')
  }

  async function createPost(event) {
    event.preventDefault()
    const content = draft.trim()
    if (!content && !draftPhoto) {
      setError('Add a caption or photo before publishing your post.')
      return
    }

    setError('')
    setPosting(true)
    try {
      await communityRequest('/posts', {
        method: 'POST',
        body: JSON.stringify({
          content,
          photoData: draftPhoto || null,
          visibility: draftVisibility,
          scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        }),
      })
      setNotice(
        scheduledAt
          ? `Post scheduled for ${new Date(scheduledAt).toLocaleString()}.`
          : draftVisibility === 'private'
            ? 'Private post saved. Only you can see it.'
            : 'Your post is now public.',
      )
      setDraft('')
      setDraftPhoto('')
      setHashtagDraft('')
      setScheduledAt('')
      setDraftVisibility('public')
      setHashtagFilter('')
      await loadPosts()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setPosting(false)
    }
  }

  async function toggleComments(postId) {
    if (openComments === postId) {
      setOpenComments(null)
      return
    }

    setOpenComments(postId)
    if (commentsByPost[postId]) return

    setCommentsLoading(postId)
    try {
      const data = await communityRequest(`/posts/${postId}/comments`)
      setCommentsByPost((current) => ({ ...current, [postId]: data.comments }))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setCommentsLoading(null)
    }
  }

  async function submitComment(event, postId) {
    event.preventDefault()
    const content = (commentDrafts[postId] || '').trim()
    if (!content) return

    setError('')
    setBusyPost(postId)
    setError('')
    try {
      await communityRequest(`/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      })
      setCommentDrafts((current) => ({ ...current, [postId]: '' }))
      const data = await communityRequest(`/posts/${postId}/comments`)
      setCommentsByPost((current) => ({ ...current, [postId]: data.comments }))
      await loadPosts()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusyPost(null)
    }
  }

  async function togglePostAction(postId, action) {
    setBusyPost(postId)
    setError('')
    try {
      await communityRequest(`/posts/${postId}/${action}`, { method: 'POST' })
      await loadPosts()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusyPost(null)
    }
  }

  async function changePostVisibility(postId, visibility) {
    setBusyPost(postId)
    setError('')
    try {
      const result = await communityRequest(`/posts/${postId}`, {
        method: 'PATCH',
        body: JSON.stringify({ visibility }),
      })
      setNotice(result.message)
      await loadPosts()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusyPost(null)
    }
  }

  async function deletePost(postId) {
    if (!window.confirm('Delete this post? This cannot be undone.')) return

    setBusyPost(postId)
    setError('')
    try {
      const result = await communityRequest(`/posts/${postId}`, { method: 'DELETE' })
      setNotice(result.message)
      setCommentsByPost((current) => {
        const next = { ...current }
        delete next[postId]
        return next
      })
      await loadPosts()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusyPost(null)
    }
  }

  async function sharePost(post) {
    const shareText = `${post.authorName} on AgriSync: ${post.repostOf?.content || post.content}`
    const shareUrl = window.location.origin

    try {
      if (navigator.share) {
        await navigator.share({ title: 'AgriSync Community', text: shareText, url: shareUrl })
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`)
        setError('')
        setNotice('Post copied to clipboard.')
      } else {
        throw new Error('Sharing is not available in this browser.')
      }
    } catch (shareError) {
      if (shareError.name !== 'AbortError') setError(shareError.message)
    }
  }

  return (
    <section className="space-y-6">
      <div className="relative overflow-hidden rounded-[30px] bg-[#35583b] p-6 text-white shadow-[0_24px_55px_rgba(53,88,59,0.16)] sm:p-8">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs tracking-wide text-white/85">
            <Sprout size={15} />
            FARMER-TO-FARMER KNOWLEDGE
          </span>
          <h1 className="mt-4 font-serif text-3xl sm:text-4xl">The AgriSync community</h1>
          <p className="mt-3 max-w-xl text-sm leading-7 text-white/75">
            Share what is working on your farm, ask questions, and learn from fellow growers.
          </p>
        </div>
        <Sprout className="absolute -bottom-9 -right-3 h-40 w-40 text-white/10 sm:h-52 sm:w-52" />
      </div>

      <form
        onSubmit={createPost}
        className="rounded-3xl border border-white bg-[#fffdf7] p-5 shadow-sm sm:p-6"
      >
        <div className="flex items-start gap-3">
          <FarmerAvatar name={name} image={profileImage?.preview} />
          <label className="min-w-0 flex-1">
            <span className="sr-only">Write a community post</span>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={2000}
              rows={3}
              placeholder={`Add a caption for your farm photo, ${name.split(' ')[0]}… Use #hashtags to help others discover it.`}
              className="w-full resize-y rounded-2xl border border-[#352e20]/10 bg-[#faf9f2] p-4 text-sm leading-6 text-[#352e20] outline-none transition placeholder:text-[#918b7d] focus:border-[#78966b] focus:ring-2 focus:ring-[#78966b]/15"
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 pl-0 sm:pl-14">
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            onChange={selectPostPhoto}
            className="hidden"
            aria-label="Choose a photo from your device"
          />
          <button
            type="button"
            onClick={() => openCamera()}
            disabled={photoLoading || posting}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-semibold text-[#52764a] transition hover:bg-[#e7ebdf] disabled:opacity-50"
          >
            <ImagePlus size={17} />
            Take photo
          </button>
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            disabled={photoLoading || posting}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-semibold text-[#52764a] transition hover:bg-[#e7ebdf] disabled:opacity-50"
          >
            <ImagePlus size={17} />
            Add from gallery
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-xs">
            <input
              value={hashtagDraft}
              onChange={(event) => setHashtagDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') addHashtag(event)
              }}
              maxLength={50}
              placeholder="# Add hashtag"
              aria-label="Add a hashtag to your caption"
              className="h-10 min-w-0 flex-1 rounded-xl border border-[#352e20]/10 bg-[#faf9f2] px-3 text-xs outline-none focus:border-[#78966b]"
            />
            <button
              type="button"
              onClick={addHashtag}
              disabled={!hashtagDraft.trim()}
              className="h-10 rounded-xl border border-[#35583b]/15 px-3 text-xs font-semibold text-[#35583b] disabled:opacity-50"
            >
              Add tag
            </button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-3 pl-0 sm:pl-14">
          <label className="flex min-w-[150px] flex-1 flex-col gap-1.5 text-xs font-semibold text-[#6b634f] sm:flex-none">
            Visibility
            <span className="relative">
              <select
                value={draftVisibility}
                onChange={(event) => setDraftVisibility(event.target.value)}
                className="h-10 w-full appearance-none rounded-xl border border-[#352e20]/10 bg-[#faf9f2] pl-9 pr-8 text-xs outline-none focus:border-[#78966b] sm:w-44"
              >
                <option value="public">Public</option>
                <option value="private">Private — only me</option>
              </select>
              {draftVisibility === 'public' ? (
                <Globe2 size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#52764a]" />
              ) : (
                <LockKeyhole size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#52764a]" />
              )}
            </span>
          </label>
          <label className="flex min-w-[190px] flex-1 flex-col gap-1.5 text-xs font-semibold text-[#6b634f] sm:flex-none">
            Schedule (optional)
            <input
              type="datetime-local"
              min={localDateTimeMinimum()}
              value={scheduledAt}
              onChange={(event) => setScheduledAt(event.target.value)}
              className="h-10 w-full rounded-xl border border-[#352e20]/10 bg-[#faf9f2] px-3 text-xs outline-none focus:border-[#78966b] sm:w-56"
            />
          </label>
        </div>
        {draftVisibility === 'private' && (
          <p className="mt-2 text-xs text-[#77705e] sm:pl-14">Only you can see this post.</p>
        )}
        {cameraOpen && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#1b2a1f]/75 p-4 backdrop-blur-sm">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="community-camera-title"
              className="w-full max-w-xl overflow-hidden rounded-3xl border border-white/70 bg-[#fffdf7] p-4 shadow-2xl sm:p-6"
            >
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <h2 id="community-camera-title" className="font-serif text-xl text-[#352e20]">Take a community photo</h2>
                  <p className="mt-1 text-xs text-[#77705e]">Capture a farm moment to add to your post.</p>
                </div>
                <button
                  type="button"
                  onClick={closeCamera}
                  aria-label="Close camera"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#f0eee5] text-[#514b3e] hover:bg-[#e7ebdf]"
                >
                  <X size={18} />
                </button>
              </div>
              {cameraStream ? (
                <video
                  ref={cameraVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="aspect-[4/3] w-full rounded-2xl bg-[#1b2a1f] object-cover"
                />
              ) : (
                <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 rounded-2xl bg-[#f0eee5] px-6 text-center">
                  <ImagePlus size={30} className="text-[#52764a]" />
                  <p className="text-sm text-[#514b3e]">
                    {cameraError || 'Waiting for camera permission…'}
                  </p>
                </div>
              )}
              {cameraError && cameraStream && (
                <p role="alert" className="mt-3 text-sm text-[#8b493e]">{cameraError}</p>
              )}
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const nextFacingMode = cameraFacingMode === 'environment' ? 'user' : 'environment'
                    setCameraFacingMode(nextFacingMode)
                    openCamera(nextFacingMode)
                  }}
                  disabled={!cameraStream}
                  className="min-h-11 rounded-xl border border-[#35583b]/20 px-4 text-sm font-semibold text-[#35583b] disabled:opacity-50"
                >
                  Switch camera
                </button>
                <button
                  type="button"
                  onClick={captureCommunityPhoto}
                  disabled={!cameraStream || photoLoading}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#35583b] px-5 text-sm font-semibold text-white hover:bg-[#284630] disabled:opacity-50"
                >
                  <ImagePlus size={17} />
                  Capture photo
                </button>
              </div>
            </div>
          </div>
        )}
        {draftPhoto && (
          <div className="relative mt-4 overflow-hidden rounded-2xl border border-[#352e20]/10 bg-[#faf9f2] sm:ml-14">
            <img src={draftPhoto} alt="Photo attached to your post" className="max-h-[380px] w-full object-contain" />
            <button
              type="button"
              onClick={() => setDraftPhoto('')}
              aria-label="Remove attached photo"
              className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-[#fffdf7]/95 text-[#514b3e] shadow"
            >
              <X size={17} />
            </button>
          </div>
        )}
        {photoLoading && (
          <p role="status" className="mt-3 text-xs text-[#77705e] sm:pl-14">Preparing photo…</p>
        )}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 pl-0 sm:pl-14">
          <span className="text-xs text-[#91866f]">{draft.length}/2000 · Add #hashtags to help farmers find your post</span>
          <button
            type="submit"
            disabled={posting || photoLoading}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#35583b] px-5 text-sm font-semibold text-white transition hover:bg-[#284630] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {posting ? 'Publishing…' : 'Share with community'}
            <Send size={16} />
          </button>
        </div>
      </form>

      {error && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-2xl border border-[#a94c3e]/20 bg-[#f7e9e4] px-4 py-3 text-sm text-[#8b493e]">
          <span>{error}</span>
          <button type="button" onClick={() => setError('')} className="shrink-0 font-semibold">Dismiss</button>
        </div>
      )}
      {notice && (
        <div role="status" className="rounded-2xl border border-[#35583b]/15 bg-[#e7ebdf] px-4 py-3 text-sm text-[#35583b]">
          {notice}
        </div>
      )}

      {loading ? (
        <div className="rounded-3xl border border-white bg-[#fffdf7] p-10 text-center text-sm text-[#77705e] shadow-sm">
          Loading the farmer community…
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-3xl border border-white bg-[#fffdf7] p-9 text-center shadow-sm">
          <Sprout className="mx-auto text-[#78966b]" size={30} />
          <h2 className="mt-3 font-serif text-xl text-[#352e20]">Start the conversation</h2>
          <p className="mt-2 text-sm text-[#77705e]">Your community feed is ready for its first farm story.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {hashtagFilter && (
            <div className="flex items-center justify-between rounded-2xl bg-[#e7ebdf] px-4 py-3 text-sm text-[#35583b]">
              <span>Posts tagged <strong>#{hashtagFilter}</strong></span>
              <button type="button" onClick={() => setHashtagFilter('')} className="font-semibold hover:underline">Show all posts</button>
            </div>
          )}
          {posts.filter((post) => {
            const content = post.repostOf?.content || post.content
            return !hashtagFilter || extractHashtags(content).includes(hashtagFilter)
          }).length === 0 && (
            <div className="rounded-3xl border border-white bg-[#fffdf7] p-8 text-center text-sm text-[#77705e] shadow-sm">
              No posts found for #{hashtagFilter}.
            </div>
          )}
          {posts.filter((post) => {
            const content = post.repostOf?.content || post.content
            return !hashtagFilter || extractHashtags(content).includes(hashtagFilter)
          }).map((post) => (
            <article key={post.id} className="rounded-3xl border border-white bg-[#fffdf7] p-5 shadow-sm sm:p-6">
              {post.repostOf && (
                <div className="mb-3 flex items-center gap-2 text-xs font-medium text-[#78906a]">
                  <Repeat2 size={15} />
                  {post.authorName} reposted
                </div>
              )}
              <div className="flex items-start gap-3">
                <FarmerAvatar name={post.authorName} image={String(post.authorId) === String(user?.id) ? profileImage?.preview : null} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <h2 className="text-sm font-semibold text-[#352e20]">{post.authorName}</h2>
                      <span className="text-xs text-[#91866f]">· {formatDate(post.createdAt)}</span>
                    </div>
                    {String(post.authorId) === String(user?.id) && (
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <label className="sr-only" htmlFor={`post-visibility-${post.id}`}>Post visibility</label>
                        <select
                          id={`post-visibility-${post.id}`}
                          value={post.visibility}
                          disabled={busyPost === post.id}
                          onChange={(event) => changePostVisibility(post.id, event.target.value)}
                          className="h-9 rounded-lg border border-[#352e20]/10 bg-[#faf9f2] px-2 text-xs text-[#52764a] outline-none focus:border-[#78966b] disabled:opacity-50"
                        >
                          <option value="public">Public</option>
                          <option value="private">Private</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => deletePost(post.id)}
                          disabled={busyPost === post.id}
                          aria-label="Delete your post"
                          className="grid h-9 w-9 place-items-center rounded-lg text-[#8b493e] transition hover:bg-[#f5e9e5] disabled:opacity-50"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                  {post.isScheduled && (
                    <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#f3eddb] px-2.5 py-1.5 text-xs font-medium text-[#8a7044]">
                      <Send size={13} />
                      Scheduled for {new Date(post.scheduledAt).toLocaleString()}
                    </p>
                  )}
                  {String(post.authorId) === String(user?.id) && !post.isScheduled && post.visibility === 'private' && (
                    <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#f0eee5] px-2.5 py-1.5 text-xs font-medium text-[#6b634f]">
                      <LockKeyhole size={13} />
                      Only you can see this post
                    </p>
                  )}
                  {post.repostOf ? (
                    <div className="mt-3 rounded-2xl border border-[#352e20]/10 bg-[#faf9f2] p-4">
                      {post.repostOf.available ? (
                        <>
                          <p className="text-xs font-semibold text-[#52764a]">{post.repostOf.authorName}</p>
                          {post.repostOf.photoUrl && (
                            <img crossOrigin="use-credentials" src={photoUrl(post.repostOf.photoUrl)} alt="Photo shared in the original post" loading="lazy" className="mt-3 max-h-[520px] w-full rounded-xl bg-[#eeeade] object-contain" />
                          )}
                          {post.repostOf.content && <Caption content={post.repostOf.content} onHashtagClick={setHashtagFilter} />}
                        </>
                      ) : (
                        <p className="text-sm text-[#77705e]">The original post is no longer public.</p>
                      )}
                    </div>
                  ) : (
                    <>
                      {post.photoUrl && (
                        <img crossOrigin="use-credentials" src={photoUrl(post.photoUrl)} alt="Photo shared by a farmer" loading="lazy" className="mt-3 max-h-[520px] w-full rounded-2xl bg-[#eeeade] object-contain" />
                      )}
                      {post.content && <Caption content={post.content} onHashtagClick={setHashtagFilter} />}
                    </>
                  )}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-1 border-t border-[#352e20]/10 pt-3">
                <button
                  type="button"
                  disabled={busyPost === post.id}
                  onClick={() => togglePostAction(post.id, 'like')}
                  aria-pressed={Boolean(post.likedByMe)}
                  className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-semibold transition hover:bg-[#f2eee4] disabled:opacity-50 ${post.likedByMe ? 'text-[#a94c3e]' : 'text-[#6b634f]'}`}
                >
                  <Heart size={17} fill={post.likedByMe ? 'currentColor' : 'none'} />
                  {post.likesCount} Like
                </button>
                <button
                  type="button"
                  onClick={() => toggleComments(post.id)}
                  aria-expanded={openComments === post.id}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-semibold text-[#6b634f] transition hover:bg-[#f2eee4]"
                >
                  <MessageCircle size={17} />
                  {post.commentsCount} Comment
                </button>
                <button
                  type="button"
                  disabled={busyPost === post.id || Boolean(post.repostOf)}
                  onClick={() => togglePostAction(post.id, 'repost')}
                  aria-pressed={Boolean(post.repostedByMe)}
                  className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-semibold transition hover:bg-[#f2eee4] disabled:opacity-50 ${post.repostedByMe ? 'text-[#35583b]' : 'text-[#6b634f]'}`}
                >
                  <Repeat2 size={17} />
                  {post.repostsCount} Repost
                </button>
                <button
                  type="button"
                  onClick={() => sharePost(post)}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-semibold text-[#6b634f] transition hover:bg-[#f2eee4]"
                >
                  <Share2 size={17} />
                  Share
                </button>
              </div>

              {openComments === post.id && (
                <div className="mt-3 border-t border-[#352e20]/10 pt-4">
                  <div className="space-y-3">
                    {(commentsByPost[post.id] || []).map((comment) => (
                      <div key={comment.id} className="flex items-start gap-2.5">
                        <FarmerAvatar name={comment.authorName} />
                        <div className="min-w-0 flex-1 rounded-2xl bg-[#f5f5ed] px-3.5 py-2.5">
                          <div className="flex flex-wrap items-center gap-x-2">
                            <span className="text-xs font-semibold text-[#35583b]">{comment.authorName}</span>
                            <span className="text-[10px] text-[#91866f]">{formatDate(comment.createdAt)}</span>
                          </div>
                          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-[#514b3e]">{comment.content}</p>
                        </div>
                      </div>
                    ))}
                    {commentsLoading === post.id && (
                      <p className="py-2 text-xs text-[#91866f]">Loading comments…</p>
                    )}
                    {commentsByPost[post.id]?.length === 0 && commentsLoading !== post.id && (
                      <p className="py-2 text-xs text-[#91866f]">No comments yet. Add the first one.</p>
                    )}
                  </div>
                  <form onSubmit={(event) => submitComment(event, post.id)} className="mt-4 flex items-center gap-2">
                    <label className="min-w-0 flex-1">
                      <span className="sr-only">Write a comment</span>
                      <input
                        value={commentDrafts[post.id] || ''}
                        onChange={(event) => setCommentDrafts((current) => ({ ...current, [post.id]: event.target.value }))}
                        maxLength={1000}
                        placeholder="Add a thoughtful comment…"
                        className="h-11 w-full rounded-xl border border-[#352e20]/10 bg-[#faf9f2] px-3 text-sm outline-none focus:border-[#78966b]"
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={busyPost === post.id || !(commentDrafts[post.id] || '').trim()}
                      aria-label="Send comment"
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#35583b] text-white transition hover:bg-[#284630] disabled:opacity-50"
                    >
                      <Send size={16} />
                    </button>
                  </form>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
