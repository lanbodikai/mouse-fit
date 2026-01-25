import { loadMice } from "./mice-api.js";

const $ = (selector) => document.querySelector(selector)
const messagesEl = $('#messages')
const inputEl = $('#prompt')
const sendBtn = $('#sendBtn')
const clearBtn = $('#clearChat')
const badgeEl = $('#modelBadge')

const FLOW = ['length', 'width', 'grip', 'budget']

const PROMPTS = {
  length:
    'First things first — what is your hand length in millimeters? Measure from the tip of your middle finger to the base of your palm.',
  width:
    'Great! Now share your hand width in millimeters (across your knuckles at the widest point).',
  grip: 'Which grip style do you use most of the time? Palm, claw, fingertip, or something hybrid works.',
  budget:
    'Finally, what price range are you shopping in? Feel free to say budget, mid-range, premium, or give a dollar amount.',
}

const PRICE_SEGMENTS = {
  budget: { label: 'budget (<$70)', min: 0, max: 70, center: 55 },
  mid: { label: 'mid-range ($70–$120)', min: 60, max: 130, center: 95 },
  premium: { label: 'premium (>$120)', min: 110, max: 260, center: 150 },
}

const PRICE_ORDER = { budget: 0, mid: 1, premium: 2 }

const BRAND_BASELINES = {
  razer: 130,
  logitech: 135,
  'g-wolves': 110,
  finalmouse: 195,
  steelseries: 105,
  xtrfy: 95,
  ninjutso: 110,
  pulsar: 105,
  glorious: 90,
  'asus rog': 135,
  'benq zowie': 95,
  zowie: 95,
  lamzu: 105,
  'endgame gear': 120,
  corsair: 95,
  hyperx: 85,
  vaxee: 115,
  zygen: 115,
  zaopin: 85,
}

const session = {
  stepIndex: 0,
  answers: {
    length: null,
    width: null,
    grip: null,
    budget: null,
  },
}


const history = []
let DATASET = []

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function scrollToBottom() {
  if (!messagesEl) return
  messagesEl.scrollTop = messagesEl.scrollHeight
}

function appendMessage(role, content, opts = {}) {
  if (!messagesEl) return
  const wrapper = document.createElement('div')
  wrapper.className = `msg ${role}`
  const roleEl = document.createElement('div')
  roleEl.className = 'role'
  roleEl.textContent = role === 'user' ? 'You' : 'Assistant'
  const textEl = document.createElement('div')
  textEl.className = 'text'
  if (opts.html) {
    textEl.innerHTML = content
  } else {
    textEl.textContent = content
  }
  wrapper.appendChild(roleEl)
  wrapper.appendChild(textEl)
  messagesEl.appendChild(wrapper)
  history.push({ role, content, html: !!opts.html })
  scrollToBottom()
}

function pushAssistant(content, opts = {}) {
  appendMessage('assistant', content, opts)
}

function pushUser(content) {
  appendMessage('user', content)
}

function startSession(openingLine) {
  if (messagesEl) {
    messagesEl.innerHTML = ''
  }
  history.length = 0
  session.stepIndex = 0
  session.answers = {
    length: null,
    width: null,
    grip: null,
    budget: null,
  }
  if (openingLine) {
    pushAssistant(openingLine)
  }
  pushAssistant(
    'Hi! I’m the Mouse-Fit gaming mouse recommender. I’ll ask a few sizing questions, then pull matches from our database.'
  )
  askCurrentStep()
}

function updateBadge() {
  if (!badgeEl) return
  const total = DATASET.length
  badgeEl.textContent = `Local dataset: ${total} mice`
}

async function initDataset() {
  try {
    const mice = await loadMice()
    DATASET = Array.isArray(mice) ? mice.filter((m) => m && m.model) : []
  } catch (e) {
    console.warn('AI: failed to load mice from API (dataset empty)', e)
    DATASET = []
  }
  updateBadge()
}

function askCurrentStep() {
  const stepKey = FLOW[session.stepIndex]
  if (!stepKey) return
  const prompt = PROMPTS[stepKey]
  if (prompt) {
    pushAssistant(prompt)
  }
}

