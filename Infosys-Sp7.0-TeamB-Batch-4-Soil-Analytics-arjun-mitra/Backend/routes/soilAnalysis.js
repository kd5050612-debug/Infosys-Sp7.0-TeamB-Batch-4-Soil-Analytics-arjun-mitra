const express = require('express')
const { spawn } = require('child_process')
const path = require('path')
const pool = require('../config/db')
const authenticate = require('../middleware/authMiddleware')

const router = express.Router()
const FEATURES = ['nitrogen', 'phosphorus', 'potassium', 'temperature', 'humidity', 'ph', 'rainfall']
const predictorPath = path.join(__dirname, '..', '..', 'ml_backend', 'predict_crop.py')
const imagePredictorPath = path.join(__dirname, '..', '..', 'ml_backend', 'predict_soil_image.py')

function validateInputs(body) {
  const values = {}
  for (const feature of FEATURES) {
    if (body[feature] === '' || body[feature] === null || body[feature] === undefined) {
      return { error: `${feature} is required.` }
    }
    const value = Number(body[feature])
    if (!Number.isFinite(value)) return { error: `${feature} must be a valid number.` }
    values[feature] = value
  }
  const ranges = {
    nitrogen: [0, 200], phosphorus: [0, 200], potassium: [0, 250],
    temperature: [-30, 70], humidity: [0, 100], ph: [0, 14], rainfall: [0, 5000],
  }
  for (const feature of FEATURES) {
    const [minimum, maximum] = ranges[feature]
    if (values[feature] < minimum || values[feature] > maximum) {
      return { error: `${feature} must be between ${minimum} and ${maximum}.` }
    }
  }
  return { values }
}

function pythonCommands() {
  if (process.env.ML_PYTHON_PATH) {
    return [{ file: process.env.ML_PYTHON_PATH, args: [] }]
  }

  return process.platform === 'win32'
    ? [{ file: 'python', args: [] }, { file: 'py', args: ['-3'] }]
    : [{ file: 'python3', args: [] }, { file: 'python', args: [] }]
}

async function runPrediction(python, args, values) {
  return new Promise((resolve, reject) => {
    const child = spawn(python, [...args, predictorPath], { windowsHide: true })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => { stdout += chunk })
    child.stderr.on('data', (chunk) => { stderr += chunk })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `Crop model exited with code ${code}`))
        return
      }
      try {
        resolve(JSON.parse(stdout))
      } catch (error) {
        reject(new Error(`Invalid crop model response: ${error.message}`))
      }
    })
    child.stdin.end(JSON.stringify(values))
  })
}

async function runImagePrediction(python, args, image) {
  return new Promise((resolve, reject) => {
    const child = spawn(python, [...args, imagePredictorPath], { windowsHide: true })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => { stdout += chunk })
    child.stderr.on('data', (chunk) => { stderr += chunk })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code !== 0) {
        let detail = stderr.trim()
        try { detail = JSON.parse(stdout).error || detail } catch (_) { /* keep stderr */ }
        reject(new Error(detail || `Image model exited with code ${code}`))
        return
      }
      try { resolve(JSON.parse(stdout)) } catch (error) {
        reject(new Error(`Invalid image model response: ${error.message}`))
      }
    })
    child.stdin.end(JSON.stringify({ image }))
  })
}

async function predict(values) {
  let lastError
  for (const command of pythonCommands()) {
    try {
      return await runPrediction(command.file, command.args, values)
    } catch (error) {
      lastError = error
      if (error.code !== 'ENOENT') break
    }
  }
  throw lastError || new Error('No Python interpreter was found')
}

async function predictImage(image) {
  let lastError
  for (const command of pythonCommands()) {
    try { return await runImagePrediction(command.file, command.args, image) } catch (error) {
      lastError = error
      if (error.code !== 'ENOENT') break
    }
  }
  throw lastError || new Error('No Python interpreter was found')
}

function validateImage(image) {
  if (typeof image !== 'string' || !image) return 'An image is required.'
  if (!/^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/i.test(image)) {
    return 'Image must be a JPEG, PNG, or WebP data URL.'
  }
  if (Buffer.byteLength(image, 'utf8') > 14 * 1024 * 1024) return 'Image must be smaller than 10 MB.'
  return null
}

