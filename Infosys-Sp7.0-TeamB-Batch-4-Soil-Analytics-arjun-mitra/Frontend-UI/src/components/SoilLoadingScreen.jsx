import { useEffect, useState } from 'react'
import './SoilLoadingScreen.css'

function SoilSample() {
  return (
    <svg
      className="soil-illustration"
      viewBox="0 0 560 380"
      role="img"
      aria-label="A seedling growing above a soil sample being scanned for nutrients"
    >
      <defs>
        <linearGradient id="soil-front" x1="0" x2="0.2" y1="0" y2="1">
          <stop offset="0" stopColor="#79543a" />
          <stop offset="0.55" stopColor="#60412f" />
          <stop offset="1" stopColor="#493329" />
        </linearGradient>
        <linearGradient id="soil-surface" x1="0" x2="0.8" y1="0" y2="1">
          <stop offset="0" stopColor="#91684a" />
          <stop offset="0.52" stopColor="#714d37" />
          <stop offset="1" stopColor="#563b2d" />
        </linearGradient>
        <linearGradient id="soil-side" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#412e26" />
          <stop offset="0.48" stopColor="#6d4a35" />
          <stop offset="1" stopColor="#382a24" />
        </linearGradient>
        <linearGradient id="scan-glow" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#6bd19a" stopOpacity="0" />
          <stop offset="0.5" stopColor="#84e2ae" stopOpacity="0.3" />
          <stop offset="1" stopColor="#6bd19a" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="leaf-fill" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#7ba96f" />
          <stop offset="1" stopColor="#286442" />
        </linearGradient>
        <clipPath id="soil-clip">
          <path d="M58 207 C145 159 414 159 502 207 L482 294 C371 344 190 344 77 294 Z" />
        </clipPath>
      </defs>

      <ellipse cx="280" cy="303" rx="207" ry="27" fill="#3e3128" opacity="0.14" />

      <path
        d="M58 207 C145 159 414 159 502 207 L482 294 C371 344 190 344 77 294 Z"
        fill="url(#soil-front)"
        stroke="#4d3529"
        strokeWidth="1.5"
      />
      <path
        d="M70 239 C174 284 386 285 490 239 L484 268 C373 311 187 311 77 268 Z"
        fill="url(#soil-side)"
        opacity="0.72"
      />
      <path
        d="M77 268 C183 311 377 312 484 268 L482 294 C371 344 190 344 77 294 Z"
        fill="#3e2e27"
        opacity="0.46"
      />
      <path
        d="M58 207 C145 159 414 159 502 207 C407 260 153 261 58 207 Z"
        fill="url(#soil-surface)"
        stroke="#a57a57"
        strokeOpacity="0.55"
        strokeWidth="1.5"
      />

      <g clipPath="url(#soil-clip)">
        <path
          d="M112 221 C196 252 365 255 452 220"
          fill="none"
          stroke="#b1855e"
          strokeOpacity="0.28"
          strokeWidth="1"
        />
        <path
          d="M94 270 C190 304 367 306 467 269"
          fill="none"
          stroke="#c29163"
          strokeOpacity="0.2"
          strokeWidth="1"
        />
        <path
          d="M267 182 C265 213 237 226 221 242 M270 186 C281 215 315 226 330 247 M267 200 C254 225 256 241 251 258 M272 205 C290 229 286 246 300 264"
          fill="none"
          stroke="#d7bd91"
          strokeOpacity="0.72"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M267 180 C267 213 267 250 269 293"
          fill="none"
          stroke="#e2c997"
          strokeOpacity="0.16"
          strokeWidth="5"
          strokeLinecap="round"
        />

        <g fill="#c69b6d" opacity="0.45">
          <circle cx="131" cy="228" r="2.2" />
          <circle cx="156" cy="247" r="1.4" />
          <circle cx="190" cy="216" r="1.7" />
          <circle cx="215" cy="265" r="2" />
          <circle cx="357" cy="226" r="1.8" />
          <circle cx="389" cy="248" r="1.5" />
          <circle cx="427" cy="217" r="2.2" />
          <circle cx="334" cy="277" r="1.6" />
          <circle cx="164" cy="284" r="1.8" />
        </g>

        <path
          className="soil-scan-line"
          d="M102 231 C194 260 366 262 459 229"
          fill="none"
          stroke="#91dfb1"
          strokeOpacity="0.72"
          strokeWidth="1.5"
        />
        <path
          className="soil-scan-glow"
          d="M96 231 C193 265 369 265 465 229"
          fill="none"
          stroke="#7bd9a4"
          strokeOpacity="0.26"
          strokeWidth="8"
        />

        <g className="data-trail" fill="none" stroke="#d9b26d" strokeWidth="1.2">
          <path d="M134 281 C178 262 207 253 246 244" strokeDasharray="2 7" />
          <path d="M429 274 C386 259 350 250 302 241" strokeDasharray="2 7" />
        </g>
        <g className="data-points" fill="#f0ce85">
          <circle className="data-point data-point-one" cx="151" cy="274" r="2.4" />
          <circle className="data-point data-point-two" cx="409" cy="269" r="2.1" />
          <circle className="data-point data-point-three" cx="177" cy="266" r="1.8" />
          <circle className="data-point data-point-four" cx="388" cy="261" r="1.8" />
        </g>
      </g>

      <g className="seedling">
        <path
          d="M270 189 C269 166 270 143 270 119"
          fill="none"
          stroke="#35734a"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M270 145 C251 121 229 120 217 127 C225 145 248 153 270 149 Z"
          fill="url(#leaf-fill)"
          stroke="#477f53"
          strokeWidth="1"
        />
        <path
          d="M270 133 C280 108 302 99 320 105 C317 125 296 140 270 138 Z"
          fill="url(#leaf-fill)"
          stroke="#477f53"
          strokeWidth="1"
        />
        <path
          d="M269 145 C251 136 238 132 225 130 M271 134 C289 123 301 115 313 108"
          fill="none"
          stroke="#b4cc91"
          strokeOpacity="0.75"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <path d="M269 188 C267 180 271 174 276 172" fill="none" stroke="#4d7850" strokeWidth="2" />
      </g>

      <g className="orbit-ring">
        <ellipse
          cx="280"
          cy="208"
          rx="228"
          ry="74"
          fill="none"
          stroke="#18794e"
          strokeOpacity="0.42"
          strokeWidth="1.4"
          strokeDasharray="520 940"
        />
        <circle cx="499" cy="205" r="3.4" fill="#3ba36c" />
        <circle cx="499" cy="205" r="7" fill="#3ba36c" opacity="0.15" />
      </g>
    </svg>
  )
}