function parseMeasurementInput(text) {
  if (!text) return []
  const values = []
  const pattern = /(\d+(?:\.\d+)?)\s*(mm|millimeters?|cm|centimeters?|inches?|in|"|')?/gi
  let match
  while ((match = pattern.exec(text)) !== null) {
    const raw = parseFloat(match[1])
    if (!Number.isFinite(raw)) continue
    const unit = (match[2] || '').toLowerCase()
    let mm = raw
    if (unit.startsWith('cm')) {
      mm = raw * 10
    } else if (unit === '"' || unit === "'" || unit.startsWith('in')) {
      mm = raw * 25.4
    } else if (!unit && raw <= 25) {
      mm = raw * 10
    }
    values.push(mm)
  }
  return values
}

function formatDiffMessage(type, original, value) {
  const rounded = value.toFixed(1)
  if (!Number.isFinite(original)) {
    return `Got it — I’ll use ${rounded} mm for your hand ${type}.`
  }
  if (Math.abs(original - value) >= 5) {
    return `That sounded unusual, so I normalized your hand ${type} to ${rounded} mm. Feel free to correct me.`
  }
  return `Perfect — I’ll use ${rounded} mm for your hand ${type}.`
}

function handleLengthStep(text) {
  const numbers = parseMeasurementInput(text)
  if (!numbers.length) {
    pushAssistant("I didn’t catch a length measurement. Could you share it in millimeters?")
    return { repeat: true }
  }

  const [firstRaw, secondRaw] = numbers
  const length = clamp(numbers[0], 110, 230)
  session.answers.length = length

  if (typeof secondRaw === 'number') {
    const width = clamp(numbers[1], 55, 115)
    session.answers.width = width
    pushAssistant(`Thanks! I’ll work with a ${length.toFixed(1)} mm length and ${width.toFixed(1)} mm width.`)
    return { advanceBy: 2 }
  }

  pushAssistant(formatDiffMessage('length', firstRaw, length))
  return { advanceBy: 1 }
}

function handleWidthStep(text) {
  const numbers = parseMeasurementInput(text)
  if (!numbers.length) {
    pushAssistant("I didn’t catch that width. What’s your hand width in millimeters?")
    return { repeat: true }
  }
  const width = clamp(numbers[0], 55, 115)
  session.answers.width = width
  pushAssistant(formatDiffMessage('width', numbers[0], width))
  return { advanceBy: 1 }
}

function normalizeGrip(text) {
  if (!text) return null
  const lower = text.toLowerCase()
  if (lower.includes('palm')) return 'palm'
  if (lower.includes('claw')) return 'claw'
  if (lower.includes('finger tip') || lower.includes('fingertip') || lower.includes('finger-tip') || lower.includes('ftip')) {
    return 'fingertip'
  }
  if (lower.includes('hybrid') || lower.includes('relaxed')) return 'claw'
  if (lower.includes('any') || lower.includes('either') || lower.includes('mixed')) return 'palm'
  return null
}

function handleGripStep(text) {
  const grip = normalizeGrip(text)
  if (!grip) {
    pushAssistant('I can work with palm, claw, fingertip, or a hybrid of those. Which feels closest to your play style?')
    return { repeat: true }
  }
  session.answers.grip = grip
  const label = grip === 'fingertip' ? 'fingertip grip' : `${grip} grip`
  pushAssistant(`Great — noted that you prefer a ${label}.`)
  return { advanceBy: 1 }
}

function parseBudgetInput(text) {
  if (!text) return null
  const lower = text.toLowerCase()
  if (/(budget|cheap|entry|starter|value)/.test(lower)) {
    return { bucket: 'budget', value: PRICE_SEGMENTS.budget.center }
  }
  if (/(mid|middle|balanced|moderate|reasonable)/.test(lower)) {
    return { bucket: 'mid', value: PRICE_SEGMENTS.mid.center }
  }
  if (/(premium|high-end|flagship|expensive|no limit|any|whatever)/.test(lower)) {
    return { bucket: 'premium', value: PRICE_SEGMENTS.premium.center }
  }

  const numbers = []
  const pattern = /(\d+(?:\.\d+)?)/g
  let match
  while ((match = pattern.exec(text)) !== null) {
    const value = parseFloat(match[1])
    if (!Number.isFinite(value) || value < 20 || value > 600) continue
    numbers.push(value)
  }
  if (!numbers.length) return null
  numbers.sort((a, b) => a - b)
  let min = numbers[0]
  let max = numbers[numbers.length - 1]

  if (/(under|below|less than|max)/.test(lower)) {
    max = min
    min = 0
  } else if (/(over|above|minimum|at least)/.test(lower)) {
    min = max
    max = null
  }

  const reference = max == null ? min : (min + max) / 2
  const value = clamp(reference, 35, 260)
  return { bucket: bucketizePrice(value), value, range: { min, max } }
}

function handleBudgetStep(text) {
  const pref = parseBudgetInput(text)
  if (!pref) {
    pushAssistant(
      "I can match against budget (<$70), mid-range ($70–$120), or premium (>$120). Which sounds closest to your budget, or what's your dollar range?"
    )
    return { repeat: true }
  }
  session.answers.budget = pref
  const segment = PRICE_SEGMENTS[pref.bucket]
  pushAssistant(`Perfect — I’ll look in the ${segment ? segment.label : pref.bucket} space. Give me a moment…`)
  return { advanceBy: 1, finalize: true }
}

const STEP_HANDLERS = {
  length: handleLengthStep,
  width: handleWidthStep,
  grip: handleGripStep,
  budget: handleBudgetStep,
}

function bucketizePrice(price) {
  if (price <= PRICE_SEGMENTS.budget.max) return 'budget'
  if (price <= PRICE_SEGMENTS.mid.max) return 'mid'
  return 'premium'
}

function estimatePrice(mouse) {
  const brandKey = (mouse.brand || '').toLowerCase()
  const name = `${mouse.brand || ''} ${mouse.model || ''}`.toLowerCase()
  let base = BRAND_BASELINES[brandKey]
  if (base == null) base = 95

  const adjustments = [
    { test: /wired/, delta: -22 },
    { test: /(essential|lite|origin|value)/, delta: -16 },
    { test: /mini/, delta: -8 },
    { test: /(8k|4k)/, delta: 16 },
    { test: /(pro|ultimate|superlight|ace|signature|starlight|x2h|x3)/, delta: 18 },
    { test: /(limited|collector|founder|se|special)/, delta: 12 },
    { test: /signature|starlight|air58/, delta: 36 },
  ]
  for (const rule of adjustments) {
    if (rule.test.test(name)) base += rule.delta
  }

  if (brandKey === 'finalmouse') base = Math.max(base, 180)
  if (brandKey === 'asus rog' && /(aim lab|ace)/.test(name)) base += 12
  if (brandKey === 'glorious' && /wired/.test(name)) base = Math.min(base, 80)
  if (/orochi/.test(name)) base = Math.min(base, 70)
  if (/basilisk/.test(name)) base = Math.max(base, 120)
  if (/(g502|g303|g305|g203)/.test(name)) base = Math.min(base, 80)
  if (/prime wireless/.test(name)) base = Math.max(base, 105)

  return clamp(Math.round(base), 35, 260)
}

function shapeLabel(shape) {
  if (!shape) return 'Symmetrical'
  return shape === 'ergo' ? 'Ergonomic' : 'Symmetrical'
}

function toFixed(value) {
  return Number.isFinite(value) ? value.toFixed(1) : '—'
}

function formatDimensions(mouse) {
  const length = toFixed(mouse.length_mm)
  const width = toFixed(mouse.width_mm)
  const height = toFixed(mouse.height_mm)
  return `${length} × ${width} × ${height} mm`
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;'
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '"':
        return '&quot;'
      case "'":
        return '&#39;'
      default:
        return char
    }
  })
}

