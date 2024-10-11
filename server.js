const express = require('express');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = 'your-secret-key'; // use an environment variable

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/webtoons_db', { useNewUrlParser: true, useUnifiedTopology: true });

// Define Webtoon Schema
const webtoonSchema = new mongoose.Schema({
  title: { type: String, required: true, index: true },
  description: { type: String, required: true },
  characters: [{ type: String }]
});

const Webtoon = mongoose.model('Webtoon', webtoonSchema);

// Middleware
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// JWT Authentication Middleware
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1];

    jwt.verify(token, SECRET_KEY, (err, user) => {
      if (err) {
        return res.sendStatus(403);
      }

      req.user = user;
      next();
    });
  } else {
    res.sendStatus(401);
  }
};

// Input validation middleware
const validateWebtoon = [
  body('title').notEmpty().trim().escape(),
  body('description').notEmpty().trim().escape(),
  body('characters').isArray().withMessage('Characters must be an array')
];

// Routes

// GET /webtoons
app.get('/webtoons', async (req, res) => {
  try {
    const webtoons = await Webtoon.find({}, 'title description characters');
    res.json(webtoons);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching webtoons' });
  }
});

// POST /webtoons
app.post('/webtoons', authenticateJWT, validateWebtoon, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const newWebtoon = new Webtoon(req.body);
    await newWebtoon.save();
    res.status(201).json(newWebtoon);
  } catch (error) {
    res.status(400).json({ message: 'Error creating webtoon' });
  }
});

// GET /webtoons/:id
app.get('/webtoons/:id', async (req, res) => {
  try {
    const webtoon = await Webtoon.findById(req.params.id);
    if (!webtoon) {
      return res.status(404).json({ message: 'Webtoon not found' });
    }
    res.json(webtoon);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching webtoon' });
  }
});

// DELETE /webtoons/:id
app.delete('/webtoons/:id', authenticateJWT, async (req, res) => {
  try {
    const result = await Webtoon.findByIdAndDelete(req.params.id);
    if (!result) {
      return res.status(404).json({ message: 'Webtoon not found' });
    }
    res.json({ message: 'Webtoon deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting webtoon' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});