function NutrientMarker({ className, label, name }) {
  return (
    <div className={`soil-nutrient ${className}`} aria-hidden="true">
      <span className="nutrient-indicator" />
      <span className="nutrient-symbol">{name}</span>
      <span className="nutrient-label">{label}</span>
    </div>
  )
}

export default function SoilLoadingScreen() {
  const [isExiting, setIsExiting] = useState(false)
  const [isRemoved, setIsRemoved] = useState(false)

  useEffect(() => {
    const exitTimer = window.setTimeout(() => setIsExiting(true), 4600)
    const removeTimer = window.setTimeout(() => setIsRemoved(true), 5000)

    return () => {
      window.clearTimeout(exitTimer)
      window.clearTimeout(removeTimer)
    }
  }, [])

  if (isRemoved) return null

  return (
    <div
      className={`soil-loading-screen${isExiting ? ' is-exiting' : ''}`}
      role="status"
      aria-label="AgriSync is analyzing your soil intelligence"
      aria-hidden={isExiting}
    >
      <div className="soil-loading-composition">
        <header className="loading-brand">
          <svg
            className="loading-brand-mark"
            viewBox="0 0 44 44"
            aria-hidden="true"
          >
            <path
              d="M11 29 C11 18 19 10 33 9 C33 23 25 31 14 32"
              fill="none"
              stroke="#245c3a"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <path
              d="M14 32 C19 25 24 20 31 15"
              fill="none"
              stroke="#18794e"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <circle cx="11" cy="33" r="2.2" fill="#18794e" />
            <circle cx="32" cy="14" r="2.2" fill="#18794e" />
            <circle cx="34" cy="8" r="1.6" fill="#c39a5c" />
            <path
              d="M11 33 L22 29 L32 14 M22 29 L27 35"
              fill="none"
              stroke="#7fa388"
              strokeWidth="1.25"
              strokeLinecap="round"
            />
            <circle cx="22" cy="29" r="2" fill="#fffdf7" stroke="#18794e" strokeWidth="1.4" />
            <circle cx="27" cy="35" r="1.7" fill="#c39a5c" />
          </svg>
          <h1 className="loading-wordmark">
            <span>Agri</span>
            <span>Sync</span>
          </h1>
        </header>

        <p className="loading-tagline">Intelligence Beneath Every Harvest.</p>

        <div className="soil-stage" aria-hidden="false">
          <SoilSample />
          <NutrientMarker className="nutrient-n" name="N" label="Nitrogen" />
          <NutrientMarker className="nutrient-p" name="P" label="Phosphorus" />
          <NutrientMarker className="nutrient-k" name="K" label="Potassium" />
          <NutrientMarker className="nutrient-ph" name="pH" label="Soil pH" />
        </div>

        <div className="loading-progress">
          <p className="loading-status">Analyzing your soil intelligence…</p>
          <div className="loading-progress-track" aria-hidden="true">
            <span className="loading-progress-highlight" />
          </div>
          <p className="loading-footnote">AI SOIL ANALYTICS <span>•</span> CROP ADVISORY</p>
        </div>
      </div>
    </div>
  )
}