function buildReasons(mouse, metrics, answers) {
  const reasons = []
  const lengthDiff = metrics.lengthDiff
  const widthDiff = metrics.widthDiff
  const grip = answers.grip
  const priceBucket = metrics.priceBucket
  const priceDistance = metrics.priceDistance
  const price = metrics.price
  const budgetBucket = answers.budget?.bucket
  const hump = (mouse.hump || '').toLowerCase()
  const height = metrics.height

  if (Number.isFinite(lengthDiff)) {
    if (lengthDiff <= 3) {
      reasons.push(
        `Shell length is within ${lengthDiff.toFixed(1)} mm of your ${answers.length.toFixed(1)} mm hand, so finger curl stays natural.`
      )
    } else if ((mouse.length_mm || 0) < answers.length) {
      reasons.push(
        `Slightly shorter ${toFixed(mouse.length_mm)} mm length keeps movement quick for your ${answers.length.toFixed(1)} mm reach.`
      )
    } else {
      reasons.push(
        `Longer ${toFixed(mouse.length_mm)} mm body fills more of your ${answers.length.toFixed(1)} mm palm for added stability.`
      )
    }
  }

  if (Number.isFinite(widthDiff)) {
    if (widthDiff <= 3) {
      reasons.push(
        `Width is within ${widthDiff.toFixed(1)} mm of your ${answers.width.toFixed(1)} mm measurement, so the sides should feel familiar.`
      )
    } else if ((mouse.width_mm || 0) < answers.width) {
      reasons.push(
        `Slim ${toFixed(mouse.width_mm)} mm sides leave space for your ${answers.width.toFixed(1)} mm knuckles to flare.`
      )
    } else {
      reasons.push(
        `Broader ${toFixed(mouse.width_mm)} mm shell fills your ${answers.width.toFixed(1)} mm grip for extra control.`
      )
    }
  }

  if (height && grip === 'palm' && height >= 42) {
    reasons.push(`Taller ${toFixed(height)} mm hump props up a palm grip for full contact.`)
  }
  if (height && grip === 'fingertip' && height <= 38) {
    reasons.push(`Lower ${toFixed(height)} mm hump keeps your palm from dragging in fingertip grip.`)
  }

  if (grip === 'palm') {
    if (mouse.shape === 'ergo') {
      reasons.push('Ergonomic shell supports full palm contact and a relaxed wrist angle.')
    }
    if (/high|back|center/.test(hump)) {
      reasons.push('Rear-biased hump helps anchor a palm grip securely.')
    }
    if (metrics.weight >= 75) {
      reasons.push(`Heftier ${Math.round(metrics.weight)} g chassis keeps a palm grip planted.`)
    }
  }

  if (grip === 'claw') {
    if (mouse.shape === 'sym') {
      reasons.push('Symmetrical shell keeps claw grip angles consistent for both fingers.')
    }
    if (/medium|center/.test(hump)) {
      reasons.push('Mid-position hump lines up with a claw grip arch without forcing palm contact.')
    }
    if (metrics.weight > 0 && metrics.weight <= 65) {
      reasons.push(`Light ${Math.round(metrics.weight)} g weight keeps rapid claw transitions easy.`)
    }
  }

  if (grip === 'fingertip') {
    if (mouse.shape === 'sym') {
      reasons.push('Low-profile symmetrical shell favors fingertip precision.')
    }
    if (/low|flat/.test(hump)) {
      reasons.push('Lower hump avoids palm drag so fingertips stay in control.')
    }
    if (metrics.weight > 0 && metrics.weight <= 55) {
      reasons.push(`Featherweight ${Math.round(metrics.weight)} g build supports quick micro-adjustments.`)
    }
  }

  const priceLabel = PRICE_SEGMENTS[priceBucket]?.label || priceBucket
  if (priceDistance === 0) {
    reasons.push(`Typically sits around $${Math.round(price)}, right in your ${priceLabel} target.`)
  } else if (budgetBucket && PRICE_ORDER[priceBucket] > PRICE_ORDER[budgetBucket]) {
    reasons.push(`Runs about $${Math.round(price)}, a step above your usual bracket but worth it for the fit.`)
  } else if (budgetBucket) {
    reasons.push(`Usually ~$${Math.round(price)}, which slides in below your ${PRICE_SEGMENTS[budgetBucket].label} ceiling.`)
  }

  const deduped = []
  for (const reason of reasons) {
    if (!deduped.includes(reason)) deduped.push(reason)
  }
  return deduped.slice(0, 3)
}

