const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

router.post('/verify', async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: "Missing captcha token" });
  }

  const secret = process.env.HCAPTCHA_KEY;

  try {
    const verifyRes = await fetch("https://api.hcaptcha.com/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret,
        response: token
      })
    });

    const data = await verifyRes.json();

    if (!data.success) {
      return res.status(400).json({
        error: "Captcha failed",
        codes: data["error-codes"] || []
      });
    }

    return res.json({ verified: true });
  } catch (err) {
    console.error("Captcha verification error:", err);
    return res.status(500).json({ error: "Verification error" });
  }
});

module.exports = router;
