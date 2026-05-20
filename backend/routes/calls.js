const express = require('express');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/signal', protect, async (req, res) => {
  try {
    const { to, signal } = req.body;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