function evaluateMouse(mouse, answers) {
  const length = Number(mouse.length_mm) || 0
  const width = Number(mouse.width_mm) || 0
  if (!length || !width) return null

  const height = Number(mouse.height_mm) || 0
  const weight = Number(mouse.weight_g) || 0
  const price = estimatePrice(mouse)
  const priceBucket = bucketizePrice(price)
  const priceDistance = Math.abs((PRICE_ORDER[priceBucket] ?? 1) - (PRICE_ORDER[answers.budget.bucket] ?? 1))
  if (priceDistance > 2) return null

  const lengthDiff = Math.abs(length - answers.length)
  const widthDiff = Math.abs(width - answers.width)
  const expectedHeight = answers.grip === 'palm' ? 42 : answers.grip === 'claw' ? 40 : 38
  const heightDiff = height ? Math.abs(height - expectedHeight) : 0

  // Build message list with a short window so we don't send giant histories
  let score = lengthDiff * 1.35 + widthDiff * 1.6 + heightDiff * 0.6

  const weightTarget = answers.grip === 'fingertip' ? 52 : answers.grip === 'claw' ? 60 : 72
  if (weight > 0) {
    if (answers.grip === 'palm' && weight < 65) {
      score += (65 - weight) * 0.18
    }
    if (answers.grip !== 'palm' && weight > weightTarget) {
      const factor = answers.grip === 'fingertip' ? 0.35 : 0.25
      score += (weight - weightTarget) * factor
    }
  }

  const shape = mouse.shape || 'sym'
  if (answers.grip === 'palm' && shape === 'sym') score += 6
  if (answers.grip === 'fingertip' && shape === 'ergo') score += 8
  if (answers.grip === 'claw' && shape === 'ergo') score += 3

  score += priceDistance * 26
  const budgetTarget = answers.budget.value ?? PRICE_SEGMENTS[answers.budget.bucket].center
  score += Math.abs(price - budgetTarget) / 7

  return {
    mouse,
    metrics: {
      lengthDiff,
      widthDiff,
      height,
      weight,
      price,
      priceBucket,
      priceDistance,
    },
    score,
  }
}

