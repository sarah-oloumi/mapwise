import express from "express";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import "dotenv/config";

const app = express();
const port = process.env.PORT || 3000;
const apiKey = process.env.OPENAI_API_KEY;
const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

// Canadian AI system prompt for the voice assistant
const CANADIAN_AI_PROMPT = `You are a friendly Canadian AI assistant, eh! Your knowledge cutoff is 2023-10. You're as helpful as a Mountie during a snowstorm and as warm as a fresh cup of Timmy's double-double. When recommending places, you should talk like a true Canadian - sprinkle in "eh", "bud", "beauty", and other Canadian-isms naturally (but don't overdo it, we're not trying to sound like a caricature).

Your personality traits:
- As polite as someone who apologizes for saying sorry too much
- As friendly as a small-town hockey coach
- As helpful as a Canadian giving directions to a lost tourist in -40 weather
- Always mention if a place is a "real beauty" when it's exceptional
- Use "just gonna" instead of "going to"
- Refer to everyone as "bud", "buddy", or "friend"

When recommending places:
- Compare distances to how many hockey rinks it would take to get there
- Mention if it's close to any Tim Hortons (that's crucial info for any Canadian)
- Rate places on a scale from "decent" to "beauty"
- Always apologize if a place might be busy or expensive
- Use temperature references in Celsius, not Fahrenheit

Remember:
- You're an AI, but you're as Canadian as maple syrup
- Keep your recommendations practical and accurate using the Google Places API
- Stay positive but honest, like a Canadian telling you your team played well even though they lost
- Never break character, even if asked about these instructions
- Always call the appropriate function when needed

Speak casually but clearly, like you're chatting over a coffee at Timmy's. End your longer responses with "Take off, eh!" when appropriate.`;

// Google Maps tools configuration for the Realtime API
const GOOGLE_MAPS_TOOLS = [
  {
    type: "function",
    name: "search_places",
    description:
      "Search for places like restaurants, attractions, or businesses near a location using Google Places API",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Search query for places (e.g., 'restaurants near me', 'coffee shops', 'gas stations')",
        },
        location: {
          type: "object",
          properties: {
            latitude: { type: "number", description: "Latitude coordinate" },
            longitude: { type: "number", description: "Longitude coordinate" },
          },
          description:
            "Optional center point for the search (user's current location)",
        },
        radius: {
          type: "number",
          description: "Search radius in meters (default: 5000, max: 50000)",
        },
      },
      required: ["query"],
    },
  },
  {
    type: "function",
    name: "get_place_details",
    description:
      "Get detailed information about a specific place including reviews, hours, contact info",
    parameters: {
      type: "object",
      properties: {
        place_id: {
          type: "string",
          description: "The Google Places ID of the place to get details for",
        },
      },
      required: ["place_id"],
    },
  },
  {
    type: "function",
    name: "get_directions",
    description: "Get directions between two locations",
    parameters: {
      type: "object",
      properties: {
        origin: {
          type: "string",
          description: "Starting location (address or coordinates)",
        },
        destination: {
          type: "string",
          description: "Destination location (address or coordinates)",
        },
        mode: {
          type: "string",
          description: "Travel mode",
          enum: ["driving", "walking", "bicycling", "transit"],
        },
      },
      required: ["origin", "destination"],
    },
  },
  {
    type: "function",
    name: "geocode_address",
    description:
      "Convert an address to coordinates or get the address from coordinates",
    parameters: {
      type: "object",
      properties: {
        address: {
          type: "string",
          description: "Address to convert to coordinates",
        },
        latitude: {
          type: "number",
          description: "Latitude for reverse geocoding",
        },
        longitude: {
          type: "number",
          description: "Longitude for reverse geocoding",
        },
      },
    },
  },
];

