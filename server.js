import express from "express";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import "dotenv/config";

const app = express();
const port = process.env.PORT || 3000;
const apiKey = process.env.OPENAI_API_KEY;
const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

// Canadian AI system prompt for the voice assistant
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
    console.log("🗺️ GoogleMapsService initialized with API key");
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

    console.log("🌐 [GOOGLE MAPS API] Calling Places Text Search API");
    console.log(
      "📡 URL:",
      url.toString().replace(this.apiKey, "***API_KEY***"),
    );

    const response = await fetch(url.toString());
    const data = await response.json();

    console.log("📨 [GOOGLE MAPS API] Response status:", data.status);
    if (data.status !== "OK") {
      console.error(
        "❌ [GOOGLE MAPS API] Error:",
        data.error_message || data.status,
      );
      throw new Error(
        `Places search failed: ${data.error_message || data.status}`,
      );
    }

    console.log(
      "✅ [GOOGLE MAPS API] Successfully found",
      data.results.length,
      "places",
    );

    // Calculate distances if user location is provided
    const placesWithDistance = data.results.map((place) => {
      let distance = null;
      if (location && place.geometry && place.geometry.location) {
        distance = this.calculateDistance(
          location.latitude,
          location.longitude,
          place.geometry.location.lat,
          place.geometry.location.lng,
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
    console.log(
      "📡 URL:",
      url.toString().replace(this.apiKey, "***API_KEY***"),
    );

    const response = await fetch(url.toString());
    const data = await response.json();

    console.log("📨 [GOOGLE MAPS API] Response status:", data.status);
    if (data.status !== "OK") {
      console.error(
        "❌ [GOOGLE MAPS API] Error:",
        data.error_message || data.status,
      );
      throw new Error(
        `Place details failed: ${data.error_message || data.status}`,
      );
    }

    console.log(
      "✅ [GOOGLE MAPS API] Successfully got details for:",
      data.result.name,
    );

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
    console.log(
      "📡 URL:",
      url.toString().replace(this.apiKey, "***API_KEY***"),
    );

    const response = await fetch(url.toString());
    const data = await response.json();

    console.log("📨 [GOOGLE MAPS API] Response status:", data.status);
    if (data.status !== "OK") {
      console.error(
        "❌ [GOOGLE MAPS API] Error:",
        data.error_message || data.status,
      );
      throw new Error(
        `Directions failed: ${data.error_message || data.status}`,
      );
    }

    console.log(
      "✅ [GOOGLE MAPS API] Successfully got",
      data.routes.length,
      "route(s)",
    );

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

    console.log("🌐 [GOOGLE MAPS API] Calling Geocoding API");
    console.log(
      "📡 URL:",
      url.toString().replace(this.apiKey, "***API_KEY***"),
    );

    const response = await fetch(url.toString());
    const data = await response.json();

    console.log("📨 [GOOGLE MAPS API] Response status:", data.status);
    if (data.status !== "OK") {
      console.error(
        "❌ [GOOGLE MAPS API] Error:",
        data.error_message || data.status,
      );
      throw new Error(`Geocoding failed: ${data.error_message || data.status}`);
    }

    console.log(
      "✅ [GOOGLE MAPS API] Successfully geocoded to:",
      data.results[0].formatted_address,
    );

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

// Logging middleware for Google Maps API endpoints
app.use("/api/mcp-gmaps", (req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`\n⏰ [${timestamp}] ${req.method} ${req.path}`);
  console.log(`🌍 User-Agent: ${req.get("User-Agent") || "Unknown"}`);
  console.log(`📨 Origin: ${req.get("Origin") || "Direct"}`);
  next();
});

// Google Maps API endpoints
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
      parseInt(radius),
    );

    console.log(
      `✅ [FUNCTION RESPONSE] search_places found ${result.places.length} places:`,
    );
    result.places.forEach((place, index) => {
      const distanceInfo = place.distance_text
        ? ` - ${place.distance_text} away`
        : "";
      console.log(
        `   ${index + 1}. ${place.name} (${
          place.rating || "No rating"
        })${distanceInfo} - ${place.formatted_address}`,
      );
    });

    res.json(result);
  } catch (error) {
    console.error("❌ [FUNCTION ERROR] Places search error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/mcp-gmaps/details/:placeId", async (req, res) => {
  console.log("🏢 [FUNCTION CALL] get_place_details requested");
  console.log("📝 Place ID:", req.params.placeId);

  try {
    if (!googleMapsService) {
      console.error("❌ Google Maps API key not configured");
      return res
        .status(500)
        .json({ error: "Google Maps API key not configured" });
    }

    const { placeId } = req.params;
    console.log(`🔍 Getting details for place: ${placeId}`);

    const result = await googleMapsService.getPlaceDetails(placeId);

    console.log(`✅ [FUNCTION RESPONSE] get_place_details for: ${result.name}`);
    console.log(`   📍 Address: ${result.formatted_address}`);
    console.log(`   ⭐ Rating: ${result.rating || "No rating"}`);
    console.log(`   📞 Phone: ${result.formatted_phone_number || "No phone"}`);
    console.log(`   🌐 Website: ${result.website || "No website"}`);
    if (result.opening_hours) {
      console.log(
        `   🕐 Open now: ${result.opening_hours.open_now ? "Yes" : "No"}`,
      );
    }

    res.json(result);
  } catch (error) {
    console.error("❌ [FUNCTION ERROR] Place details error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/mcp-gmaps/directions", async (req, res) => {
  console.log("🗺️ [FUNCTION CALL] get_directions requested");
  console.log("📝 Query parameters:", req.query);

  try {
    if (!googleMapsService) {
      console.error("❌ Google Maps API key not configured");
      return res
        .status(500)
        .json({ error: "Google Maps API key not configured" });
    }

    const { origin, destination, mode = "driving" } = req.query;
    console.log(
      `🚗 Getting directions from "${origin}" to "${destination}" via ${mode}`,
    );

    const result = await googleMapsService.getDirections(
      origin,
      destination,
      mode,
    );

    console.log(
      `✅ [FUNCTION RESPONSE] get_directions found ${result.routes.length} route(s):`,
    );
    result.routes.forEach((route, index) => {
      console.log(`   Route ${index + 1}: ${route.summary}`);
      console.log(`   📏 Distance: ${route.distance.text}`);
      console.log(`   ⏱️ Duration: ${route.duration.text}`);
      console.log(`   📋 Steps: ${route.steps.length} steps`);
    });

    res.json(result);
  } catch (error) {
    console.error("❌ [FUNCTION ERROR] Directions error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/mcp-gmaps/geocode", async (req, res) => {
  console.log("📍 [FUNCTION CALL] geocode_address requested");
  console.log("📝 Query parameters:", req.query);

  try {
    if (!googleMapsService) {
      console.error("❌ Google Maps API key not configured");
      return res
        .status(500)
        .json({ error: "Google Maps API key not configured" });
    }

    const { address, lat, lng } = req.query;

    // Validate that we have either address or both lat/lng
    if (!address && (!lat || !lng)) {
      console.error(
        "❌ [VALIDATION] Missing required parameters for geocoding",
      );
      return res.status(400).json({
        error:
          "Either 'address' or both 'lat' and 'lng' parameters are required",
        received_params: { address, lat, lng },
      });
    }

    if (address) {
      console.log(`🔍 Geocoding address: "${address}"`);
    } else if (lat && lng) {
      console.log(`🔍 Reverse geocoding coordinates: ${lat}, ${lng}`);
    }

    const result = await googleMapsService.geocodeAddress(
      address,
      lat ? parseFloat(lat) : null,
      lng ? parseFloat(lng) : null,
    );

    console.log(`✅ [FUNCTION RESPONSE] geocode_address result:`);
    console.log(
      `   📍 Location: ${result.location.lat}, ${result.location.lng}`,
    );
    console.log(`   📮 Address: ${result.formatted_address}`);
    console.log(`   🆔 Place ID: ${result.place_id}`);

    res.json(result);
  } catch (error) {
    console.error("❌ [FUNCTION ERROR] Geocoding error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// API route for token generation with Canadian AI configuration
app.post("/token", async (req, res) => {
  try {
    const { userLocation } = req.body;

    // Create location-aware instructions
    let locationAwarePrompt = CANADIAN_AI_PROMPT;

    if (userLocation) {
      console.log(
        "🌍 [SESSION] Starting session with user location:",
        userLocation,
      );

      // Add location context to the prompt
      locationAwarePrompt += `\n\nIMPORTANT: The user is currently located at coordinates ${userLocation.latitude}, ${userLocation.longitude}. When they ask for places "near me" or "nearby", use these exact coordinates as the location parameter in your search_places function calls. You already know their location, so don't ask them for it again.

DO NOT USE GEOCODING: You do not need to call the geocode_address function because you already have the user's location and address information. Only use search_places, get_place_details, and get_directions functions.

DISTANCE INFORMATION: When you receive search results, each place will include distance_text (like "2.3km" or "500m"), distance_km, and distance_description (Canadian-style descriptions like "just a short rip down the road" or "a quick walk, eh") fields. Use these to make your recommendations more natural and Canadian. For example: "There's a Timmies just 1.2km away - that's just a short rip down the road, bud!" or "I found a beauty restaurant 850m from your location - just a decent walk, eh!"`;

      // Try to get the user's city/area name for more natural conversation
      try {
        const geocodeResponse = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${userLocation.latitude},${userLocation.longitude}&key=${googleMapsApiKey}`,
        );
        const geocodeData = await geocodeResponse.json();

        if (geocodeData.status === "OK" && geocodeData.results.length > 0) {
          const address = geocodeData.results[0].formatted_address;
          const addressComponents = geocodeData.results[0].address_components;

          // Extract city and province/state
          const city = addressComponents.find((comp) =>
            comp.types.includes("locality"),
          )?.long_name;
          const province = addressComponents.find((comp) =>
            comp.types.includes("administrative_area_level_1"),
          )?.long_name;
          const country = addressComponents.find((comp) =>
            comp.types.includes("country"),
          )?.long_name;

          let locationDescription = address;
          if (city && province) {
            locationDescription = `${city}, ${province}`;
            if (country) locationDescription += `, ${country}`;
          }

          console.log(
            "📍 [SESSION] User location resolved to:",
            locationDescription,
          );

          locationAwarePrompt += `\n\nThe user is located at ${address}. You can reference this location naturally in conversation (e.g., "Here in ${city}" or "Around ${locationDescription}" or "From your location at ${address}").`;
        }
      } catch (geocodeError) {
        console.warn(
          "⚠️ [SESSION] Could not geocode user location:",
          geocodeError.message,
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
      },
    );

    const data = await response.json();

    // Add location info to the response for the greeting
    let locationInfo = null;
    if (userLocation) {
      try {
        const geocodeResponse = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${userLocation.latitude},${userLocation.longitude}&key=${googleMapsApiKey}`,
        );
        const geocodeData = await geocodeResponse.json();

        if (geocodeData.status === "OK" && geocodeData.results.length > 0) {
          const addressComponents = geocodeData.results[0].address_components;

          // Extract city and province/state
          const city = addressComponents.find((comp) =>
            comp.types.includes("locality"),
          )?.long_name;
          const province = addressComponents.find((comp) =>
            comp.types.includes("administrative_area_level_1"),
          )?.long_name;
          const country = addressComponents.find((comp) =>
            comp.types.includes("country"),
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
          geocodeError.message,
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
  console.log("🍁 ================================");
  console.log("🇨🇦 Canadian AI Places Assistant");
  console.log("🍁 ================================");
  console.log(`🚀 Express server running on http://localhost:${port}`);
  console.log(
    `🎤 OpenAI Realtime API: ${
      apiKey ? "✅ Configured" : "❌ Missing API key"
    }`,
  );
  console.log(
    `🗺️  Google Maps API: ${
      googleMapsApiKey ? "✅ Configured" : "❌ Missing API key"
    }`,
  );

  if (!apiKey) {
    console.error("⚠️  OPENAI_API_KEY not found in environment variables.");
    console.error(
      "   Please add it to your .env file to use the voice assistant.",
    );
  }

  if (!googleMapsApiKey) {
    console.error(
      "⚠️  GOOGLE_MAPS_API_KEY not found in environment variables.",
    );
    console.error("   Google Maps features will be disabled.");
    console.error("   Please add it to your .env file and enable these APIs:");
    console.error("   - Places API");
    console.error("   - Geocoding API");
    console.error("   - Directions API");
  } else {
    console.log("🛠️  Available functions:");
    console.log(
      "   🔍 search_places - Find restaurants, attractions, businesses",
    );
    console.log("   🏢 get_place_details - Get reviews, hours, contact info");
    console.log("   🗺️  get_directions - Turn-by-turn directions");
    console.log("   📍 geocode_address - Address to coordinates conversion");
  }

  console.log("🍁 ================================");
  console.log("Ready to help, eh! 🇨🇦");
  console.log("🍁 ================================");
});
