// server.js (root project) - Express + Vite middleware + API endpoints for voice chat integration
import express from "express";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import "dotenv/config";

const app = express();
const port = process.env.PORT || 8080;
const apiKey = process.env.OPENAI_API_KEY;
const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

const CANADIAN_AI_PROMPT = `You are a friendly Canadian AI assistant, eh! ...`; // (copy full prompt from demo)
const GOOGLE_MAPS_TOOLS = [/* ... copy from demo ... */];

// --- Google Maps API integration functions ---
class GoogleMapsService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = "https://maps.googleapis.com/maps/api";
  }

  async searchPlaces(query, location = null, radius = 5000) {
    const url = new URL(`${this.baseUrl}/place/textsearch/json`);
    url.searchParams.append("query", query);
    url.searchParams.append("key", this.apiKey);
    if (location) {
      url.searchParams.append("location", `${location.latitude},${location.longitude}`);
      url.searchParams.append("radius", radius.toString());
    }
    const response = await fetch(url.toString());
    const data = await response.json();
    if (data.status !== "OK") {
      throw new Error(`Places search failed: ${data.error_message || data.status}`);
    }
    return {
      places: data.results.map((place) => ({
        name: place.name,
        formatted_address: place.formatted_address,
        location: place.geometry.location,
        place_id: place.place_id,
        rating: place.rating,
        types: place.types,
      })),
    };
  }

  async getPlaceDetails(placeId) {
    const url = new URL(`${this.baseUrl}/place/details/json`);
    url.searchParams.append("place_id", placeId);
    url.searchParams.append("key", this.apiKey);
    const response = await fetch(url.toString());
    const data = await response.json();
    if (data.status !== "OK") {
      throw new Error(`Place details failed: ${data.error_message || data.status}`);
    }
    return data.result;
  }

  async getDirections(origin, destination, mode = "driving") {
    const url = new URL(`${this.baseUrl}/directions/json`);
    url.searchParams.append("origin", origin);
    url.searchParams.append("destination", destination);
    url.searchParams.append("mode", mode);
    url.searchParams.append("key", this.apiKey);
    const response = await fetch(url.toString());
    const data = await response.json();
    if (data.status !== "OK") {
      throw new Error(`Directions failed: ${data.error_message || data.status}`);
    }
    return data.routes;
  }

  async geocodeAddress(address = null, latitude = null, longitude = null) {
    const url = new URL(`${this.baseUrl}/geocode/json`);
    if (address) {
      url.searchParams.append("address", address);
    } else if (latitude && longitude) {
      url.searchParams.append("latlng", `${latitude},${longitude}`);
    }
    url.searchParams.append("key", this.apiKey);
    const response = await fetch(url.toString());
    const data = await response.json();
    if (data.status !== "OK") {
      throw new Error(`Geocoding failed: ${data.error_message || data.status}`);
    }
    return data.results;
  }
}

const googleMapsService = googleMapsApiKey ? new GoogleMapsService(googleMapsApiKey) : null;

async function startServer() {
  // --- Vite middleware for React frontend ---
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "custom",
  });
  app.use(vite.middlewares);

  app.use(express.json());

  // --- API Endpoints ---
  app.get("/api/mcp-gmaps/search", async (req, res) => {
  console.log(`[API] GET /api/mcp-gmaps/search`, req.query);
  try {
    if (!googleMapsService) return res.status(500).json({ error: "Google Maps API key not configured" });
    const { query, location, radius = 5000 } = req.query;
    let searchLocation = null;
    if (location) {
      const [lat, lng] = location.split(",");
      searchLocation = { latitude: parseFloat(lat), longitude: parseFloat(lng) };
    }
    const result = await googleMapsService.searchPlaces(query, searchLocation, parseInt(radius));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/mcp-gmaps/details/:placeId", async (req, res) => {
  console.log(`[API] GET /api/mcp-gmaps/details/${req.params.placeId}`);
  try {
    if (!googleMapsService) return res.status(500).json({ error: "Google Maps API key not configured" });
    const { placeId } = req.params;
    const result = await googleMapsService.getPlaceDetails(placeId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/mcp-gmaps/directions", async (req, res) => {
  console.log(`[API] GET /api/mcp-gmaps/directions`, req.query);
  try {
    if (!googleMapsService) return res.status(500).json({ error: "Google Maps API key not configured" });
    const { origin, destination, mode = "driving" } = req.query;
    const result = await googleMapsService.getDirections(origin, destination, mode);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/mcp-gmaps/geocode", async (req, res) => {
  console.log(`[API] GET /api/mcp-gmaps/geocode`, req.query);
  try {
    if (!googleMapsService) return res.status(500).json({ error: "Google Maps API key not configured" });
    const { address, lat, lng } = req.query;
    const result = await googleMapsService.geocodeAddress(address, lat ? parseFloat(lat) : null, lng ? parseFloat(lng) : null);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/token", async (req, res) => {
  console.log(`[API] GET /token`);
  try {
    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice: "alloy",
        instructions: CANADIAN_AI_PROMPT,
        modalities: ["text", "audio"],
        tools: GOOGLE_MAPS_TOOLS,
        tool_choice: "auto",
        temperature: 0.8,
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
        },
      }),
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to generate token" });
  }
});

  app.get("/{*any}", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const template = await vite.transformIndexHtml(url, fs.readFileSync("./index.html", "utf-8"));
      const html = template; // No SSR; just serve index.html
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });

  app.listen(port, () => {
    console.log(`Express server running on *:${port}`);
    if (!googleMapsApiKey) {
      console.warn("⚠️  GOOGLE_MAPS_API_KEY not found in environment variables. Google Maps features will be disabled.");
    } else {
      console.log("🗺️  Google Maps API integration enabled");
    }
  });
}

startServer();