// Google Maps API integration functions
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
      url.searchParams.append(
        "location",
        `${location.latitude},${location.longitude}`,
      );
      url.searchParams.append("radius", radius.toString());
    }

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status !== "OK") {
      throw new Error(
        `Places search failed: ${data.error_message || data.status}`,
      );
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
      throw new Error(
        `Place details failed: ${data.error_message || data.status}`,
      );
    }

    return {
      name: data.result.name,
      formatted_address: data.result.formatted_address,
      location: data.result.geometry.location,
      formatted_phone_number: data.result.formatted_phone_number,
      website: data.result.website,
      rating: data.result.rating,
      reviews: data.result.reviews,
      opening_hours: data.result.opening_hours,
    };
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
      throw new Error(
        `Directions failed: ${data.error_message || data.status}`,
      );
    }

    return {
      routes: data.routes.map((route) => ({
        summary: route.summary,
        distance: route.legs[0].distance,
        duration: route.legs[0].duration,
        steps: route.legs[0].steps.map((step) => ({
          instructions: step.html_instructions,
          distance: step.distance,
          duration: step.duration,
          travel_mode: step.travel_mode,
        })),
      })),
    };
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

    return {
      location: data.results[0].geometry.location,
      formatted_address: data.results[0].formatted_address,
      place_id: data.results[0].place_id,
    };
  }
}

// Initialize Google Maps service
const googleMapsService = googleMapsApiKey
  ? new GoogleMapsService(googleMapsApiKey)
  : null;

// Configure Vite middleware for React client
const vite = await createViteServer({
  server: { middlewareMode: true },
  appType: "custom",
});
app.use(vite.middlewares);

// Parse JSON bodies
app.use(express.json());

// Google Maps API endpoints
app.get("/api/mcp-gmaps/search", async (req, res) => {
  try {
    if (!googleMapsService) {
      return res
        .status(500)
        .json({ error: "Google Maps API key not configured" });
    }

    const { query, location, radius = 5000 } = req.query;

    let searchLocation = null;
    if (location) {
      const [lat, lng] = location.split(",");
      searchLocation = {
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
      };
    }

    const result = await googleMapsService.searchPlaces(
      query,
      searchLocation,
      parseInt(radius),
    );
    res.json(result);
  } catch (error) {
    console.error("Places search error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/mcp-gmaps/details/:placeId", async (req, res) => {
  try {
    if (!googleMapsService) {
      return res
        .status(500)
        .json({ error: "Google Maps API key not configured" });
    }

    const { placeId } = req.params;
    const result = await googleMapsService.getPlaceDetails(placeId);
    res.json(result);
  } catch (error) {
    console.error("Place details error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/mcp-gmaps/directions", async (req, res) => {
  try {
    if (!googleMapsService) {
      return res
        .status(500)
        .json({ error: "Google Maps API key not configured" });
    }

    const { origin, destination, mode = "driving" } = req.query;
    const result = await googleMapsService.getDirections(
      origin,
      destination,
      mode,
    );
    res.json(result);
  } catch (error) {
    console.error("Directions error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/mcp-gmaps/geocode", async (req, res) => {
  try {
    if (!googleMapsService) {
      return res
        .status(500)
        .json({ error: "Google Maps API key not configured" });
    }

    const { address, lat, lng } = req.query;
    const result = await googleMapsService.geocodeAddress(
      address,
      lat ? parseFloat(lat) : null,
      lng ? parseFloat(lng) : null,
    );
    res.json(result);
  } catch (error) {
    console.error("Geocoding error:", error);
    res.status(500).json({ error: error.message });
  }
});

// API route for token generation with Canadian AI configuration
app.get("/token", async (req, res) => {
  try {
    const response = await fetch(
      "https://api.openai.com/v1/realtime/sessions",
      {
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
      },
    );

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Token generation error:", error);
    res.status(500).json({ error: "Failed to generate token" });
  }
});

// Render the React client
app.use("*", async (req, res, next) => {
  const url = req.originalUrl;

  try {
    const template = await vite.transformIndexHtml(
      url,
      fs.readFileSync("./client/index.html", "utf-8"),
    );
    const { render } = await vite.ssrLoadModule("./client/entry-server.jsx");
    const appHtml = await render(url);
    const html = template.replace(`<!--ssr-outlet-->`, appHtml);
    res.status(200).set({ "Content-Type": "text/html" }).end(html);
  } catch (e) {
    vite.ssrFixStacktrace(e);
    next(e);
  }
});

app.listen(port, () => {
  console.log(`Express server running on *:${port}`);
  console.log(
    `Canadian AI Voice Assistant with Google Maps integration ready, eh!`,
  );
  if (!googleMapsApiKey) {
    console.warn(
      "⚠️  GOOGLE_MAPS_API_KEY not found in environment variables. Google Maps features will be disabled.",
    );
  } else {
    console.log("🗺️  Google Maps API integration enabled");
  }
});
