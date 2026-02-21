const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

router.post('/', async (req, res) => {
  const { firstName, contactMethod, contactValue, services, pricingType, pricingAmount } = req.body;

  if (!firstName || !contactMethod || !contactValue || !services || !pricingType || !pricingAmount) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) return res.status(500).json({ error: 'Webhook not configured' });

  const message = `
**New Hire Request**
• **Name:** ${firstName}
• **Contact Method:** ${contactMethod}
• **Contact:** ${contactValue}
• **Services:** ${services}
• **Pricing:** ${pricingType} - $${pricingAmount}
  `;

  try {
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: message })
    });

    return res.json({ sent: true });
  } catch (err) {
    console.error("Discord Error:", err);
    return res.status(500).json({ error: "Failed to send to Discord" });
  }
});

module.exports = router;
