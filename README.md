# Mapwise

Mapwise is a web application that enables users to search for nearby places using their voice. Simply press a button, speak your query (e.g., "Find coffee shops open now"), and let the app handle the rest!

## Features
- **Voice Query:** Press a button and speak your request.
- **Speech-to-Text:** Converts your spoken query to text using OpenAI APIs.
- **Intent Extraction:** Uses OpenAI APIs to understand the intent of your query.
- **Nearby Search:** Finds relevant places nearby using the Google Maps API, and displays live results in the 'Nearby' tab (shops and restaurants are shown based on your location).
- **Text-to-Speech:** Speaks the result back to you for a hands-free experience.

## How It Works
1. **User Interaction:** Press the button and speak your query.
2. **Transcription:** The app uses OpenAI's transcription API to convert speech to text.
3. **Intent Detection:** The transcribed text is sent to OpenAI for intent extraction.
4. **Place Search:** The app queries the Google Maps API to find and present relevant nearby places.
5. **Result Feedback:** The app uses text-to-speech to read the result back to the user.

## Requirements
- Node.js & npm installed ([install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- OpenAI API Key (for transcription and intent extraction)
- Google Maps API Key (for place search)

## How to Run the App

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

Configure your API keys as needed (see `.env.example` or configuration section).
- Press the microphone button and speak your query.
- Wait for the app to process and present the results.
- Listen as the app reads the results back to you.

### Nearby Tab (Live Places)
- The Nearby tab now shows real nearby places (shops and restaurants) using the Google Places API.
- Your location is required for this feature to work. Grant location access in your browser.
- Make sure your Google Maps API key in `.env` has Places API enabled and is not restricted for localhost development.
- If you see errors or no results, check your API key restrictions and quota in the Google Cloud Console.

## License
MIT

## Development
.env.example
```
VITE_GOOGLE_MAPS_API_KEY=YOUR_API_KEY_HERE
```
---

*Powered by OpenAI and Google Maps APIs.*
