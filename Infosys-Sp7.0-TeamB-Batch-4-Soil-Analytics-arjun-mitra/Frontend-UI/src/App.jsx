
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import {
  ArrowUpRight,
  Sprout,
  ScanSearch,
  FlaskConical,
  ChartNoAxesCombined,
  CheckCircle2,
  Menu,
  X,
} from 'lucide-react'

import Testimonials from './components/Testimonials'
import FeedbackSection from './components/FeedbackSection'
import FAQSection from './components/FAQSection'
import AuthModal from './components/AuthModal'
import TechnologySection from './components/TechnologySection'
import FarmerDashboard from '../pages/FarmerDashboard.jsx'

const analytics = [
  {
    label: 'Nitrogen (N)',
    value: 'Sample',
    description: 'Supports healthy vegetative growth.',
    width: '76%',
  },
  {
    label: 'Phosphorus (P)',
    value: 'Sample',
    description: 'Supports root development.',
    width: '58%',
  },
  {
    label: 'Potassium (K)',
    value: 'Sample',
    description: 'Supports overall crop health.',
    width: '68%',
  },
]

const navLinks = [
  { label: 'Solutions', id: 'solutions' },
  { label: 'Technology', id: 'technology' },
  { label: 'Analytics', id: 'analytics' },
]

const farmerImages = [
  '/images/farmer/farmer-01.png',
  '/images/farmer/farmer-02.png',
  '/images/farmer/farmer-03.png',
  '/images/farmer/farmer-04.png',
  '/images/farmer/farmer-05.png',
]

const farmerPositions = [
  { x: 0, y: 0, scale: 1 },
  { x: 30, y: 0, scale: 1 },
  { x: 0, y: 0, scale: 1 },
  { x: 0, y: 0, scale: 1 },
  { x: 0, y: 0, scale: 1 },
]

