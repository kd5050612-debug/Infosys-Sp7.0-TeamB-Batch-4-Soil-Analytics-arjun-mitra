import { useState } from 'react'
import { ChevronDown, CircleHelp, Sprout } from 'lucide-react'

const questions = [
  {
    question: 'What can I do with AgriSync?',
    answer:
      'AgriSync brings your farm profile, soil sample preparation, analysis history, and farmer community together in one workspace.',
  },
  {
    question: 'How do I prepare a soil assessment?',
    answer:
      'Add your farm details in Farmer profile, then open Soil analysis to capture or upload a soil image. Automated assessment results depend on the soil-analysis service being connected.',
  },
  {
    question: 'What do nitrogen, phosphorus, and potassium tell me?',
    answer:
      'These primary nutrients support different parts of crop growth: nitrogen supports foliage, phosphorus supports roots and establishment, and potassium supports overall plant health.',
  },
  {
    question: 'Can I share questions and experience with other farmers?',
    answer:
      'Yes. Sign in and open Community to publish a post, like or comment on another farmer’s post, repost it, or share it from your device.',
  },
  {
    question: 'Should I use an AgriSync sample as a final farming recommendation?',
    answer:
      'Use soil results as decision support, not a substitute for a certified laboratory test or advice from a local agricultural extension professional.',
  },
]

export default function FAQSection() {
  const [openQuestion, setOpenQuestion] = useState(0)

  return (
    <section id="faq" className="bg-[#f8f7f0] px-5 py-20 text-[#352e20] sm:px-8 sm:py-24">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-[#35583b]/15 bg-white px-3 py-2 text-[11px] font-bold tracking-[0.16em] text-[#52764a]">
            <CircleHelp size={15} />
            QUICK ANSWERS
          </span>
          <h2 className="mt-5 font-serif text-4xl leading-tight sm:text-5xl">
            A little more
            <span className="block text-[#52764a]">clarity for your farm.</span>
          </h2>
          <p className="mt-5 max-w-md text-sm leading-7 text-[#77705e]">
            Helpful answers about soil insights, your workspace, and the AgriSync farmer community.
          </p>
          <div className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-[#e7ebdf] px-4 py-3 text-xs font-medium text-[#35583b]">
            <Sprout size={17} />
            Built to support more informed growing.
          </div>
        </div>

        <div className="divide-y divide-[#352e20]/10 rounded-3xl border border-[#352e20]/10 bg-white px-5 shadow-[0_20px_55px_rgba(53,88,59,0.07)] sm:px-7">
          {questions.map(({ question, answer }, index) => {
            const isOpen = openQuestion === index
            const panelId = `faq-answer-${index}`

            return (
              <article key={question} className="py-1">
                <h3>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenQuestion(isOpen ? -1 : index)}
                    className="flex w-full items-center justify-between gap-4 py-5 text-left text-sm font-semibold leading-6 text-[#352e20] transition hover:text-[#52764a] sm:text-base"
                  >
                    {question}
                    <ChevronDown
                      size={18}
                      className={`shrink-0 text-[#78966b] transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                </h3>
                {isOpen && (
                  <p id={panelId} className="max-w-2xl pb-5 pr-5 text-sm leading-7 text-[#77705e]">
                    {answer}
                  </p>
                )}
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
