// index.js
require('dotenv').config();

const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();

// --- Env ---
const PORT = process.env.PORT || 3000;
const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;
const HS_OBJECT = process.env.HS_OBJECT || 'p243994756_pet';
const HS_PROPERTIES = (process.env.HS_PROPERTIES || 'name,species,bio')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)
  .join(',');

if (!HUBSPOT_ACCESS_TOKEN) {
  console.warn('[WARN] Missing HUBSPOT_ACCESS_TOKEN in .env (do NOT commit it)');
}

// Axios instance for HubSpot
const hubspot = axios.create({
  baseURL: 'https://api.hubapi.com',
  headers: {
    Authorization: `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// --- Express setup ---
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true })); // parse form posts

const propList = HS_PROPERTIES.split(',').map(p => p.trim()).filter(Boolean);

// GET / — homepage table
app.get('/', async (req, res) => {
  try {
    const { data } = await hubspot.get(`/crm/v3/objects/${encodeURIComponent(HS_OBJECT)}`, {
      params: { properties: HS_PROPERTIES, limit: 100 },
    });

    res.render('homepage', {
      title: 'Homepage | Integrating With HubSpot I Practicum',
      records: data.results || [],
      properties: propList,
      error: null,
    });
  } catch (err) {
    console.error('[GET /] Error:', err?.response?.data || err.message);
    res.status(500).render('homepage', {
      title: 'Homepage | Integrating With HubSpot I Practicum',
      records: [],
      properties: propList,
      error: 'Failed to load records. Check token, HS_OBJECT, and scopes.',
    });
  }
});

// GET /update-cobj — show form
app.get('/update-cobj', (req, res) => {
  res.render('updates', {
    title: 'Update Custom Object Form | Integrating With HubSpot I Practicum',
    properties: propList,
    formData: {},
    error: null,
  });
});

// POST /update-cobj — create record
app.post('/update-cobj', async (req, res) => {
  try {
    const properties = {};
    for (const p of propList) {
      if (typeof req.body[p] !== 'undefined') properties[p] = req.body[p];
    }

    await hubspot.post(`/crm/v3/objects/${encodeURIComponent(HS_OBJECT)}`, { properties });

    return res.redirect('/');
  } catch (err) {
    console.error('[POST /update-cobj] Error:', err?.response?.data || err.message);
    res.status(400).render('updates', {
      title: 'Update Custom Object Form | Integrating With HubSpot I Practicum',
      properties: propList,
      formData: req.body,
      error: 'Failed to create record. Verify property names and token scopes.',
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`Using HS_OBJECT="${HS_OBJECT}" and properties="${HS_PROPERTIES}"`);
});
