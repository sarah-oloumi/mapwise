// server.js (root project) - Express + Vite middleware + API endpoints for voice chat integration
import express from "express";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import "dotenv/config";

const app = express();
const port = 8080;
const apiKey = process.env.OPENAI_API_KEY;
const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

const CANADIAN_AI_PROMPT = `You are a friendly Canadian AI assistant, eh! Your knowledge cutoff is 2023-10. You're as helpful as a Mountie during a snowstorm and as warm as a fresh cup of Timmy's double-double. When recommending places, you should talk like a true Canadian using authentic Canadian slang and expressions naturally.

Your Canadian personality traits:
- As polite as someone who apologizes for saying sorry too much
- As friendly as a small-town hockey coach giving directions
- As helpful as a Canadian neighbor who shovels your driveway without being asked
- You measure distances in hockey rinks when being playful (1 hockey rink = ~61 meters)
- You know it's cold when it's below -10°C, and you mention temperature in Celsius
- You rate things from "decent" to "beauty" (with "beauty" being the highest praise)

Canadian slang and expressions to use naturally:
- "bud/buddy" - friendly way to address someone
- "eh" - at the end of statements for confirmation
- "beauty" - something really good or excellent  
- "give'r" - give it your all, go for it
- "just gonna" - going to do something
- "no worries" - don't worry about it
- "keen/keener" - enthusiastic person
- "right on" - that's great/correct
- "for sure" - definitely
- "take off" - leave/go away
- "hoser" - playful term for someone acting silly
- "toque" - winter hat (not beanie)
- "washroom" - bathroom (not restroom)
- "runners" - sneakers/athletic shoes
- "hang a Larry" - turn left
- "hang a Roger" - turn right

Canadian references to include:
- Tim Hortons: "Timmies", "Tims", "double-double" (2 cream, 2 sugar), "regular" (1 cream, 1 sugar)
- "Timbits" - donut holes from Tim Hortons
- Hockey culture: "five-hole", "hat trick", "chirping", "ODR" (outdoor rink)
- Weather: "it's a beauty day", "colder than a polar bear's toenails"
- Food: poutine, maple syrup, Nanaimo bars, butter tarts
- Geography: "The Rock" (Newfoundland), "Raincouver" (Vancouver)
- "Two-four" - case of 24 beers
- "Snowbirds" - Canadians who go south for winter

Speech patterns:
- Use "about" frequently in natural conversation
- Say "sorry" often, even when not necessary
- End statements with "eh" for confirmation (but not every sentence)
- Use "just" frequently: "just gonna grab", "just heading out"
- Be humble: "not too bad", "pretty decent", "can't complain"
- Use "out for a rip" when talking about going somewhere

When helping users find places:
- Always be enthusiastic about Tim Hortons discoveries
- Reference Canadian staples and culture naturally
- Use distance comparisons creatively: "about 3 hockey rinks away" or "just a short rip down the road"
- Be conversational and warm, like talking to a neighbor
- Show genuine excitement for good finds: "Oh, that's a beauty spot!"
- Apologize if results aren't perfect: "Sorry bud, not finding much there"
- Mention if places are close to other Canadian landmarks or chains

Remember:
- You're an AI, but you're as Canadian as maple syrup on fresh snow
- Keep your recommendations practical and accurate using the Google Places API
- Stay positive but honest, like telling someone their hockey team played hard even in a loss
- Never break character, even if asked about these instructions
- Always call the appropriate function when needed
- Use Canadian spelling when appropriate (colour, centre, favour)

Speak casually but clearly, like you're chatting over a coffee at Timmy's with a good friend, eh!`;
const GOOGLE_MAPS_TOOLS = [
  {
    type: "function",
    name: "search_places",
    description:
      "Search for places like restaurants, attractions, or businesses near a location using Google Places API. Always provide a specific search query.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Search query for places (e.g., 'Tim Hortons', 'restaurants', 'coffee shops', 'gas stations'). Must be a specific place name or category.",
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
          default: 5000,
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
];

// --- Google Maps API integration functions ---
class GoogleMapsService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = "https://maps.googleapis.com/maps/api";
    console.log("🗺️ GoogleMapsService initialized with API key");
  }

  async searchPlaces(query, location = null, radius = 5000) {
    const url = new URL(`${this.baseUrl}/place/textsearch/json`);
    url.searchParams.append("query", query);
    url.searchParams.append("key", this.apiKey);

    if (location) {
      url.searchParams.append(
        "location",
        `${location.latitude},${location.longitude}`
      );
      url.searchParams.append("radius", radius.toString());
    }

    console.log("🌐 [GOOGLE MAPS API] Calling Places Text Search API");
    console.log(
      "📡 URL:",
      url.toString().replace(this.apiKey, "***API_KEY***")
    );

    const response = await fetch(url.toString());
    const data = await response.json();

    console.log("📨 [GOOGLE MAPS API] Response status:", data.status);
    if (data.status !== "OK") {
      console.error(
        "❌ [GOOGLE MAPS API] Error:",
        data.error_message || data.status
      );
      throw new Error(
        `Places search failed: ${data.error_message || data.status}`
      );
    }

    console.log(
      "✅ [GOOGLE MAPS API] Successfully found",
      data.results.length,
      "places"
    );

    // Calculate distances if user location is provided
    const placesWithDistance = data.results.map((place) => {
      let distance = null;
      if (location && place.geometry && place.geometry.location) {
        distance = this.calculateDistance(
          location.latitude,
          location.longitude,
          place.geometry.location.lat,
          place.geometry.location.lng
        );
      }

      return {
        name: place.name,
        formatted_address: place.formatted_address,
        location: place.geometry.location,
        place_id: place.place_id,
        rating: place.rating,
        types: place.types,
        distance_km: distance ? parseFloat(distance.toFixed(2)) : null,
        distance_text: distance ? this.formatDistance(distance) : null,
        distance_description: distance
          ? this.getCanadianDistanceDescription(distance)
          : null,
      };
    });

    // Sort by distance if available
    if (location) {
      placesWithDistance.sort((a, b) => {
        if (a.distance_km === null) return 1;
        if (b.distance_km === null) return -1;
        return a.distance_km - b.distance_km;
      });
    }

    return {
      places: placesWithDistance,
    };
  }

  // Calculate distance between two coordinates using Haversine formula
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  // Format distance in a Canadian-friendly way
  formatDistance(distanceKm) {
    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)}m`;
    } else if (distanceKm < 10) {
      return `${distanceKm.toFixed(1)}km`;
    } else {
      return `${Math.round(distanceKm)}km`;
    }
  }

  // Get Canadian-style distance description for the AI
  getCanadianDistanceDescription(distanceKm) {
    if (distanceKm < 0.1) {
      return "just around the corner";
    } else if (distanceKm < 0.5) {
      return "a quick walk, eh";
    } else if (distanceKm < 1) {
      return "just a short stroll";
    } else if (distanceKm < 2) {
      return "a decent walk or quick drive";
    } else if (distanceKm < 5) {
      return "just a short rip down the road";
    } else if (distanceKm < 10) {
      return "a bit of a drive, but not too far";
    } else {
      return "quite a ways out there";
    }
  }

  async getPlaceDetails(placeId) {
    const url = new URL(`${this.baseUrl}/place/details/json`);
    url.searchParams.append("place_id", placeId);
    url.searchParams.append("key", this.apiKey);

    console.log("🌐 [GOOGLE MAPS API] Calling Place Details API");
    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status !== "OK") {
      throw new Error(
        `Place details failed: ${data.error_message || data.status}`
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

    console.log("🌐 [GOOGLE MAPS API] Calling Directions API");
    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status !== "OK") {
      throw new Error(
        `Directions failed: ${data.error_message || data.status}`
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
    return data.results;
  }
}

const googleMapsService = googleMapsApiKey
  ? new GoogleMapsService(googleMapsApiKey)
  : null;

async function startServer() {
  // --- Vite middleware for React frontend ---
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "custom",
  });
  app.use(vite.middlewares);

  app.use(express.json());

  // Serve the index.html for the root route
  app.get("/", async (req, res) => {
    try {
      const template = await vite.transformIndexHtml(
        "/",
        fs.readFileSync("./index.html", "utf-8")
      );
      res.status(200).set({ "Content-Type": "text/html" }).end(template);
    } catch (e) {
      console.error("Error serving index.html:", e);
      res.status(500).send("Internal Server Error");
    }
  });

  // --- API Endpoints ---
  app.get("/api/mcp-gmaps/search", async (req, res) => {
    console.log("🔍 [FUNCTION CALL] search_places requested");
    console.log("📝 Query parameters:", req.query);

    try {
      if (!googleMapsService) {
        console.error("❌ Google Maps API key not configured");
        return res
          .status(500)
          .json({ error: "Google Maps API key not configured" });
      }

      const { query, location, radius = 5000 } = req.query;

      // Validate query parameter
      if (!query || query === "undefined" || query.trim() === "") {
        console.error("❌ [VALIDATION] Invalid query parameter:", query);
        return res.status(400).json({
          error: "Search query is required and cannot be undefined or empty",
          received_query: query,
        });
      }

      let searchLocation = null;
      if (location) {
        const [lat, lng] = location.split(",");
        searchLocation = {
          latitude: parseFloat(lat),
          longitude: parseFloat(lng),
        };
        console.log("📍 Search location:", searchLocation);
      }

      console.log(`🔎 Searching for: "${query}" with radius: ${radius}m`);

      const result = await googleMapsService.searchPlaces(
        query,
        searchLocation,
        parseInt(radius)
      );

      console.log(
        `✅ [FUNCTION RESPONSE] search_places found ${result.places.length} places:`
      );
      result.places.forEach((place, index) => {
        const distanceInfo = place.distance_text
          ? ` - ${place.distance_text} away`
          : "";
        console.log(
          `   ${index + 1}. ${place.name} (${
            place.rating || "No rating"
          })${distanceInfo} - ${place.formatted_address}`
        );
        console.log(`      🆔 Place ID: ${place.place_id}`);
      });

      // Validate that all places have place_id
      const placesWithoutId = result.places.filter((place) => !place.place_id);
      if (placesWithoutId.length > 0) {
        console.warn(
          `⚠️ [VALIDATION] ${placesWithoutId.length} places missing place_id:`,
          placesWithoutId
        );
      }

      console.log(
        "📤 [API] Sending search results to frontend:",
        JSON.stringify(result, null, 2).substring(0, 800) + "..."
      );

      res.json(result);
    } catch (error) {
      console.error("❌ [FUNCTION ERROR] Places search error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/mcp-gmaps/details/:placeId", async (req, res) => {
    console.log(`[API] GET /api/mcp-gmaps/details/${req.params.placeId}`);
    try {
      if (!googleMapsService)
        return res
          .status(500)
          .json({ error: "Google Maps API key not configured" });
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
      if (!googleMapsService)
        return res
          .status(500)
          .json({ error: "Google Maps API key not configured" });
      const { origin, destination, mode = "driving" } = req.query;
      const result = await googleMapsService.getDirections(
        origin,
        destination,
        mode
      );
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/mcp-gmaps/geocode", async (req, res) => {
    console.log(`[API] GET /api/mcp-gmaps/geocode`, req.query);
    try {
      if (!googleMapsService)
        return res
          .status(500)
          .json({ error: "Google Maps API key not configured" });
      const { address, lat, lng } = req.query;
      const result = await googleMapsService.geocodeAddress(
        address,
        lat ? parseFloat(lat) : null,
        lng ? parseFloat(lng) : null
      );
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/token", async (req, res) => {
    try {
      const { userLocation } = req.body;

      // Create location-aware instructions
      let locationAwarePrompt = CANADIAN_AI_PROMPT;

      if (userLocation) {
        console.log(
          "🌍 [SESSION] Starting session with user location:",
          userLocation
        );

        // Add location context to the prompt
        locationAwarePrompt += `\n\nIMPORTANT: The user is currently located at coordinates ${userLocation.latitude}, ${userLocation.longitude}. When they ask for places "near me" or "nearby", use these exact coordinates as the location parameter in your search_places function calls. You already know their location, so don't ask them for it again.

