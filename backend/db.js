const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Fallback JSON file path
const FALLBACK_DB_PATH = path.join(__dirname, 'db_fallback.json');

// Mongoose schema definition
const EventSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, index: true },
  eventType: { type: String, required: true, index: true },
  url: { type: String, required: true },
  timestamp: { type: Date, default: Date.now, index: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  userAgent: { type: String },
  ip: { type: String }
});

const EventModel = mongoose.model('Event', EventSchema);

let useFallback = false;
let fallbackDb = [];

// Helper function to read/write fallback DB
function loadFallbackDb() {
  try {
    if (fs.existsSync(FALLBACK_DB_PATH)) {
      const data = fs.readFileSync(FALLBACK_DB_PATH, 'utf8');
      fallbackDb = JSON.parse(data || '[]');
    } else {
      fallbackDb = [];
      fs.writeFileSync(FALLBACK_DB_PATH, JSON.stringify(fallbackDb, null, 2));
    }
  } catch (err) {
    console.error('Error loading fallback JSON database, initializing empty:', err);
    fallbackDb = [];
  }
}

function saveToFallbackDb(event) {
  try {
    fallbackDb.push(event);
    fs.writeFileSync(FALLBACK_DB_PATH, JSON.stringify(fallbackDb, null, 2));
  } catch (err) {
    console.error('Error saving to fallback JSON database:', err);
  }
}

// Connect to MongoDB with timeout
async function connectDb() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/user-analytics';
  console.log(`Attempting to connect to MongoDB at: ${mongoUri}...`);
  
  try {
    // Attempt Mongoose connection with a short 2.5-second timeout
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 2500
    });
    console.log('\x1b[32m%s\x1b[0m', 'Successfully connected to MongoDB Database.');
    useFallback = false;
  } catch (error) {
    console.log('\x1b[33m%s\x1b[0m', 'Could not connect to MongoDB. Switching to Local JSON Database Fallback.');
    console.log(`Fallback database file: ${FALLBACK_DB_PATH}`);
    useFallback = true;
    loadFallbackDb();
  }
}

// Interface for API actions
const dbService = {
  // Initialize connection
  init: connectDb,
  
  // Is using local fallback
  isFallback: () => useFallback,

  // Save event
  saveEvent: async (eventData) => {
    const rawEvent = {
      sessionId: eventData.sessionId,
      eventType: eventData.eventType,
      url: eventData.url,
      timestamp: eventData.timestamp ? new Date(eventData.timestamp) : new Date(),
      metadata: eventData.metadata || {},
      userAgent: eventData.userAgent || '',
      ip: eventData.ip || ''
    };

    if (!useFallback) {
      const event = new EventModel(rawEvent);
      return await event.save();
    } else {
      saveToFallbackDb(rawEvent);
      return rawEvent;
    }
  },

  // Get sessions list with event count, start/end time
  getSessions: async () => {
    if (!useFallback) {
      // Aggregate in MongoDB
      const results = await EventModel.aggregate([
        {
          $group: {
            _id: "$sessionId",
            eventCount: { $sum: 1 },
            startedAt: { $min: "$timestamp" },
            endedAt: { $max: "$timestamp" },
            urls: { $addToSet: "$url" }
          }
        },
        { $sort: { startedAt: -1 } }
      ]);
      return results.map(r => ({
        sessionId: r._id,
        eventCount: r.eventCount,
        startedAt: r.startedAt,
        endedAt: r.endedAt,
        urls: r.urls
      }));
    } else {
      // In-memory aggregation of fallback database
      const sessionsMap = {};
      fallbackDb.forEach(event => {
        const sid = event.sessionId;
        const eventTime = new Date(event.timestamp);
        
        if (!sessionsMap[sid]) {
          sessionsMap[sid] = {
            sessionId: sid,
            eventCount: 0,
            startedAt: eventTime,
            endedAt: eventTime,
            urlsSet: new Set()
          };
        }
        
        const s = sessionsMap[sid];
        s.eventCount += 1;
        
        if (eventTime < s.startedAt) s.startedAt = eventTime;
        if (eventTime > s.endedAt) s.endedAt = eventTime;
        s.urlsSet.add(event.url);
      });

      return Object.values(sessionsMap)
        .map(s => ({
          sessionId: s.sessionId,
          eventCount: s.eventCount,
          startedAt: s.startedAt,
          endedAt: s.endedAt,
          urls: Array.from(s.urlsSet)
        }))
        .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
    }
  },

  // Get all events for a specific session sorted by timestamp
  getSessionEvents: async (sessionId) => {
    if (!useFallback) {
      return await EventModel.find({ sessionId }).sort({ timestamp: 1 });
    } else {
      return fallbackDb
        .filter(event => event.sessionId === sessionId)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }
  },

  // Get clicks for a page URL
  getPageClicks: async (url) => {
    if (!useFallback) {
      return await EventModel.find({
        url: url,
        eventType: 'click'
      }).select('metadata timestamp sessionId');
    } else {
      return fallbackDb
        .filter(event => event.url === url && event.eventType === 'click')
        .map(event => ({
          metadata: event.metadata,
          timestamp: event.timestamp,
          sessionId: event.sessionId
        }));
    }
  }
};

module.exports = dbService;