function rankMice(answers) {
  const candidates = []
  for (const mouse of DATASET) {
    const evaluated = evaluateMouse(mouse, answers)
    if (!evaluated) continue
    candidates.push(evaluated)
  }
  candidates.sort((a, b) => a.score - b.score)
  return candidates.slice(0, 3)
}

function createRecommendationHtml(picks, answers) {
  const budgetLabel = PRICE_SEGMENTS[answers.budget.bucket]?.label || answers.budget.bucket
  const intro = `Here are the mice I like for a ${answers.grip} grip with a ${answers.length.toFixed(1)} × ${answers.width.toFixed(1)} mm hand and a ${budgetLabel} budget.`
  const items = picks
    .map((entry, index) => {
      const { mouse, metrics } = entry
      const name = escapeHtml(`${mouse.brand || ''} ${mouse.model || ''}`.trim() || 'Unknown model')
      const detailParts = [
        shapeLabel(mouse.shape),
        formatDimensions(mouse),
        metrics.weight > 0 ? `${Math.round(metrics.weight)} g` : '—',
        `~$${Math.round(metrics.price)}`,
      ]
      const detail = escapeHtml(detailParts.filter(Boolean).join(' • '))
      const reasons = buildReasons(mouse, metrics, answers)
      const reasonHtml = reasons.length
        ? `<ul>${reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join('')}</ul>`
        : ''
      return `
        <li>
          <strong>${index + 1}. ${name}</strong>
          <div class="detail">${detail}</div>
          ${reasonHtml}
        </li>
      `
    })
    .join('')

  return `
    <p>${escapeHtml(intro)}</p>
    <ol class="recommendations">${items}</ol>
    <p class="small">Want to tweak the inputs? Type <strong>restart</strong> to begin again.</p>
  `
}

function showRecommendations() {
  const { length, width, grip, budget } = session.answers
  if (!length || !width || !grip || !budget) {
    pushAssistant("I need hand length, width, grip style, and budget before I can suggest mice. Type 'restart' to try again.")
    return
  }

  const picks = rankMice(session.answers)
  if (!picks.length) {
    pushAssistant(
      "I couldn’t find a great match with those constraints. Try adjusting the measurements slightly or type 'restart' to start over."
    )
    return
  }

  const html = createRecommendationHtml(picks, session.answers)
  pushAssistant(html, { html: true })
}


function handleUserTurn(rawText) {
  const text = rawText.trim()
  if (!text) return
  pushUser(text)

  const lower = text.toLowerCase()
  if (/^\s*(restart|start over|reset|again)\s*$/.test(lower)) {
    startSession('Sure thing — let’s run through the sizing questions again.')
    return
  }

  const stepKey = FLOW[session.stepIndex]
  if (!stepKey) {
    pushAssistant("If you’d like another recommendation set, just type 'restart'.")
    return
  }

  const handler = STEP_HANDLERS[stepKey]
  if (!handler) return
  const outcome = handler(text)
  if (!outcome || outcome.repeat) return

  const advanceBy = outcome.advanceBy ?? 1
  session.stepIndex += advanceBy

  if (outcome.finalize || session.stepIndex >= FLOW.length) {
    session.stepIndex = FLOW.length
    showRecommendations()
  } else {
    askCurrentStep()
  }
}

function handleSend() {
  if (!inputEl) return
  const text = inputEl.value
  inputEl.value = ''
  handleUserTurn(text)
}

function handleKeydown(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    handleSend()
  }
}

function handleClear() {
  startSession()
}

function boot() {
  initDataset()
  startSession()
}


sendBtn?.addEventListener('click', handleSend)
inputEl?.addEventListener('keydown', handleKeydown)
clearBtn?.addEventListener('click', handleClear)


boot()
