
import { useLayoutEffect, useRef } from 'react'
import { gsap } from 'gsap'
import {
  ScanSearch,
  FlaskConical,
  Sprout,
  ArrowUpRight,
  CheckCircle2,
} from 'lucide-react'

const technologies = [
  {
    number: '01',
    icon: ScanSearch,
    title: 'Image-Based Analysis',
    description:
      'Analyze soil images using computer vision to support soil assessment.',
    tag: 'Computer Vision',
    image: '/images/soil-analysis.jpg',
    alt: 'Soil being examined with an agricultural scanner',
  },
  {
    number: '02',
    icon: FlaskConical,
    title: 'Nutrient Assessment',
    description:
      'Use soil information and available nutrient data to build a clearer soil profile.',
    tag: 'Data Intelligence',
    image: '/images/nutrient-testing.jpg',
    alt: 'Soil sample undergoing laboratory testing',
  },
  {
    number: '03',
    icon: Sprout,
    title: 'Intelligent Crop Advisory',
    description:
      'Combine soil analysis results to help identify potentially suitable crops.',
    tag: 'Decision Support',
    image: '/images/crop-field.jpg',
    alt: 'Healthy crops growing in a cultivated field',
  },
]

export default function TechnologySection() {
  const sectionRef = useRef(null)

  useLayoutEffect(() => {
    const section = sectionRef.current

    if (!section) return

    const ctx = gsap.context(() => {
      const heading = section.querySelector('.technology-heading')
      const cards = section.querySelectorAll('.technology-card')

      gsap.set([heading, ...cards], {
        opacity: 1,
        y: 0,
      })

      gsap.from(heading, {
        y: 25,
        duration: 0.7,
        ease: 'power2.out',
        clearProps: 'transform',
      })

      gsap.from(cards, {
        y: 25,
        duration: 0.6,
        stagger: 0.12,
        ease: 'power2.out',
        clearProps: 'transform',
      })
    }, section)

    return () => ctx.revert()
  }, [])

  return (
    <section
      id="technology"
      ref={sectionRef}
      className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24"
    >
      <div className="technology-heading mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <span className="inline-flex rounded-full bg-[#dcd4c2] px-4 py-2 text-xs font-semibold tracking-[0.16em] text-[#35583b]">
            THE TECHNOLOGY
          </span>

          <h2 className="mt-5 max-w-2xl font-serif text-4xl leading-tight tracking-tight sm:text-5xl md:text-6xl">
            Intelligence beneath
            <span className="block italic text-[#52764a]">
              every harvest.
            </span>
          </h2>
        </div>

        <p className="max-w-md text-sm leading-7 text-[#6b634f] md:text-base">
          From soil observations to actionable insights, AgriSync brings
          image analysis and agricultural data into one connected workflow.
        </p>
      </div>

      <div className="technology-grid grid grid-cols-1 gap-5 md:grid-cols-3">
        {technologies.map((item) => {
          const Icon = item.icon

          return (
            <article
              key={item.number}
              className="technology-card group relative flex flex-col overflow-hidden rounded-[28px] border border-white/80 bg-[#fffdf7] p-6 shadow-[0_12px_40px_rgba(65,72,45,0.06)] transition duration-300 hover:-translate-y-2 hover:shadow-[0_22px_55px_rgba(65,72,45,0.13)] sm:p-8"
            >
              <div className="flex items-center justify-between">
                <span className="font-serif text-sm text-[#91866f]">
                  {item.number} / 03
                </span>

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e7ebdf] text-[#35583b] transition duration-300 group-hover:rotate-6 group-hover:scale-110">
                  <Icon size={23} strokeWidth={1.7} />
                </div>
              </div>

              <div className="my-8 h-28 shrink-0 overflow-hidden rounded-2xl bg-[#e7ebdf]">
                <img
                  src={item.image}
                  alt={item.alt}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  onError={(event) => {
                    event.currentTarget.style.display = 'none'
                  }}
                />
              </div>

              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#f0eee5] px-3 py-1.5 text-xs text-[#52764a]">
                <CheckCircle2 size={13} />
                {item.tag}
              </span>

              <h3 className="mt-4 font-serif text-2xl text-[#352e20]">
                {item.title}
              </h3>

              <p className="mt-3 min-h-[84px] text-sm leading-7 text-[#6b634f]">
                {item.description}
              </p>

              <div className="mt-auto flex items-center justify-between border-t border-[#352e20]/10 pt-4 text-sm text-[#35583b]">
                <span>Explore the process</span>
                <ArrowUpRight
                  size={18}
                  className="transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1"
                />
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