function App() {
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [imageIndex, setImageIndex] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('solutions')
  const [isScrolled, setIsScrolled] = useState(false)

  const farmerRef = useRef(null)
  const navRef = useRef(null)

  useLayoutEffect(() => {
    const nav = navRef.current
    if (!nav) return

    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.brand-sprout',
        { scale: 0.5, rotation: -25, opacity: 0 },
        {
          scale: 1,
          rotation: 0,
          opacity: 1,
          duration: 0.7,
          ease: 'back.out(1.7)',
        },
      )

      gsap.fromTo(
        '.brand-name',
        { x: -10, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.6,
          delay: 0.12,
          ease: 'power3.out',
        },
      )

      gsap.fromTo(
        '.brand-underline',
        { scaleX: 0 },
        {
          scaleX: 1,
          duration: 0.6,
          delay: 0.4,
          ease: 'power2.out',
        },
      )

      gsap.fromTo(
        '.nav-link',
        { y: -8, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.45,
          stagger: 0.1,
          delay: 0.2,
          ease: 'power2.out',
        },
      )

      gsap.fromTo(
        '.nav-action',
        { y: -6, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.45,
          stagger: 0.08,
          delay: 0.3,
          ease: 'power2.out',
        },
      )
    }, nav)

    return () => ctx.revert()
  }, [])

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.to('.orbit-track', {
        rotation: 360,
        duration: 18,
        repeat: -1,
        ease: 'none',
        transformOrigin: '50% 50%',
      })

      gsap.to('.orbit-card', {
        rotation: -360,
        duration: 18,
        repeat: -1,
        ease: 'none',
        transformOrigin: '50% 50%',
      })
    })

    return () => ctx.revert()
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setImageIndex((current) => (current + 1) % farmerImages.length)
    }, 2800)

    return () => window.clearInterval(timer)
  }, [])

  useLayoutEffect(() => {
    if (!farmerRef.current) return

    gsap.fromTo(
      farmerRef.current,
      { opacity: 0.3 },
      {
        opacity: 1,
        duration: 0.55,
        ease: 'power2.out',
        clearProps: 'opacity',
      },
    )
  }, [imageIndex])

  useEffect(() => {
    let ticking = false

    const updateNavigation = () => {
      setIsScrolled(window.scrollY > 12)

      const sections = ['home', 'solutions', 'technology', 'analytics']
      let current = 'home'

      for (const id of sections) {
        const section = document.getElementById(id)

        if (section && section.getBoundingClientRect().top <= 180) {
          current = id
        }
      }

      if (current !== 'home') {
        setActiveSection(current)
      }

      ticking = false
    }

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateNavigation)
        ticking = true
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll)
    updateNavigation()

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
    }
  }, [])

  useEffect(() => {
    document.body.style.overflow = isAuthOpen ? 'hidden' : ''

    return () => {
      document.body.style.overflow = ''
    }
  }, [isAuthOpen])

  function handleAuthSuccess(user) {
    if (!user) return

    setCurrentUser(user)
    setIsAuthOpen(false)
    setMobileMenuOpen(false)
  }

  async function handleLogout() {
    try {
      await fetch('http://localhost:5000/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } catch (error) {
      console.error('Logout request failed:', error)
    } finally {
      setCurrentUser(null)
      setIsAuthOpen(false)
      setMobileMenuOpen(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  function closeMobileMenu() {
    setMobileMenuOpen(false)
  }

  function openAuth() {
    closeMobileMenu()
    setIsAuthOpen(true)
  }

  // Show the dashboard after successful authentication.
  if (currentUser) {
    return (
      <FarmerDashboard
        user={currentUser}
        onLogout={handleLogout}
      />
    )
  }

  return (
    <main className="min-h-screen bg-[#eae3d4] px-4 py-3 text-[#352e20] sm:px-5 md:px-8 lg:px-10">
      <nav
        ref={navRef}
        className={`sticky top-0 z-50 mx-auto w-full max-w-7xl border-b border-[#352e20]/15 transition-[background-color,box-shadow,border-radius] duration-300 ${
          isScrolled
            ? 'rounded-b-2xl bg-[#eae3d4]/95 shadow-lg backdrop-blur-xl'
            : 'bg-[#eae3d4]'
        }`}
      >
        <div className="grid min-h-[66px] grid-cols-[1fr_auto] items-center gap-x-3 px-1 py-3 sm:px-3 lg:grid-cols-[1fr_auto_1fr] lg:gap-5">
          <a
            href="#home"
            onClick={closeMobileMenu}
            className="brand-logo group relative flex w-fit shrink-0 items-center gap-2 text-3xl font-semibold text-[#35583b]"
            style={{ fontFamily: "'Caveat', cursive" }}
            aria-label="AgriSync home"
          >
            <Sprout className="brand-sprout" size={25} strokeWidth={1.8} />

            <span className="relative">
              <span className="brand-name inline-block">AgriSync</span>
              <span className="brand-underline absolute -bottom-1 left-0 h-[2px] w-full origin-left rounded-full bg-[#8ca77b]" />
            </span>
          </a>

          <div className="hidden items-center justify-center gap-5 text-sm lg:flex xl:gap-7">
            {navLinks.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                onClick={closeMobileMenu}
                className={`nav-link relative whitespace-nowrap py-2 transition-colors duration-200 ${
                  activeSection === link.id
                    ? 'font-semibold text-[#35583b]'
                    : 'text-[#6b634f] hover:text-[#52764a]'
                }`}
              >
                {link.label}
                <span
                  className={`absolute bottom-0 left-0 h-[2px] w-full origin-left rounded-full bg-[#78966b] transition-transform duration-300 ease-out ${
                    activeSection === link.id ? 'scale-x-100' : 'scale-x-0'
                  }`}
                />
              </a>
            ))}
          </div>

          <div className="hidden items-center justify-end gap-2 lg:flex xl:gap-3">
            <button
              type="button"
              onClick={openAuth}
              className="nav-action whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-medium text-[#35583b] transition duration-200 hover:bg-[#dcd4c2]"
            >
              Log In
            </button>

            <button
              type="button"
              onClick={openAuth}
              className="nav-action inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-[#35583b] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition duration-300 hover:-translate-y-0.5 hover:bg-[#29452e] hover:shadow-md"
            >
              Sign Up
              <ArrowUpRight size={16} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="flex h-10 w-10 items-center justify-center justify-self-end rounded-xl border border-[#35583b]/20 text-[#35583b] transition hover:bg-[#dcd4c2] lg:hidden"
            aria-label={mobileMenuOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <div
          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out lg:hidden ${
            mobileMenuOpen
              ? 'grid-rows-[1fr] opacity-100'
              : 'grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="overflow-hidden">
            <div className="flex flex-col gap-1 border-t border-[#352e20]/10 px-4 py-3">
              {navLinks.map((link) => (
                <a
                  key={link.id}
                  href={`#${link.id}`}
                  onClick={closeMobileMenu}
                  className={`rounded-xl px-4 py-3 text-sm transition-colors ${
                    activeSection === link.id
                      ? 'bg-[#e7ebdf] font-semibold text-[#35583b]'
                      : 'text-[#6b634f] hover:bg-[#e7ebdf]/70'
                  }`}
                >
                  {link.label}
                </a>
              ))}

              <div className="mt-2 flex gap-2 border-t border-[#352e20]/10 pt-3">
                <button
                  type="button"
                  onClick={openAuth}
                  className="flex-1 rounded-full border border-[#35583b]/25 px-4 py-3 text-sm font-medium text-[#35583b]"
                >
                  Log In
                </button>

                <button
                  type="button"
                  onClick={openAuth}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#35583b] px-4 py-3 text-sm font-semibold text-white"
                >
                  Sign Up
                  <ArrowUpRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <section
        id="home"
        className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-5 py-5 md:grid-cols-2 md:gap-6 md:py-6"
      >
        <div className="flex flex-col items-start text-left">
          <span className="rounded-full bg-[#dcd4c2] px-4 py-2 text-xs tracking-wide text-[#35583b]">
            INTELLIGENT AGRICULTURE
          </span>

          <h1 className="mt-5 max-w-xl text-left font-serif text-4xl leading-[1.08] tracking-[-0.045em] sm:text-5xl md:text-6xl lg:text-7xl">
            <span className="hero-title-line hero-title-line--first">
              Precision Farming
            </span>
            <span className="hero-title-line hero-title-line--second">
              and Soil
            </span>
            <span className="hero-title-line hero-title-line--third italic text-[#52764a]">
              Health Monitoring
            </span>
          </h1>

          <p className="mt-4 max-w-lg text-left text-sm leading-7 text-[#6b634f] md:text-base">
            Understand your soil. Discover its potential. Make smarter crop
            decisions with AI-powered nutrient assessment and intelligent
            agricultural insights.
          </p>

          <div className="mt-6 flex flex-wrap justify-start gap-3">
            <button
              type="button"
              onClick={openAuth}
              className="rounded-xl bg-[#35583b] px-6 py-3.5 text-sm text-white transition hover:-translate-y-1 hover:bg-[#29452e]"
            >
              Analyze Your Soil ↗
            </button>

            <a
              href="#technology"
              className="rounded-xl border border-[#352e20]/20 px-6 py-3.5 text-sm transition hover:bg-[#ded6c5]"
            >
              Explore Technology
            </a>
          </div>

          <div className="mt-6 flex items-center gap-3 text-sm text-[#6b634f]">
            <Sprout size={22} className="text-[#52764a]" />
            <span>Grow with better insights</span>
          </div>
        </div>

        <div className="relative mx-auto flex min-h-[350px] w-full max-w-[590px] items-center justify-center sm:min-h-[410px] md:min-h-[490px]">
          <div className="absolute left-1/2 top-1/2 h-[76%] w-[76%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#e2e7d6]" />
          <div className="absolute left-1/2 top-1/2 h-[66%] w-[66%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#b6c6a6]/60" />

          <img
            key={imageIndex}
            ref={farmerRef}
            src={farmerImages[imageIndex]}
            alt="Farmer illustration"
            onError={(event) => {
              event.currentTarget.style.visibility = 'hidden'
            }}
            style={{
              left: `calc(50% + ${farmerPositions[imageIndex].x}px)`,
              top: `calc(50% + ${farmerPositions[imageIndex].y}px)`,
              transform: `translate(-50%, -50%) scale(${farmerPositions[imageIndex].scale})`,
            }}
            className="absolute z-10 h-[90%] w-[90%] object-contain object-center"
          />

          <div className="orbit-track absolute inset-[8%] z-20">
            <div className="absolute left-1/2 top-0 -translate-x-1/2">
              <div className="orbit-card rounded-2xl border border-white/80 bg-[#fffdf7]/95 px-5 py-3 shadow-lg backdrop-blur-md">
                <p className="text-xs text-[#77705e]">Soil intelligence</p>
                <p className="mt-1 whitespace-nowrap font-semibold text-[#35583b]">
                  Healthy growth
                </p>
              </div>
            </div>

            <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
              <div className="orbit-card rounded-2xl border border-white/80 bg-[#fffdf7]/95 px-5 py-3 shadow-lg backdrop-blur-md">
                <p className="text-xs text-[#77705e]">Smart advisory</p>
                <p className="mt-1 whitespace-nowrap font-semibold text-[#35583b]">
                  Grow smarter
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="solutions"
        className="mx-auto max-w-7xl scroll-mt-28 pt-4 pb-8 md:pt-6 md:pb-12"
      >
        <div className="grid overflow-hidden rounded-[32px] border border-white/70 bg-[#fffdf7] shadow-[0_20px_70px_rgba(65,72,45,0.09)] md:grid-cols-2">
          <div className="flex flex-col p-4 sm:p-6 md:p-8">
            <div className="relative overflow-hidden rounded-[24px] bg-[#e2e7d6]">
              <video
                className="aspect-[4/5] w-full scale-[1.08] object-cover object-center"
                autoPlay
                muted
                loop
                playsInline
                controls
                preload="metadata"
                poster="/images/farmer/farmer-01.png"
              >
                <source src="/videos/farmer-story.mp4" type="video/mp4" />
                Your browser does not support this video.
              </video>

              <div className="absolute left-4 top-4 rounded-full border border-white/60 bg-[#fffdf7]/90 px-3 py-2 text-xs font-medium text-[#35583b] shadow-sm backdrop-blur-md">
                <Sprout size={14} className="mr-1 inline" />
                Farming, reimagined
              </div>
            </div>

            <div className="px-2 pb-2 pt-5">
              <p className="text-xs font-semibold tracking-[0.18em] text-[#78906a]">
                THE CHALLENGE · THE SOLUTION · THE CHANGE
              </p>

              <h3 className="mt-3 font-serif text-2xl leading-snug text-[#352e20]">
                Every field has a story.
                <span className="italic text-[#52764a]">
                  {" "}Let's make it a better one.
                </span>
              </h3>

              <p className="mt-3 text-sm leading-7 text-[#6b634f]">
                Discover how understanding soil can help farmers make more
                informed agricultural decisions.
              </p>
            </div>
          </div>

          <div className="flex flex-col justify-center px-6 pb-8 pt-4 sm:px-10 md:px-12 md:py-12">
            <span className="w-fit rounded-full bg-[#e7ebdf] px-4 py-2 text-xs font-medium tracking-widest text-[#35583b]">
              THE AGRISYNC STORY
            </span>

            <h2 className="mt-5 font-serif text-4xl leading-[1.12] tracking-tight text-[#352e20] sm:text-5xl">
              Better soil.
              <br />
              Smarter decisions.
              <br />
              <span className="italic text-[#52764a]">
                A brighter future.
              </span>
            </h2>

            <p className="mt-4 text-sm leading-7 text-[#6b634f] md:text-base">
              Soil health influences crop growth, but understanding nutrient
              requirements and crop suitability can be challenging. AgriSync
              brings AI-assisted soil analysis and intelligent crop advisory
              into one accessible experience.
            </p>

            <div className="mt-6 space-y-5">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#e7ebdf] font-serif text-lg text-[#35583b]">
                  01
                </div>
                <div>
                  <h3 className="font-semibold text-[#352e20]">
                    The challenge
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-[#6b634f]">
                    Uncertainty about soil nutrients, soil health, and suitable
                    crop choices.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#e7ebdf] font-serif text-lg text-[#35583b]">
                  02
                </div>
                <div>
                  <h3 className="font-semibold text-[#352e20]">
                    What AgriSync does
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-[#6b634f]">
                    Uses soil images and submitted information to support
                    nutrient assessment and intelligent crop advisory.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#e7ebdf] font-serif text-lg text-[#35583b]">
                  03
                </div>
                <div>
                  <h3 className="font-semibold text-[#352e20]">
                    The outcome
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-[#6b634f]">
                    Clearer insights that help farmers make more informed
                    decisions about soil and crops.
                  </p>
                </div>
              </div>
            </div>

            <a
              href="#technology"
              className="mt-7 inline-flex w-fit items-center gap-2 rounded-xl bg-[#35583b] px-6 py-3.5 text-sm font-medium text-white transition duration-300 hover:-translate-y-1 hover:bg-[#29452e]"
            >
              Discover How It Works
              <ArrowUpRight size={17} />
            </a>
          </div>
        </div>
      </section>

      <TechnologySection />

      <section
        id="analytics"
        className="mx-auto max-w-7xl scroll-mt-28 py-16 sm:py-20 md:py-24"
      >
        <div className="grid gap-10 md:grid-cols-[0.9fr_1.1fr] md:items-center md:gap-14">
          <div>
            <span className="inline-flex rounded-full bg-[#dcd4c2] px-4 py-2 text-xs font-semibold tracking-[0.16em] text-[#35583b]">
              SOIL INSIGHTS
            </span>

            <h2 className="mt-5 font-serif text-4xl leading-tight tracking-tight sm:text-5xl md:text-6xl">
              Make data
              <span className="block italic text-[#52764a]">
                work for your land.
              </span>
            </h2>

            <p className="mt-5 max-w-lg text-sm leading-7 text-[#6b634f] md:text-base">
              AgriSync is designed to bring soil observations, nutrient
              information, and crop guidance together in one clear view.
              Actual measurements will appear here when the analysis pipeline
              is connected.
            </p>

            <div className="mt-7 flex items-start gap-3 rounded-2xl border border-[#35583b]/10 bg-[#fffdf7]/70 p-4">
              <CheckCircle2
                size={21}
                className="mt-0.5 shrink-0 text-[#52764a]"
              />
              <p className="text-sm leading-6 text-[#6b634f]">
                This preview uses illustrative graphics, not real soil
                measurements or model predictions.
              </p>
            </div>
          </div>

          <div className="rounded-[30px] border border-white/80 bg-[#fffdf7] p-5 shadow-[0_20px_70px_rgba(65,72,45,0.09)] sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#352e20]/10 pb-5">
              <div>
                <p className="text-sm text-[#77705e]">Analytics preview</p>
                <h3 className="mt-1 font-serif text-2xl text-[#352e20]">
                  Soil nutrient profile
                </h3>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e7ebdf] text-[#35583b]">
                <ChartNoAxesCombined size={24} />
              </div>
            </div>

            <div className="mt-6 space-y-6">
              {analytics.map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-[#352e20]">
                      {item.label}
                    </span>

                    <span className="rounded-full bg-[#f0eee5] px-3 py-1 text-xs text-[#6b634f]">
                      {item.value}
                    </span>
                  </div>

                  <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#e7e5d9]">
                    <div
                      className="h-full rounded-full bg-[#78966b] transition-all duration-1000"
                      style={{ width: item.width }}
                    />
                  </div>

                  <p className="mt-2 text-xs leading-5 text-[#77705e]">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-7 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-[#e7ebdf] p-4">
                <ScanSearch size={21} className="text-[#35583b]" />
                <p className="mt-3 text-sm font-semibold text-[#35583b]">
                  Image analysis
                </p>
                <p className="mt-1 text-xs leading-5 text-[#6b634f]">
                  Planned model integration
                </p>
              </div>

              <div className="rounded-2xl bg-[#f0eee5] p-4">
                <FlaskConical size={21} className="text-[#8a7044]" />
                <p className="mt-3 text-sm font-semibold text-[#352e20]">
                  Nutrient data
                </p>
                <p className="mt-1 text-xs leading-5 text-[#6b634f]">
                  Awaiting analysis results
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2 border-t border-[#352e20]/10 pt-5 text-xs text-[#77705e]">
              <Sprout size={16} className="text-[#52764a]" />
              Sample visualization · Not for agricultural decisions
            </div>
          </div>
        </div>
      </section>

      <Testimonials />

      <FeedbackSection />

      <FAQSection />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={handleAuthSuccess}
      />
    </main>
  )
}

export default App
