
import { useEffect, useRef, useState } from 'react'
import {
  Sprout,
  UserRound,
  Camera,
  SwitchCamera,
  Upload,
  Image as ImageIcon,
  LayoutDashboard,
  History,
  Users,
  LogOut,
  Save,
  Pencil,
  Trash2,
  X,
  Leaf,
  ScanSearch,
  Download,
} from 'lucide-react'
import CommunitySection from '../src/components/CommunitySection'

const initialProfile = {
  name: '',
  phone: '',
  location: '',
  farmSize: '',
  soilType: 'Unknown',
  crops: '',
}

const PROFILE_STORAGE_KEY = 'agrisync-farmer-profile'
const PHOTO_STORAGE_KEY = 'agrisync-farmer-photo'

export default function FarmerDashboard({ user, onLogout }) {
  const [profile, setProfile] = useState({
    ...initialProfile,
    name: user?.name || '',
  })
  const [loading, setLoading] = useState(true)
  const [profileImage, setProfileImage] = useState(null)
  const [editing, setEditing] = useState(true)
  const [photo, setPhoto] = useState(null)
  const [history, setHistory] = useState([])
  const [soilInputs, setSoilInputs] = useState({
    nitrogen: '', phosphorus: '', potassium: '', temperature: '',
    humidity: '', ph: '', rainfall: '',
  })
  const [analysisResult, setAnalysisResult] = useState(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [imageAnalysis, setImageAnalysis] = useState(null)
  const [imageAnalysisLoading, setImageAnalysisLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [activeSection, setActiveSection] = useState('overview')
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraLoading, setCameraLoading] = useState(false)
  const [cameraFacingMode, setCameraFacingMode] = useState('environment')
  const [cameraTarget, setCameraTarget] = useState('soil')
  const [cameraStream, setCameraStream] = useState(null)
  const fileRef = useRef(null)
  const videoRef = useRef(null)
  const cameraStreamRef = useRef(null)
  const cameraRequestRef = useRef(0)
  const profileImageRef = useRef(null)

  useEffect(() => {
    if (!cameraStream) return

    if (videoRef.current) {
      videoRef.current.srcObject = cameraStream
    }

    return () => cameraStream.getTracks().forEach((track) => track.stop())
  }, [cameraStream])

  useEffect(
    () => () => {
      cameraRequestRef.current += 1
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop())
    },
    [],
  )

  useEffect(() => {
    let loadingTimer

    try {
      const savedProfile = localStorage.getItem(PROFILE_STORAGE_KEY)
      if (savedProfile) {
        try {
          const parsedProfile = JSON.parse(savedProfile)
          setProfile({ ...initialProfile, ...parsedProfile })
          setEditing(false)
        } catch (error) {
          console.error('Failed to read saved profile:', error)
        }
      }

      const savedPhoto = localStorage.getItem(PHOTO_STORAGE_KEY)
      if (savedPhoto) {
        try {
          setProfileImage(JSON.parse(savedPhoto))
        } catch (error) {
          console.error('Failed to read saved profile photo:', error)
        }
      }
    } finally {
      loadingTimer = window.setTimeout(() => setLoading(false), 600)
    }

    return () => window.clearTimeout(loadingTimer)
  }, [])

  useEffect(() => {
    fetch('http://localhost:5000/api/soil-analysis/history', { credentials: 'include' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load analysis history.')
        return response.json()
      })
      .then((data) => setHistory(data.analyses || []))
      .catch((error) => console.error('Analysis history request failed:', error))
  }, [])

  function updateProfile(event) {
    setProfile({
      ...profile,
      [event.target.name]: event.target.value,
    })
  }

  function saveProfile(event) {
    event.preventDefault()
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile))
    setEditing(false)
    setMessage('Profile saved successfully.')
  }

  function handleProfileImageChange(event) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setMessage('Please select an image file for your profile photo.')
      event.target.value = ''
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setMessage('Please choose a profile photo smaller than 10 MB.')
      event.target.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const profilePhoto = {
        name: file.name,
        preview: reader.result,
      }
      setProfileImage(profilePhoto)
      localStorage.setItem(PHOTO_STORAGE_KEY, JSON.stringify(profilePhoto))
      setMessage('Profile photo uploaded successfully.')
    }
    reader.onerror = () => setMessage('Unable to read that image. Please try another photo.')
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  function selectImage(event) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setMessage('Please select an image file.')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setMessage('Please choose an image smaller than 10 MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setPhoto({
        name: file.name,
        preview: reader.result,
      })
      setMessage('Image ready. Select Analyze soil image to classify it.')
    }
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  async function startCamera(facingMode, target = 'soil') {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage('Camera access requires a supported browser and a secure connection.')
      return
    }

    const requestId = ++cameraRequestRef.current
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop())
    cameraStreamRef.current = null
    setCameraStream(null)
    setCameraOpen(true)
    setCameraLoading(true)
    setCameraTarget(target)
    setMessage('')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })

      if (requestId !== cameraRequestRef.current) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }

      cameraStreamRef.current = stream
      setCameraStream(stream)
    } catch (error) {
      if (requestId === cameraRequestRef.current) {
        setCameraOpen(false)
        setMessage(
          error.name === 'NotAllowedError'
            ? 'Camera permission was denied. Allow camera access in your browser settings and try again.'
            : 'Unable to access the camera. Check that a camera is available and try again.',
        )
      }
    } finally {
      if (requestId === cameraRequestRef.current) {
        setCameraLoading(false)
      }
    }
  }

  function stopCamera() {
    cameraRequestRef.current += 1
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop())
    cameraStreamRef.current = null
    setCameraStream(null)
    setCameraOpen(false)
    setCameraLoading(false)
  }

  function switchCamera() {
    const nextFacingMode =
      cameraFacingMode === 'environment' ? 'user' : 'environment'
    setCameraFacingMode(nextFacingMode)
    startCamera(nextFacingMode, cameraTarget)
  }

  function capturePhoto() {
    const video = videoRef.current
    if (!video?.videoWidth || !video.videoHeight) {
      setMessage('The camera is not ready yet. Please try again.')
      return
    }

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const context = canvas.getContext('2d')
    if (!context) {
      setMessage('Unable to capture the camera image. Please try again.')
      return
    }

    try {
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      const preview = canvas.toDataURL('image/jpeg', 0.9)

      if (cameraTarget === 'profile') {
        const profilePhoto = {
          name: `profile-photo-${Date.now()}.jpg`,
          preview,
        }
        setProfileImage(profilePhoto)
        localStorage.setItem(PHOTO_STORAGE_KEY, JSON.stringify(profilePhoto))
        setMessage('Profile photo captured successfully.')
      } else {
        const name = `soil-capture-${Date.now()}.jpg`
        setPhoto({ name, preview })
        setMessage('Image ready. Select Analyze soil image to classify it.')
      }

      stopCamera()
    } catch (error) {
      console.error('Failed to capture soil image:', error)
      setMessage('Unable to capture the camera image. Please try again.')
    }
  }

  function removeProfileImage() {
    setProfileImage(null)
    localStorage.removeItem(PHOTO_STORAGE_KEY)
    setMessage('Profile photo removed.')
  }

  async function analyzeCombined(event) {
    event.preventDefault()
    const hasImage = Boolean(photo?.preview)
    const hasMeasurements = Object.values(soilInputs).every((value) => value !== '')
    if (!hasImage && !hasMeasurements) {
      setMessage('Upload or capture an image, or enter all soil measurements.')
      return
    }

    setAnalysisLoading(true)
    setImageAnalysisLoading(hasImage)
    setMessage('')
    try {
      const payload = hasMeasurements
        ? Object.fromEntries(Object.entries(soilInputs).map(([name, value]) => [name, Number(value)]))
        : {}
      if (hasImage) payload.image = photo.preview
      const response = await fetch('http://localhost:5000/api/soil-analysis/combined', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Unable to analyze the soil.')
      setAnalysisResult(data.analysis)
      setImageAnalysis(data.prediction ? { prediction: data.prediction, recommendations: data.recommendations } : null)
      if (data.analysis) setHistory((items) => [data.analysis, ...items])
      setMessage('Combined soil analysis completed successfully.')
    } catch (error) {
      setMessage(error.message)
    } finally {
      setImageAnalysisLoading(false)
      setAnalysisLoading(false)
    }
  }

  function downloadAnalysisImage(kind) {
    const isImageResult = Boolean(imageAnalysis)
    const prediction = isImageResult ? imageAnalysis.prediction : analysisResult
    const guidance = isImageResult ? imageAnalysis.recommendations : analysisResult?.guidance
    if (!prediction || !guidance) return

    const canvas = document.createElement('canvas')
    canvas.width = 1200
    canvas.height = kind === 'roadmap' ? 760 : 900
    const context = canvas.getContext('2d')
    context.fillStyle = '#f7f5ec'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = '#35583b'
    context.fillRect(0, 0, canvas.width, 150)
    context.fillStyle = '#ffffff'
    context.font = 'bold 46px Georgia'
    context.fillText('AgriSync Soil Analysis', 70, 90)

    const wrap = (text, x, y, maxWidth, lineHeight = 34) => {
      const words = String(text).split(' ')
      let line = ''
      words.forEach((word) => {
        const testLine = `${line}${word} `
        if (context.measureText(testLine).width > maxWidth && line) {
          context.fillText(line.trim(), x, y)
          line = `${word} `
          y += lineHeight
        } else {
          line = testLine
        }
      })
      context.fillText(line.trim(), x, y)
      return y + lineHeight
    }

    context.fillStyle = '#35583b'
    context.font = 'bold 38px Georgia'
    const title = isImageResult ? prediction.soilType.replaceAll('_', ' ') : prediction.recommendedCrop
    context.fillText(title, 70, 220)
    context.font = '28px Arial'
    context.fillStyle = '#5f594b'
    context.fillText(`Model confidence: ${prediction.confidence}%`, 70, 270)

    if (kind === 'roadmap') {
      context.strokeStyle = '#78966b'
      context.lineWidth = 10
      context.beginPath()
      context.moveTo(180, 430)
      context.lineTo(600, 430)
      context.lineTo(1020, 430)
      context.stroke()
      const nodes = [
        ['1', 'Evidence', isImageResult ? 'Soil image' : 'Nutrients'],
        ['2', 'Model', 'Prediction ready'],
        ['3', 'Action', 'Crop roadmap'],
      ]
      nodes.forEach(([number, label, detail], index) => {
        const x = 180 + index * 420
        context.beginPath()
        context.arc(x, 430, 52, 0, Math.PI * 2)
        context.fillStyle = '#35583b'
        context.fill()
        context.fillStyle = '#ffffff'
        context.font = 'bold 32px Arial'
        context.fillText(number, x - 9, 442)
        context.fillStyle = '#35583b'
        context.font = 'bold 28px Arial'
        context.fillText(label, x - 62, 525)
        context.fillStyle = '#5f594b'
        context.font = '22px Arial'
        context.fillText(detail, x - 72, 565)
      })
      let y = 620
      context.font = 'bold 26px Arial'
      context.fillStyle = '#35583b'
      y = wrap(`Recommended crops: ${guidance.crops.join(', ')}`, 70, y, 1060)
      wrap(`Next step: ${guidance.precautions?.[0] || 'Validate the recommendation locally.'}`, 70, y + 10, 1060)
    } else {
      let y = 330
      context.font = 'bold 25px Arial'
      context.fillStyle = '#35583b'
      context.fillText('Recommendations', 70, y)
      context.font = '24px Arial'
      context.fillStyle = '#5f594b'
      y = wrap(guidance.crops.join(', '), 70, y + 45, 1060)
      context.font = 'bold 25px Arial'
      context.fillStyle = '#35583b'
      context.fillText('Explanation', 70, y + 35)
      context.font = '24px Arial'
      context.fillStyle = '#5f594b'
      y = wrap(guidance.explanation, 70, y + 75, 1060)
      context.font = 'bold 25px Arial'
      context.fillStyle = '#35583b'
      context.fillText('Precautions', 70, y + 35)
      context.font = '24px Arial'
      context.fillStyle = '#5f594b'
      guidance.precautions.forEach((precaution) => {
        y = wrap(`• ${precaution}`, 70, y + 55, 1060)
      })
    }

    const link = document.createElement('a')
    link.download = kind === 'roadmap' ? 'agrisync-soil-roadmap.png' : 'agrisync-soil-report.png'
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  async function deleteHistory(id) {
    try {
      const response = await fetch(`http://localhost:5000/api/soil-analysis/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Unable to delete this analysis.')
      setHistory((items) => items.filter((item) => item.id !== id))
      if (analysisResult?.id === id) setAnalysisResult(null)
    } catch (error) {
      setMessage(error.message)
    }
  }

  function navigateTo(section) {
    if (cameraOpen) stopCamera()
    setActiveSection(section)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const fieldClass =
    'mt-2 w-full rounded-xl border border-[#d9d2c2] bg-white px-4 py-3 text-sm outline-none transition duration-300 focus:border-[#52764a] focus:shadow-[0_0_0_4px_rgba(82,118,74,0.08)]'

  if (loading) {
    return (
      <main aria-busy="true" aria-label="Loading farmer dashboard" className="min-h-screen bg-[#f3f0e7] text-[#352e20]">
        <header className="sticky top-0 z-30 border-b border-[#352e20]/10 bg-[#fffdf7]/95 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
            <div className="flex items-center gap-2 text-2xl font-semibold text-[#35583b]" style={{ fontFamily: "'Caveat', cursive" }}>
              <Sprout size={25} />
              AgriSync
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden animate-pulse items-center gap-3 sm:flex" aria-hidden="true">
                <div className="h-11 w-11 rounded-full bg-[#e7ebdf]" />
                <div className="space-y-2">
                  <div className="h-3 w-24 rounded bg-[#e7ebdf]" />
                  <div className="h-2.5 w-28 rounded bg-[#e7ebdf]" />
                </div>
              </div>
              <div className="h-10 w-24 animate-pulse rounded-full bg-[#e7ebdf]" aria-hidden="true" />
            </div>
          </div>
        </header>

        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 md:grid-cols-[220px_1fr] md:py-9">
          <aside className="h-fit space-y-4 rounded-3xl border border-white bg-[#fffdf7] p-4 shadow-sm" aria-hidden="true">
            <div className="h-3 w-20 animate-pulse rounded bg-[#e7ebdf]" />
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="h-11 animate-pulse rounded-xl bg-[#f0eee5]" />
            ))}
          </aside>

          <div className="min-w-0 space-y-7" aria-hidden="true">
            <section className="space-y-5 rounded-[30px] bg-[#35583b] p-6 shadow-[0_30px_70px_rgba(53,88,59,0.22)] sm:p-9">
              <div className="h-8 w-48 animate-pulse rounded-full bg-white/15" />
              <div className="h-10 w-3/4 animate-pulse rounded bg-white/15 sm:h-14" />
              <div className="h-4 w-full max-w-lg animate-pulse rounded bg-white/15" />
              <div className="h-4 w-2/3 max-w-md animate-pulse rounded bg-white/15" />
              <div className="h-11 w-32 animate-pulse rounded-xl bg-white/15" />
            </section>

            <section className="space-y-6 rounded-3xl border border-white bg-[#fffdf7] p-5 shadow-sm sm:p-7">
              <div className="space-y-3">
                <div className="h-3 w-36 animate-pulse rounded bg-[#e7ebdf]" />
                <div className="h-8 w-56 animate-pulse rounded bg-[#e7ebdf]" />
                <div className="h-4 w-64 animate-pulse rounded bg-[#f0eee5]" />
              </div>
              <div className="flex items-center gap-4 rounded-2xl bg-[#f5f5ed] p-4">
                <div className="h-20 w-20 shrink-0 animate-pulse rounded-full bg-[#e7ebdf]" />
                <div className="space-y-3">
                  <div className="h-4 w-28 animate-pulse rounded bg-[#e7ebdf]" />
                  <div className="h-3 w-40 animate-pulse rounded bg-[#e7ebdf]" />
                </div>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                {[0, 1, 2, 3, 4, 5].map((item) => (
                  <div key={item} className="space-y-2">
                    <div className="h-4 w-24 animate-pulse rounded bg-[#e7ebdf]" />
                    <div className="h-12 animate-pulse rounded-xl bg-[#f0eee5]" />
                  </div>
                ))}
              </div>
              <div className="h-11 w-36 animate-pulse rounded-xl bg-[#e7ebdf]" />
            </section>

            <section className="space-y-6 rounded-3xl border border-white bg-[#fffdf7] p-5 shadow-sm sm:p-7">
              <div className="space-y-3">
                <div className="h-3 w-40 animate-pulse rounded bg-[#e7ebdf]" />
                <div className="h-8 w-56 animate-pulse rounded bg-[#e7ebdf]" />
                <div className="h-4 w-full max-w-xl animate-pulse rounded bg-[#f0eee5]" />
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="min-h-64 animate-pulse rounded-2xl bg-[#f0eee5]" />
                <div className="flex flex-col justify-center gap-3">
                  <div className="h-14 animate-pulse rounded-xl bg-[#e7ebdf]" />
                  <div className="h-14 animate-pulse rounded-xl bg-[#f0eee5]" />
                </div>
              </div>
              <div className="h-20 animate-pulse rounded-2xl bg-[#f0eee5]" />
            </section>

            <section className="space-y-5 rounded-3xl border border-white bg-[#fffdf7] p-5 shadow-sm sm:p-7">
              <div className="h-8 w-52 animate-pulse rounded bg-[#e7ebdf]" />
              <div className="h-24 animate-pulse rounded-2xl bg-[#f0eee5]" />
            </section>
          </div>
        </div>
      </main>
    )
  }

  return (
    <>
      <style>{`
        @keyframes floatCard {
          0% { transform: translateY(12px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }

        @keyframes pulseGlow {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.08); opacity: 1; }
        }

        .dashboard-fade {
          animation: floatCard 0.55s ease-out both;
        }

        .dashboard-glow {
          animation: pulseGlow 4s ease-in-out infinite;
        }

        .dashboard-card {
          transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
        }

        .dashboard-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 18px 40px rgba(53, 88, 59, 0.12);
        }
      `}</style>

      <main className="min-h-screen bg-[#f3f0e7] text-[#352e20]">
      <header className="sticky top-0 z-30 border-b border-[#352e20]/10 bg-[#fffdf7]/95 backdrop-blur-xl transition-all duration-300">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <button type="button" onClick={() => navigateTo('overview')} className="flex items-center gap-2 text-2xl font-semibold text-[#35583b]" style={{ fontFamily: "'Caveat', cursive" }}>
            <Sprout size={25} />
            AgriSync
          </button>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-3 sm:flex">
              <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-[#35583b]/10 bg-[#edf1e6] text-[#35583b] shadow-sm">
                {profileImage ? (
                  <img src={profileImage.preview} alt="Farmer profile" className="h-full w-full object-cover" />
                ) : (
                  <UserRound size={22} />
                )}
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">
                  {profile.name || user?.email || 'Farmer'}
                </p>
                <p className="text-xs text-[#77705e]">Farmer workspace</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-2 rounded-full border border-[#35583b]/20 px-4 py-2.5 text-sm text-[#35583b] transition hover:bg-[#e7ebdf]"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 md:grid-cols-[220px_1fr] md:py-9">
        <aside className="dashboard-card h-fit rounded-3xl border border-white bg-[#fffdf7] p-4 shadow-sm">
          <p className="px-3 pb-3 text-xs font-semibold tracking-widest text-[#91866f]">
            WORKSPACE
          </p>
          <button type="button" onClick={() => navigateTo('overview')} className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${activeSection === 'overview' ? 'bg-[#e7ebdf] font-semibold text-[#35583b]' : 'text-[#6b634f] hover:bg-[#f0eee5]'}`}>
            <LayoutDashboard size={18} />
            Overview
          </button>
          <button type="button" onClick={() => navigateTo('profile')} className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${activeSection === 'profile' ? 'bg-[#e7ebdf] font-semibold text-[#35583b]' : 'text-[#6b634f] hover:bg-[#f0eee5]'}`}>
            <UserRound size={18} />
            Farmer profile
          </button>
          <button type="button" onClick={() => navigateTo('soil')} className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${activeSection === 'soil' ? 'bg-[#e7ebdf] font-semibold text-[#35583b]' : 'text-[#6b634f] hover:bg-[#f0eee5]'}`}>
            <Camera size={18} />
            Soil analysis
          </button>
          <button type="button" onClick={() => navigateTo('history')} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${activeSection === 'history' ? 'bg-[#e7ebdf] font-semibold text-[#35583b]' : 'text-[#6b634f] hover:bg-[#f0eee5]'}`}>
            <History size={18} />
            Analysis history
          </button>
          <button type="button" onClick={() => navigateTo('community')} className={`mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${activeSection === 'community' ? 'bg-[#e7ebdf] font-semibold text-[#35583b]' : 'text-[#6b634f] hover:bg-[#f0eee5]'}`}>
            <Users size={18} />
            Community
          </button>
        </aside>

        <div id="dashboard" className="dashboard-fade min-w-0 space-y-7">
          {activeSection === 'community' && (
            <CommunitySection user={user} profile={profile} profileImage={profileImage} />
          )}

          {activeSection === 'overview' && (
          <section className="relative overflow-hidden rounded-[30px] bg-[#35583b] p-6 text-white shadow-[0_30px_70px_rgba(53,88,59,0.22)] sm:p-9">
            <div className="dashboard-glow absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
            <div className="dashboard-glow absolute bottom-0 left-1/3 h-32 w-32 rounded-full bg-[#84a873]/30 blur-3xl" />
            <div className="relative z-10 max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs">
                <Sprout size={15} />
                YOUR FARM, YOUR INSIGHTS
              </span>
              <h1 className="mt-5 font-serif text-3xl leading-tight sm:text-5xl">
                Welcome, {profile.name?.trim().split(' ')[0] || 'Farmer'}.
              </h1>
              <p className="mt-3 max-w-lg text-sm leading-7 text-white/75">
                Manage your farm profile, capture a soil image, and prepare
                it for AI-powered soil assessment.
              </p>
              <button type="button" onClick={() => navigateTo('soil')} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#fffdf7] px-5 py-3 text-sm font-semibold text-[#35583b] transition duration-300 hover:-translate-y-0.5 hover:bg-white">
                Analyze soil <ScanSearch size={17} />
              </button>
            </div>
            <Sprout className="absolute -bottom-10 -right-5 h-48 w-48 text-white/10 sm:h-64 sm:w-64" />
          </section>
          )}

          {message && (
            <div role="status" className="flex items-start justify-between gap-3 rounded-2xl border border-[#35583b]/15 bg-[#e7ebdf] px-4 py-3 text-sm text-[#35583b] shadow-[0_12px_26px_rgba(53,88,59,0.08)] transition-all duration-300">
              <span>{message}</span>
              <button type="button" onClick={() => setMessage('')} aria-label="Dismiss message" className="rounded-full p-1 transition hover:bg-white/40">
                <X size={16} />
              </button>
            </div>
          )}

          {activeSection === 'profile' && (
          <section id="profile" className="dashboard-card scroll-mt-28 rounded-3xl border border-white bg-[#fffdf7] p-5 shadow-sm sm:p-7">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold tracking-widest text-[#78906a]">YOUR INFORMATION</p>
                <h2 className="mt-2 font-serif text-3xl">Farmer profile</h2>
                <p className="mt-2 text-sm text-[#77705e]">Keep your farm information up to date.</p>
              </div>
              {!editing && (
                <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-2 rounded-xl border border-[#35583b]/20 px-4 py-2.5 text-sm text-[#35583b] transition duration-300 hover:bg-[#e7ebdf]">
                  <Pencil size={15} /> Edit profile
                </button>
              )}
            </div>

            <div className="mb-6 flex flex-col gap-4 rounded-2xl bg-[#f5f5ed] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-[#35583b]/10 bg-[#edf1e6] text-[#35583b] shadow-sm">
                  {cameraOpen && cameraTarget === 'profile' && cameraStream ? (
                    <video ref={videoRef} autoPlay playsInline muted aria-label="Camera preview for profile photo" className="h-full w-full object-cover" />
                  ) : profileImage ? (
                    <img src={profileImage.preview} alt="Farmer profile" className="h-full w-full object-cover" />
                  ) : (
                    <UserRound size={28} />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#35583b]">Profile photo</p>
                  <p className="text-xs text-[#77705e]">{profileImage ? profileImage.name : 'No photo uploaded yet'}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <input ref={profileImageRef} type="file" accept="image/*" onChange={handleProfileImageChange} className="hidden" />
                {cameraOpen && cameraTarget === 'profile' ? (
                  <>
                    <button type="button" onClick={capturePhoto} disabled={!cameraStream} className="inline-flex items-center gap-2 rounded-xl bg-[#35583b] px-4 py-2.5 text-sm font-semibold text-white transition duration-300 hover:bg-[#29452e] disabled:cursor-not-allowed disabled:opacity-60">
                      <Camera size={16} /> Capture photo
                    </button>
                    <button type="button" onClick={switchCamera} disabled={cameraLoading} className="inline-flex items-center gap-2 rounded-xl border border-[#35583b]/20 px-4 py-2.5 text-sm text-[#35583b] transition duration-300 hover:bg-[#e7ebdf] disabled:cursor-not-allowed disabled:opacity-60">
                      <SwitchCamera size={16} /> Switch camera
                    </button>
                    <button type="button" onClick={stopCamera} className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm text-[#8b493e] transition duration-300 hover:bg-[#f5e9e5]">
                      <X size={16} /> Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={() => startCamera('user', 'profile')} className="inline-flex items-center gap-2 rounded-xl bg-[#35583b] px-4 py-2.5 text-sm font-semibold text-white transition duration-300 hover:bg-[#29452e]">
                      <Camera size={16} /> Take profile photo
                    </button>
                    <button type="button" onClick={() => profileImageRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl border border-[#35583b]/20 px-4 py-2.5 text-sm font-semibold text-[#35583b] transition duration-300 hover:bg-[#e7ebdf]">
                      <ImageIcon size={16} /> Choose from gallery
                    </button>
                  </>
                )}
                {profileImage && (
                  <button type="button" onClick={removeProfileImage} className="inline-flex items-center gap-2 rounded-xl border border-[#35583b]/20 px-4 py-2.5 text-sm text-[#35583b] transition duration-300 hover:bg-[#e7ebdf]">
                    <Trash2 size={16} /> Remove
                  </button>
                )}
              </div>
            </div>

            <form onSubmit={saveProfile}>
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="text-sm font-medium">
                  Full name
                  <input className={fieldClass} name="name" value={profile.name} onChange={updateProfile} disabled={!editing} placeholder="Your full name" required />
                </label>
                <label className="text-sm font-medium">
                  Phone number
                  <input className={fieldClass} name="phone" value={profile.phone} onChange={updateProfile} disabled={!editing} placeholder="Your phone number" />
                </label>
                <label className="text-sm font-medium">
                  Farm location
                  <input className={fieldClass} name="location" value={profile.location} onChange={updateProfile} disabled={!editing} placeholder="Village, district, state" />
                </label>
                <label className="text-sm font-medium">
                  Farm size
                  <input className={fieldClass} name="farmSize" value={profile.farmSize} onChange={updateProfile} disabled={!editing} placeholder="e.g. 2 acres" />
                </label>
                <label className="text-sm font-medium">
                  Soil type
                  <select className={fieldClass} name="soilType" value={profile.soilType} onChange={updateProfile} disabled={!editing}>
                    <option>Unknown</option>
                    <option>Black soil</option>
                    <option>Alluvial soil</option>
                    <option>Red soil</option>
                    <option>Laterite soil</option>
                    <option>Sandy soil</option>
                    <option>Clay soil</option>
                    <option>Loamy soil</option>
                  </select>
                </label>
                <label className="text-sm font-medium">
                  Crops grown
                  <input className={fieldClass} name="crops" value={profile.crops} onChange={updateProfile} disabled={!editing} placeholder="e.g. wheat, soybean" />
                </label>
              </div>
              {editing && (
                <button type="submit" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#35583b] px-5 py-3 text-sm font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-[#29452e]">
                  <Save size={16} /> Save profile
                </button>
              )}
            </form>
          </section>
          )}

          {activeSection === 'soil' && (
          <section id="soil-analysis" className="dashboard-card scroll-mt-28 rounded-3xl border border-white bg-[#fffdf7] p-5 shadow-sm sm:p-7">
            <div className="mb-6">
              <p className="text-xs font-semibold tracking-widest text-[#78906a]">IMAGE-BASED ASSESSMENT</p>
              <h2 className="mt-2 font-serif text-3xl">Capture your soil</h2>
              <p className="mt-2 text-sm leading-6 text-[#77705e]">
                Take a photo with your camera or choose an existing soil image.
                For best results, use clear lighting and a close-up of the soil.
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#b6c6a6] bg-[#f5f5ed] p-5 text-center">
                {cameraOpen ? (
                  cameraStream ? (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      aria-label={`${cameraFacingMode === 'environment' ? 'Back' : 'Front'} camera preview`}
                      className="max-h-64 w-full rounded-xl object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center text-[#35583b]">
                      <Camera size={30} />
                      <p className="mt-3 text-sm">{cameraLoading ? 'Opening camera…' : 'Camera preview'}</p>
                    </div>
                  )
                ) : photo ? (
                  <img src={photo.preview} alt="Selected soil sample" className="max-h-64 w-full rounded-xl object-contain" />
                ) : (
                  <>
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e7ebdf] text-[#35583b]">
                      <ImageIcon size={30} />
                    </div>
                    <p className="mt-4 font-semibold">Your soil image</p>
                    <p className="mt-2 text-xs text-[#77705e]">JPG, PNG or other supported image · Max 10 MB</p>
                  </>
                )}
              </div>

              <div className="flex flex-col justify-center gap-3">
                <input ref={fileRef} type="file" accept="image/*" onChange={selectImage} className="hidden" />

                {cameraOpen ? (
                  <>
                    <button type="button" onClick={capturePhoto} disabled={!cameraStream} className="flex items-center justify-center gap-3 rounded-xl bg-[#35583b] px-5 py-4 text-sm font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-[#29452e] disabled:cursor-not-allowed disabled:opacity-60">
                      <Camera size={20} /> Capture photo
                    </button>
                    <button type="button" onClick={switchCamera} disabled={cameraLoading} className="flex items-center justify-center gap-3 rounded-xl border border-[#35583b]/20 px-5 py-4 text-sm font-semibold text-[#35583b] transition duration-300 hover:-translate-y-0.5 hover:bg-[#e7ebdf] disabled:cursor-not-allowed disabled:opacity-60">
                      <SwitchCamera size={20} /> Switch to {cameraFacingMode === 'environment' ? 'front' : 'back'} camera
                    </button>
                    <button type="button" onClick={stopCamera} className="rounded-xl px-5 py-3 text-sm text-[#8b493e] transition duration-300 hover:bg-[#f5e9e5]">
                      Cancel camera
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={() => startCamera(cameraFacingMode)} className="flex items-center justify-center gap-3 rounded-xl bg-[#35583b] px-5 py-4 text-sm font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-[#29452e]">
                    <Camera size={20} /> Take a soil photo
                  </button>
                )}
                <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center justify-center gap-3 rounded-xl border border-[#35583b]/20 px-5 py-4 text-sm font-semibold text-[#35583b] transition duration-300 hover:-translate-y-0.5 hover:bg-[#e7ebdf]">
                  <Upload size={20} /> Upload from device
                </button>

                {photo && (
                  <>
                    <p className="break-all text-xs text-[#77705e]">Selected: {photo.name}</p>
                    <button type="button" onClick={() => setPhoto(null)} className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm text-[#8b493e] transition duration-300 hover:bg-[#f5e9e5]">
                      <Trash2 size={15} /> Remove image
                    </button>
                  </>
                )}
              </div>
            </div>

            <form onSubmit={analyzeCombined} className="mt-7 rounded-2xl border border-[#d9d2c2] bg-[#f5f5ed] p-5">
              <div className="mb-4">
                <p className="text-sm font-semibold text-[#35583b]">Nutrient-based analysis</p>
                <p className="mt-1 text-xs leading-5 text-[#77705e]">
                  Enter a soil-test report to get a crop recommendation from the trained crop dataset.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ['nitrogen', 'Nitrogen (N)', '0-200', 0, 200],
                  ['phosphorus', 'Phosphorus (P)', '0-200', 0, 200],
                  ['potassium', 'Potassium (K)', '0-250', 0, 250],
                  ['temperature', 'Temperature (°C)', '-30-70', -30, 70],
                  ['humidity', 'Humidity (%)', '0-100', 0, 100],
                  ['ph', 'Soil pH', '0-14', 0, 14],
                  ['rainfall', 'Rainfall (mm)', '0-5000', 0, 5000],
                ].map(([name, label, placeholder, minimum, maximum]) => (
                  <label key={name} className="text-xs font-semibold text-[#5f594b]">
                    {label}
                    <input
                      type="number"
                      step="any"
                      min={minimum}
                      max={maximum}
                      value={soilInputs[name]}
                      onChange={(event) => setSoilInputs({ ...soilInputs, [name]: event.target.value })}
                      placeholder={placeholder}
                      className={fieldClass}
                    />
                  </label>
                ))}
              </div>
              <button type="submit" disabled={analysisLoading || imageAnalysisLoading} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#35583b] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#29452e] disabled:cursor-wait disabled:opacity-60">
                <ScanSearch size={17} /> {analysisLoading ? 'Analyzing soil…' : 'Analyze soil'}
              </button>
            </form>

            {(analysisResult || imageAnalysis) && (() => {
              const isImageResult = Boolean(imageAnalysis)
              const result = isImageResult ? imageAnalysis.prediction : analysisResult
              const guidance = isImageResult ? imageAnalysis.recommendations : analysisResult.guidance
              const title = isImageResult
                ? result.soilType.replaceAll('_', ' ')
                : result.recommendedCrop

              return (
              <div className="mt-5 overflow-hidden rounded-3xl border border-[#b6c6a6] bg-[#e7ebdf] p-5 sm:p-6">
                <p className="text-xs font-semibold tracking-widest text-[#52764a]">SOIL INTELLIGENCE RESULT</p>
                <p className="mt-2 text-sm text-[#5f594b]">
                  Your soil journey, from evidence to an actionable crop decision.
                </p>
                <div className="relative my-6 grid gap-4 md:grid-cols-3">
                  <div className="soil-roadmap-line absolute left-[16%] right-[16%] top-8 hidden h-1 rounded-full md:block" />
                  {[
                    [isImageResult ? 'Soil captured' : 'Soil report', isImageResult ? 'Image evidence received' : 'Measurements received', '◉'],
                    ['Models fused', isImageResult && analysisResult ? 'Image + nutrient intelligence' : 'Trained model analysis', '✦'],
                    ['Action plan', `${guidance?.crops?.length || 0} crop options prepared`, '↗'],
                  ].map(([label, detail, icon], index) => (
                    <div
                      key={label}
                      className="soil-roadmap-node relative z-10 flex items-center gap-3 rounded-2xl border border-white/80 bg-[#fffdf7]/80 p-3 shadow-sm"
                      style={{ animationDelay: `${index * 140}ms` }}
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#35583b] text-lg font-bold text-white">{icon}</span>
                      <span>
                        <span className="block text-sm font-bold text-[#35583b]">{label}</span>
                        <span className="mt-0.5 block text-xs text-[#77705e]">{detail}</span>
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#78906a]">
                      {isImageResult ? 'Image soil classifier' : 'Nutrient crop model'}
                    </p>
                    <h3 className="font-serif text-3xl capitalize text-[#35583b]">{title}</h3>
                    <p className="mt-1 text-sm text-[#5f594b]">Model confidence: {result.confidence}%</p>
                    <div className="mt-3 h-2 max-w-xs overflow-hidden rounded-full bg-white/70">
                      <div
                        className="soil-confidence-fill h-full rounded-full bg-[#52764a]"
                        style={{ width: `${Math.min(100, Math.max(0, Number(result.confidence) || 0))}%` }}
                      />
                    </div>
                    {isImageResult && analysisResult && (
                      <p className="mt-1 text-sm text-[#5f594b]">
                        Nutrient model recommendation: <span className="font-semibold capitalize">{analysisResult.recommendedCrop}</span> ({analysisResult.confidence}%)
                      </p>
                    )}
                    <p className="mt-4 text-sm leading-6 text-[#5f594b]">{guidance?.explanation}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => downloadAnalysisImage('roadmap')} className="inline-flex items-center gap-2 rounded-xl border border-[#9daf91] bg-white px-3 py-2 text-xs font-semibold text-[#35583b]">
                      <Download size={15} /> Roadmap image
                    </button>
                    <button type="button" onClick={() => downloadAnalysisImage('report')} className="inline-flex items-center gap-2 rounded-xl border border-[#9daf91] bg-white px-3 py-2 text-xs font-semibold text-[#35583b]">
                      <Download size={15} /> Download report
                    </button>
                  </div>
                </div>
                {isImageResult && result.topPredictions?.length > 0 && (
                  <div className="mt-5 rounded-2xl border border-white/80 bg-[#fffdf7]/70 p-4">
                    <p className="text-sm font-semibold text-[#35583b]">Model signal map</p>
                    <div className="mt-3 space-y-3">
                      {result.topPredictions.map((prediction) => (
                        <div key={prediction.soilType}>
                          <div className="mb-1 flex justify-between text-xs text-[#5f594b]">
                            <span>{prediction.soilType.replaceAll('_', ' ')}</span>
                            <span>{prediction.confidence}%</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-[#dfe6d8]">
                            <div
                              className="soil-confidence-fill h-full rounded-full bg-[#78966b]"
                              style={{ width: `${Math.min(100, Math.max(0, Number(prediction.confidence) || 0))}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <p className="mt-4 text-sm font-semibold text-[#35583b]">Recommended crops</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {guidance?.crops?.map((crop) => (
                    <span key={crop} className="rounded-full bg-white px-3 py-1.5 text-sm text-[#35583b]">{crop}</span>
                  ))}
                </div>
                <p className="mt-4 text-sm font-semibold text-[#35583b]">Precautions</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-6 text-[#5f594b]">
                  {guidance?.precautions?.map((precaution) => <li key={precaution}>{precaution}</li>)}
                </ul>
              </div>
              )
            })()}

            <div className="mt-6 flex items-start gap-3 rounded-2xl bg-[#f0eee5] p-4">
              <ScanSearch size={20} className="mt-0.5 shrink-0 text-[#52764a]" />
              <div>
                <p className="text-sm font-semibold">Image analysis</p>
                <p className="mt-1 text-sm leading-6 text-[#77705e]">
                  The trained soil classifier identifies one of seven soil types. Groq then uses that prediction to suggest suitable crops and practical precautions.
                </p>
              </div>
            </div>
          </section>
          )}

          {activeSection === 'history' && (
          <section id="history" className="dashboard-card scroll-mt-28 rounded-3xl border border-white bg-[#fffdf7] p-5 shadow-sm sm:p-7">
            <div className="mb-5 flex items-center gap-3">
              <History className="text-[#52764a]" size={22} />
              <div>
                <h2 className="font-serif text-2xl">Analysis history</h2>
                <p className="mt-1 text-sm text-[#77705e]">Your saved nutrient analyses.</p>
              </div>
            </div>

            {history.length === 0 ? (
              <div className="rounded-2xl bg-[#f5f5ed] p-7 text-center">
                <Leaf className="mx-auto text-[#78966b]" size={28} />
                <p className="mt-3 text-sm text-[#77705e]">No images saved yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((item) => (
                  <article key={item.id} className="dashboard-card flex flex-wrap items-center gap-4 rounded-2xl border border-[#352e20]/10 bg-[#faf7f0] p-3">
                    <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-[#e7ebdf] text-[#52764a]">
                      <Leaf size={25} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold capitalize">{item.recommendedCrop || item.name}</p>
                      <p className="mt-1 text-xs text-[#77705e]">{item.createdAt ? new Date(item.createdAt).toLocaleString() : item.date}</p>
                      <p className="mt-1 text-xs text-[#8a7044]">{item.confidence ? `${item.confidence}% match confidence` : item.status}</p>
                    </div>
                    <button type="button" onClick={() => deleteHistory(item.id)} className="rounded-lg p-2 text-[#8b493e] transition duration-300 hover:bg-[#f5e9e5]" aria-label="Delete history item">
                      <Trash2 size={17} />
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>
          )}

        </div>
      </div>
    </main>
    </>
  )
}
