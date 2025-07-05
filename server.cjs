// Simple Express backend proxy for Google Places API
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
require('dotenv').config({ path: '.env' });

const app = express();
const PORT = process.env.PORT || 3001;
const GOOGLE_PLACES_KEY = process.env.VITE_GOOGLE_MAPS_API_KEY;
const TAVILY_API_KEY = process.env.VITE_TAVILY_API_KEY;

app.use(cors());
app.use(express.json()); // Middleware to parse JSON bodies

app.get('/api/nearby', async (req, res) => {
  const { lat, lng, type, pagetoken } = req.query;

  let url;
  if (pagetoken) {
    // A short delay is required before a next_page_token can be used.
    await new Promise(resolve => setTimeout(resolve, 2000));
    url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?pagetoken=${pagetoken}&key=${GOOGLE_PLACES_KEY}`;
  } else if (lat && lng && type) {
    url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=1500&type=${type}&key=${GOOGLE_PLACES_KEY}`;
  } else {
    return res.status(400).json({ error: 'Missing required query parameters' });
  }

  try {
    const apiRes = await fetch(url);
    const data = await apiRes.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch from Google Places', details: e.message });
  }
});

const https = require('https');

// Proxy for Google Place Photos (avoids CORS)
app.get('/api/photo', (req, res) => {
  const { photoreference, maxwidth = 400 } = req.query;
  if (!photoreference) {
    return res.status(400).json({ error: 'photoreference is required' });
  }
  const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxwidth}&photoreference=${photoreference}&key=${GOOGLE_PLACES_KEY}`;

  const request = https.get(url, (googleRes) => {
    // Check for redirect
    if (googleRes.statusCode >= 300 && googleRes.statusCode < 400 && googleRes.headers.location) {
      // Follow the redirect
      https.get(googleRes.headers.location, (imageRes) => {
        res.writeHead(imageRes.statusCode, imageRes.headers);
        imageRes.pipe(res);
      }).on('error', (err) => {
        console.error('Error fetching redirected photo:', err);
        res.status(500).send('Failed to fetch photo');
      });
    } else {
      // Not a redirect, pipe the response directly
      res.writeHead(googleRes.statusCode, googleRes.headers);
      googleRes.pipe(res);
    }
  });

  request.on('error', (err) => {
    console.error('Initial photo proxy error:', err);
    res.status(500).send('Failed to fetch photo');
  });
});

// Proxy for Tavily Search API
app.post('/api/tavily/search', async (req, res) => {
  if (!TAVILY_API_KEY) {
    return res.status(500).json({ error: 'Tavily API key not configured on server' });
  }
  try {
    const apiRes = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TAVILY_API_KEY}`,
      },
      body: JSON.stringify(req.body),
    });
    const data = await apiRes.json();
    res.status(apiRes.status).json(data);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch from Tavily Search API', details: e.message });
  }
});

// Proxy for Tavily Extract API
app.post('/api/tavily/extract', async (req, res) => {
  res.status(501).json({ 
    error: 'Not Implemented', 
    message: 'The Tavily API does not have a dedicated /extract endpoint. To get article content, please set "include_raw_content": true in your /api/tavily/search request body and remove the second fetch call.' 
  });
});

app.listen(PORT, () => {
  console.log(`Backend proxy running on http://localhost:${PORT}`);
});
