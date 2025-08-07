import express from 'express';
import * as rag from '../src/rag.js';

const router = express.Router();

router.post('/ask', async (req, res) => {
  try {
    const { question, history } = req.body;
    if (!question) {
      return res.status(400).json({ error: 'Invalid input: expected {question, history[]}' });
    }
    const result = await rag.ask(question, history);
    res.json(result);
  } catch (error) {
    console.error('Error in /ask:', error);
    res.status(500).json({ error: error.message || error || 'Internal server error' });
  }
});

export default router;
