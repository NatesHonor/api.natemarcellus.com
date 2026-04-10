const express = require('express')
const router = express.Router()
const fetch = require('node-fetch')
const rateLimit = require('express-rate-limit')
const redisClient = require('../utils/redisClient')

const jobLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false
})

router.post('/', jobLimiter, async (req, res) => {
  const ip = req.ip
  const cooldownKey = `jobcool:${ip}`
  const cooldown = await redisClient.get(cooldownKey)
  if (cooldown) return res.status(429).json({ error: 'cooldown' })

  const { firstName, contactMethod, contactValue, services, pricingType, pricingAmount, token } = req.body

  if (!firstName || !contactMethod || !contactValue || !services || !pricingType || !pricingAmount)
    return res.status(400).json({ error: 'missing_fields' })

  if (!token) return res.status(400).json({ error: 'missing_captcha' })

  try {
    const verifyRes = await fetch('https://api.hcaptcha.com/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: process.env.HCAPTCHA_KEY,
        response: token
      })
    })

    const verifyData = await verifyRes.json()
    if (!verifyData.success) return res.status(400).json({ error: 'captcha_failed' })
  } catch {
    return res.status(500).json({ error: 'captcha_error' })
  }

  const webhook = process.env.DISCORD_WEBHOOK_URL
  if (!webhook) return res.status(500).json({ error: 'no_webhook' })

  const message = `
**New Hire Request**
• **Name:** ${firstName}
• **Contact Method:** ${contactMethod}
• **Contact:** ${contactValue}
• **Services:** ${services}
• **Pricing:** ${pricingType} - $${pricingAmount}
  `

  try {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: message })
    })

    await redisClient.set(cooldownKey, '1', { EX: 30 })
    return res.json({ sent: true })
  } catch {
    return res.status(500).json({ error: 'discord_error' })
  }
})

module.exports = router