function parseJsonContent(content) {
  const text = content.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim()
  return JSON.parse(text)
}

async function getCropRecommendations(prediction, textRecommendation, soilValues) {
  if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY is not configured.')
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + process.env.GROQ_API_KEY },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You are an agronomy assistant. Return only valid JSON with keys crops (array of 4 to 6 strings), explanation (string), and precautions (array of 2 to 4 strings). Recommend practical crops for the predicted soil type. Do not invent soil test measurements. Mention that recommendations should be validated locally.' },
        {
          role: 'user',
          content: JSON.stringify({
            predictedSoilType: prediction.soilType,
            imageModelConfidence: prediction.confidence,
            nutrientModelRecommendation: textRecommendation?.crop || null,
            nutrientModelConfidence: textRecommendation?.confidence || null,
            soilMeasurements: soilValues || null,
          }),
        },
      ],
    }),
  })
  if (!response.ok) throw new Error(`Groq request failed with status ${response.status}.`)
  const data = await response.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('Groq returned an empty recommendation.')
  const recommendations = parseJsonContent(content)
  if (!Array.isArray(recommendations.crops) || !recommendations.explanation || !Array.isArray(recommendations.precautions)) {
    throw new Error('Groq returned an incomplete recommendation.')
  }
  return recommendations
}

function getLocalCropRecommendations(prediction) {
  const soilType = prediction.soilType.replaceAll('_', ' ')
  return {
    crops: ['Maize', 'Soybean', 'Cotton', 'Pulses'],
    explanation: `The image model classified this as ${soilType}. These are general examples only; validate crop suitability with local soil measurements and agronomy guidance.`,
    precautions: [
      'Confirm soil nutrients and pH with a local soil test.',
      'Adjust irrigation and crop selection for the local climate.',
    ],
  }
}

function getLocalTextRecommendations(recommendation) {
  return {
    crops: [recommendation.crop],
    explanation: `The trained nutrient model recommends ${recommendation.crop} for the supplied soil measurements. Validate this result with a local soil test and agronomy guidance before planting.`,
    precautions: [
      'Confirm the measurements and soil pH with a local soil test.',
      'Consider local climate, irrigation, and seasonal conditions.',
    ],
  }
}

function mergeRecommendations(imagePrediction, textRecommendation) {
  const imageGuidance = getLocalCropRecommendations(imagePrediction)
  if (!textRecommendation) return imageGuidance

  const textGuidance = getLocalTextRecommendations(textRecommendation)
  return {
    crops: [...new Set([...textGuidance.crops, ...imageGuidance.crops])],
    explanation: `${textGuidance.explanation} The image model additionally classified the soil as ${imagePrediction.soilType.replaceAll('_', ' ')}.`,
    precautions: [...new Set([...textGuidance.precautions, ...imageGuidance.precautions])],
  }
}

router.use(authenticate)

router.post('/combined', async (req, res) => {
  const imageError = req.body?.image ? validateImage(req.body.image) : null
  if (imageError) return res.status(400).json({ message: imageError })

  const hasImage = Boolean(req.body?.image)
  const hasText = FEATURES.some((feature) => req.body?.[feature] !== undefined)
  if (!hasImage && !hasText) {
    return res.status(400).json({ message: 'Provide a soil image or complete soil measurements.' })
  }

  const textResult = hasText ? validateInputs(req.body || {}) : { values: null }
  if (textResult.error) return res.status(400).json({ message: textResult.error })

  try {
    const [imagePrediction, textRecommendation] = await Promise.all([
      hasImage ? predictImage(req.body.image) : Promise.resolve(null),
      textResult.values ? predict(textResult.values) : Promise.resolve(null),
    ])
    let recommendations
    if (imagePrediction) {
      if (process.env.LOCAL_PREDICTION_MODE === 'true') {
        recommendations = mergeRecommendations(imagePrediction, textRecommendation)
      } else {
        try {
          recommendations = await getCropRecommendations(imagePrediction, textRecommendation, textResult.values)
        } catch (recommendationError) {
          console.error('Recommendation service fallback:', recommendationError.message)
          recommendations = mergeRecommendations(imagePrediction, textRecommendation)
        }
      }
    } else {
      recommendations = getLocalTextRecommendations(textRecommendation)
    }

    return res.status(200).json({
      inputSources: [
        ...(imagePrediction ? ['image'] : []),
        ...(textRecommendation ? ['soil_measurements'] : []),
      ],
      prediction: imagePrediction,
      analysis: textRecommendation
        ? {
          ...textResult.values,
          recommendedCrop: textRecommendation.crop,
          confidence: textRecommendation.confidence,
        }
        : null,
      recommendations,
    })
  } catch (error) {
    console.error('Combined soil analysis failed:', error.message)
    return res.status(503).json({ message: 'Combined soil analysis is unavailable. Check the model environments and recommendation service.' })
  }
})

