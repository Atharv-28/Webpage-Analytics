require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for API requests and tracking script ingestion
app.use(cors());
app.use(express.json());

// Serve static assets from 'public' folder (e.g. tracker.js, demo.html)
app.use(express.static(path.join(__dirname, 'public')));

// Root route redirects or returns server details
app.get('/', (req, res) => {
  res.json({
    message: 'User Analytics Backend API is running.',
    endpoints: {
      sessions: '/api/sessions',
      sessionEvents: '/api/sessions/:sessionId',
      heatmap: '/api/heatmap?url=<url>',
      trackerScript: '/tracker.js',
      demoPage: '/demo'
    },
    database: db.isFallback() ? 'Local JSON DB Fallback' : 'MongoDB'
  });
});

// Explicit route to serve the demo page at /demo
app.get('/demo', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'demo.html'));
});

// Endpoint: Track a new event
app.post('/api/events', async (req, res) => {
  try {
    const { sessionId, eventType, url, timestamp, metadata } = req.body;

    if (!sessionId || !eventType || !url) {
      return res.status(400).json({ error: 'Missing required tracking fields: sessionId, eventType, url' });
    }

    const userAgent = req.headers['user-agent'] || 'unknown';
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

    const event = await db.saveEvent({
      sessionId,
      eventType,
      url,
      timestamp,
      metadata,
      userAgent,
      ip
    });

    res.status(201).json({ success: true, event });
  } catch (error) {
    console.error('Error tracking event:', error);
    res.status(500).json({ error: 'Internal server error saving event.' });
  }
});

// Endpoint: Fetch sessions list with metadata and event counts
app.get('/api/sessions', async (req, res) => {
  try {
    const sessions = await db.getSessions();
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Internal server error fetching sessions.' });
  }
});

// Endpoint: Fetch all events for a specific session ID
app.get('/api/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const events = await db.getSessionEvents(sessionId);
    res.json(events);
  } catch (error) {
    console.error(`Error fetching events for session ${sessionId}:`, error);
    res.status(500).json({ error: 'Internal server error fetching session events.' });
  }
});

// Endpoint: Fetch heatmap click data for a specific page URL
app.get('/api/heatmap', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ error: 'Missing required query parameter: url' });
    }
    const clicks = await db.getPageClicks(url);
    res.json(clicks);
  } catch (error) {
    console.error(`Error fetching click data for url ${url}:`, error);
    res.status(500).json({ error: 'Internal server error fetching heatmap data.' });
  }
});

// Endpoint: Fetch database status
app.get('/api/db-status', (req, res) => {
  res.json({
    useFallback: db.isFallback(),
    databaseType: db.isFallback() ? 'Local JSON DB Fallback' : 'MongoDB'
  });
});

// Start server after initializing database
async function startServer() {
  await db.init();
  app.listen(PORT, () => {
    console.log(`-----------------------------------------------`);
    console.log(`Server is running on port ${PORT}`);
    console.log(`Backend API: http://localhost:${PORT}`);
    console.log(`Tracking Script: http://localhost:${PORT}/tracker.js`);
    console.log(`Interactive Demo Page: http://localhost:${PORT}/demo`);
    console.log(`-----------------------------------------------`);
  });
}

startServer();
