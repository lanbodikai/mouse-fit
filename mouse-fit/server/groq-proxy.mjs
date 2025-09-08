// server/groq-proxy.mjs
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app = express();

// ====== CONFIG ======
const PORT = process.env.PORT || 3000;
// Serve your static site (html/css/js). If you develop with plain files in /public, keep /public.
// If you build with Vite, switch this to 'dist' for production.
const PUBLIC_DIR = path.join(__dirname, '..', 'public'); // or '..', 'dist' after `npm run build`

// ====== MIDDLEWARE ======
app.use(express.json({ limit: '1mb' }));

// PUBLIC API (any site can call it). To lock to your domain, change origin below.
app.use(cors({ origin: '*', methods: ['POST', 'OPTIONS'] }));

// Rate limit (protect your Groq credits)
app.use('/api/', rateLimit({ windowMs: 60_000, max: 60 }));

// ====== HEALTH ======
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, groqKeyPresent: Boolean(process.env.GROQ_API_KEY) });
});

// ====== STREAMING CHAT (plain text stream to match your ai.js) ======
app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages (array) required' });
    }

    const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        temperature: 0.3,
        max_tokens: 512,
        stream: true
      })
    });

    if (!upstream.ok || !upstream.body) {
      const t = await upstream.text().catch(() => '');
      return res.status(upstream.status || 500).json({ error: 'Groq request failed', details: t });
    }

    // Send raw text tokens back to browser
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Transfer-Encoding', 'chunked');

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    const flushSSE = (chunk) => {
      buffer += chunk;
      const events = buffer.split('\n\n');
      buffer = events.pop() || '';

      for (const evt of events) {
        const lines = evt.split('\n');
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          if (!payload) continue;
          if (payload === '[DONE]') {
            res.end();
            return true;
          }
          try {
            const json = JSON.parse(payload);
            const token = json?.choices?.[0]?.delta?.content ?? '';
            if (token) res.write(token);
          } catch {/* ignore keepalives */}
        }
      }
      return false;
    };

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const finished = flushSSE(chunk);
      if (finished) return;
    }
    if (buffer) flushSSE('\n\n');
    res.end();
  } catch (err) {
    console.error('Proxy /api/chat error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ====== STATIC FILES ======
app.use(express.static(PUBLIC_DIR));
// If you have a single-page app entry, you can add a catch-all:
// app.get('*', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));

app.listen(PORT, () => {
  console.log(`[server] http://localhost:${PORT}`);
});
