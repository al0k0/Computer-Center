const path = require('path');
const dns = require('dns');
const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
require('dotenv').config();
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

dns.setServers((process.env.DNS_SERVERS || '8.8.8.8,1.1.1.1')
  .split(',')
  .map((server) => server.trim())
  .filter(Boolean));

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'centerdb';
const CONTACT_COLLECTION = process.env.CONTACT_COLLECTION || 'inquiries';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

let mongoClient;
let mongoConnectionPromise;
let messagesCollection;

app.use(cors({
  origin(origin, callback) {
    if (!origin || ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
}));
app.use(express.json({ limit: '25kb' }));

async function getMessagesCollection() {
  if (messagesCollection) {
    return messagesCollection;
  }

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not configured.');
  }

  if (!mongoConnectionPromise) {
    console.log('Connecting to MongoDB...');
    mongoClient = new MongoClient(MONGODB_URI);
    mongoConnectionPromise = mongoClient.connect();
  }

  await mongoConnectionPromise;

  const db = mongoClient.db(DB_NAME);
  messagesCollection = db.collection(CONTACT_COLLECTION);
  console.log(`MongoDB connected: ${DB_NAME}.${CONTACT_COLLECTION}`);
  return messagesCollection;
}

function sanitizeText(value) {
  return String(value || '').trim();
}

app.post('/api/contact', async (req, res) => {
  try {
    const inquiry = {
      name: sanitizeText(req.body.name),
      organisation: sanitizeText(req.body.organisation),
      email: sanitizeText(req.body.email),
      phone: sanitizeText(req.body.phone),
      enquiryType: sanitizeText(req.body.enquiryType),
      message: sanitizeText(req.body.message),
      createdAt: new Date(),
    };

    if (!inquiry.name || !inquiry.email || !inquiry.message) {
      return res.status(400).json({ error: 'Name, email, and message are required.' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inquiry.email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const collection = await getMessagesCollection();
    const result = await collection.insertOne(inquiry);
    return res.status(201).json({ success: true, id: result.insertedId });
  } catch (error) {
    console.error('Contact submission failed:', error);

    if (error.message === 'MONGODB_URI is not configured.') {
      return res.status(500).json({ error: 'Contact service is not configured yet.' });
    }

    return res.status(500).json({ error: 'Failed to save your message. Please try again later.' });
  }
});

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'computer-center-backend',
    routes: ['/api/health', '/api/contact'],
  });
});

app.get('/api/health', async (req, res) => {
  try {
    await getMessagesCollection();
    return res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    return res.status(500).json({ status: 'error', database: 'unavailable' });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'API route not found.' });
});

if (require.main === module) {
  app.listen(PORT, async () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    try {
      await getMessagesCollection();
    } catch (error) {
      console.error('MongoDB connection failed:', error.message);
    }
  });
}

module.exports = app;