DO NOT USE GEOCODING: You do not need to call the geocode_address function because you already have the user's location and address information. Only use search_places, get_place_details, and get_directions functions.

DISTANCE INFORMATION: When you receive search results, each place will include distance_text (like "2.3km" or "500m"), distance_km, and distance_description (Canadian-style descriptions like "just a short rip down the road" or "a quick walk, eh") fields. Use these to make your recommendations more natural and Canadian. For example: "There's a Timmies just 1.2km away - that's just a short rip down the road, bud!" or "I found a beauty restaurant 850m from your location - just a decent walk, eh!"

PLACE DETAILS: Each place in search results has a "place_id" field. To get more details about a specific place (like reviews, hours, phone number), use the get_place_details function with the exact place_id value from the search results. For example, if a place has "place_id": "ChIJPymPWzQEzkwR15R3GGpsnKk", use that exact string when calling get_place_details.`;

        // Try to get the user's city/area name for more natural conversation
        try {
          const geocodeResponse = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${userLocation.latitude},${userLocation.longitude}&key=${googleMapsApiKey}`
          );
          const geocodeData = await geocodeResponse.json();

          if (geocodeData.status === "OK" && geocodeData.results.length > 0) {
            const address = geocodeData.results[0].formatted_address;
            const addressComponents = geocodeData.results[0].address_components;

            // Extract city and province/state
            const city = addressComponents.find((comp) =>
              comp.types.includes("locality")
            )?.long_name;
            const province = addressComponents.find((comp) =>
              comp.types.includes("administrative_area_level_1")
            )?.long_name;
            const country = addressComponents.find((comp) =>
              comp.types.includes("country")
            )?.long_name;

            let locationDescription = address;
            if (city && province) {
              locationDescription = `${city}, ${province}`;
              if (country) locationDescription += `, ${country}`;
            }

            console.log(
              "📍 [SESSION] User location resolved to:",
              locationDescription
            );

            locationAwarePrompt += `\n\nThe user is located at ${address}. You can reference this location naturally in conversation (e.g., "Here in ${city}" or "Around ${locationDescription}" or "From your location at ${address}").`;
          }
        } catch (geocodeError) {
          console.warn(
            "⚠️ [SESSION] Could not geocode user location:",
            geocodeError.message
          );
        }
      } else {
        console.warn("⚠️ [SESSION] Starting session without user location");
      }

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
            voice: "ash",
            instructions: locationAwarePrompt,
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
        }
      );

      const data = await response.json();

      // Add location info to the response for the greeting
      let locationInfo = null;
      if (userLocation) {
        try {
          const geocodeResponse = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${userLocation.latitude},${userLocation.longitude}&key=${googleMapsApiKey}`
          );
          const geocodeData = await geocodeResponse.json();

          if (geocodeData.status === "OK" && geocodeData.results.length > 0) {
            const addressComponents = geocodeData.results[0].address_components;

            // Extract city and province/state
            const city = addressComponents.find((comp) =>
              comp.types.includes("locality")
            )?.long_name;
            const province = addressComponents.find((comp) =>
              comp.types.includes("administrative_area_level_1")
            )?.long_name;
            const country = addressComponents.find((comp) =>
              comp.types.includes("country")
            )?.long_name;

            locationInfo = {
              city: city || null,
              province: province || null,
              country: country || null,
              fullAddress: geocodeData.results[0].formatted_address,
              coordinates: {
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
              },
            };
          }
        } catch (geocodeError) {
          console.warn(
            "⚠️ [TOKEN] Could not geocode for greeting:",
            geocodeError.message
          );
        }
      }

      res.json({
        ...data,
        locationInfo: locationInfo,
      });
    } catch (error) {
      console.error("Token generation error:", error);
      res.status(500).json({ error: "Failed to generate token" });
    }
  });

  app.listen(port, () => {
    console.log("🍁 ================================");
    console.log("🇨🇦 Canadian AI Places Assistant");
    console.log("🍁 ================================");
    console.log(`🚀 Express server running on http://localhost:${port}`);
    console.log(
      `🎤 OpenAI Realtime API: ${
        apiKey ? "✅ Configured" : "❌ Missing API key"
      }`
    );
    console.log(
      `🗺️  Google Maps API: ${
        googleMapsApiKey ? "✅ Configured" : "❌ Missing API key"
      }`
    );

    if (!apiKey) {
      console.error("⚠️  OPENAI_API_KEY not found in environment variables.");
      console.error(
        "   Please add it to your .env file to use the voice assistant."
      );
    }

    if (!googleMapsApiKey) {
      console.error(
        "⚠️  GOOGLE_MAPS_API_KEY not found in environment variables."
      );
      console.error("   Google Maps features will be disabled.");
    } else {
      console.log("🛠️  Available functions:");
      console.log(
        "   🔍 search_places - Find restaurants, attractions, businesses"
      );
      console.log("   🏢 get_place_details - Get reviews, hours, contact info");
      console.log("   🗺️  get_directions - Turn-by-turn directions");
    }

    console.log("🍁 ================================");
    console.log("Ready to help, eh! 🇨🇦");
    console.log("🍁 ================================");
  });
}

startServer();