router.post('/image', async (req, res) => {
  const imageError = validateImage(req.body?.image)
  if (imageError) return res.status(400).json({ message: imageError })
  try {
    const prediction = await predictImage(req.body.image)
    let recommendations = getLocalCropRecommendations(prediction)
    if (process.env.LOCAL_PREDICTION_MODE !== 'true') {
      try {
        recommendations = await getCropRecommendations(prediction)
      } catch (recommendationError) {
        console.error('Recommendation service fallback:', recommendationError.message)
      }
    }
    return res.status(200).json({ prediction, recommendations })
  } catch (error) {
    console.error('Soil image analysis failed:', error.message)
    return res.status(503).json({ message: 'Soil image analysis is unavailable. Check the TensorFlow environment, model file, and GROQ_API_KEY.' })
  }
})

router.post('/', async (req, res) => {
  const result = validateInputs(req.body || {})
  if (result.error) return res.status(400).json({ message: result.error })
  try {
    const recommendation = await predict(result.values)
    if (process.env.LOCAL_PREDICTION_MODE === 'true') {
      return res.status(201).json({
        analysis: {
          id: `local-${Date.now()}`,
          ...result.values,
          recommendedCrop: recommendation.crop,
          confidence: recommendation.confidence,
          guidance: getLocalTextRecommendations(recommendation),
        },
      })
    }

    const [insert] = await pool.execute(
      `INSERT INTO soil_analyses
       (user_id, nitrogen, phosphorus, potassium, temperature, humidity, ph, rainfall, recommended_crop, confidence)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id, result.values.nitrogen, result.values.phosphorus, result.values.potassium,
        result.values.temperature, result.values.humidity, result.values.ph, result.values.rainfall,
        recommendation.crop, recommendation.confidence,
      ],
    )
    return res.status(201).json({
      analysis: { id: insert.insertId, ...result.values, recommendedCrop: recommendation.crop, confidence: recommendation.confidence },
    })
  } catch (error) {
    console.error('Crop model or soil analysis failed:', error.message)
    return res.status(503).json({ message: 'The crop advisory model is unavailable. Check the Python environment and model files.' })
  }
})

router.get('/history', async (req, res) => {
  if (process.env.LOCAL_PREDICTION_MODE === 'true') {
    return res.json({ analyses: [] })
  }

  try {
    const [rows] = await pool.execute(
      `SELECT id, nitrogen, phosphorus, potassium, temperature, humidity, ph, rainfall,
              recommended_crop AS recommendedCrop, confidence, created_at AS createdAt
       FROM soil_analyses WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
      [req.user.id],
    )
    return res.json({ analyses: rows })
  } catch (error) {
    console.error('Soil analysis history failed:', error.message)
    return res.status(500).json({ message: 'Unable to load analysis history.' })
  }
})

router.delete('/:analysisId', async (req, res) => {
  if (!/^\d+$/.test(req.params.analysisId)) return res.status(400).json({ message: 'Invalid analysis id.' })
  try {
    const [result] = await pool.execute('DELETE FROM soil_analyses WHERE id = ? AND user_id = ?', [req.params.analysisId, req.user.id])
    if (!result.affectedRows) return res.status(404).json({ message: 'Analysis not found.' })
    return res.status(204).send()
  } catch (error) {
    console.error('Soil analysis deletion failed:', error.message)
    return res.status(500).json({ message: 'Unable to delete the analysis.' })
  }
})

module.exports = router