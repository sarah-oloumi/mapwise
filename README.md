# Canadian AI Places Assistant 🇨🇦

This is a Canadian-themed voice AI assistant built on the OpenAI Realtime Console that helps you find places using Google Maps. Your friendly neighborhood AI speaks like a true Canadian and can help you discover restaurants, attractions, directions, and more - all while being as polite as a Mountie and as warm as a Tim Hortons double-double!

## Features

🍁 **Canadian Personality**: Your AI assistant speaks with authentic Canadian expressions and mannerisms
🗺️ **Google Maps Integration**: Search for places, get directions, and find details about locations
🎤 **Voice Interaction**: Real-time voice conversations using OpenAI's Realtime API
📍 **Location-Aware**: Uses your current location to provide relevant recommendations
⚡ **Real-Time**: Low-latency audio streaming for natural conversations

## Installation and Setup

Before you begin, you'll need:

1. An OpenAI API key - create one in the [OpenAI dashboard](https://platform.openai.com/api-keys)
2. A Google Maps API key - get one from the [Google Cloud Console](https://console.cloud.google.com/google/maps-apis/)

### Environment Setup

1. Clone this repository and navigate to the project directory
2. Copy the example environment file and configure your API keys:

```bash
cp .env.example .env
```

3. Edit `.env` and add your API keys:

```bash
# OpenAI API Key - Required for the Realtime API
OPENAI_API_KEY=your_actual_openai_api_key_here

# Google Maps API Key - Required for places search functionality
GOOGLE_MAPS_API_KEY=your_actual_google_maps_api_key_here

# Optional: Server port (defaults to 3000)
PORT=3000
```

### Google Maps API Setup

For the Google Maps integration to work, you need to enable these APIs in your Google Cloud Console:

1. **Places API** - For searching restaurants, attractions, etc.
2. **Geocoding API** - For converting addresses to coordinates
3. **Directions API** - For getting directions between locations

### Installation

Install dependencies for the application:

```bash
npm install
```

### Running the Application

Start the development server:

```bash
npm run dev
```

This will start the Canadian AI Places Assistant on [http://localhost:3000](http://localhost:3000).

## How to Use

1. **Start a Session**: Click "start session" to begin your conversation
2. **Grant Location Access**: Allow the app to access your location for better recommendations
3. **Talk to Your AI**: Ask your Canadian AI assistant about places, directions, or recommendations

### Example Conversations

Try asking your Canadian AI assistant:

- "Find Tim Hortons near me, eh!"
- "Show me the best poutine places around here"
- "Where's the closest hockey rink?"
- "Find some good restaurants for dinner, bud"
- "Give me directions to the CN Tower"
- "What are some tourist attractions nearby?"

## Canadian AI Personality

Your AI assistant has been programmed with authentic Canadian characteristics:

- **Polite**: Always apologetic and friendly
- **Local References**: Mentions Tim Hortons, hockey rinks, and Canadian landmarks
- **Canadian Expressions**: Uses "eh", "bud", "beauty", "just gonna", etc.
- **Metric System**: Uses Celsius for temperature and metric measurements
- **Hockey Analogies**: Compares distances to hockey rink lengths
- **Honest Reviews**: Rates places from "decent" to "beauty"

## Technical Architecture

This application extends the OpenAI Realtime Console with:

- **Canadian System Prompt**: Custom instructions for Canadian personality
- **Google Maps Integration**: Direct API calls to Google Maps services
- **Function Calling**: Real-time tool use for place searches and directions
- **WebRTC Audio**: Low-latency voice streaming
- **Location Services**: Browser geolocation for context-aware recommendations

## Available Functions

The AI assistant can use these tools:

1. **search_places**: Find restaurants, attractions, businesses
2. **get_place_details**: Get reviews, hours, contact info for specific places
3. **get_directions**: Get turn-by-turn directions between locations
4. **geocode_address**: Convert addresses to coordinates or vice versa

## Development

This application is built with:

- **Frontend**: React with Vite
- **Backend**: Express.js server
- **AI**: OpenAI Realtime API with GPT-4o
- **Maps**: Google Maps APIs
- **Styling**: Tailwind CSS

### Project Structure

```
├── client/                 # React frontend
│   ├── components/         # React components
│   └── assets/            # Static assets
├── server.js              # Express server with Canadian AI config
├── mcp-gmaps/             # Google Maps MCP server (reference)
└── README.md              # This file
```

## Troubleshooting

### Common Issues

1. **No audio**: Make sure to allow microphone access in your browser
2. **Location not working**: Grant location permissions when prompted
3. **Google Maps errors**: Verify your API key and enabled APIs
4. **Session fails**: Check your OpenAI API key and account credits

### API Key Issues

- **OpenAI**: Make sure you have credits and the key has Realtime API access
- **Google Maps**: Ensure billing is enabled and the required APIs are activated

## License

MIT License - Feel free to use this for your own Canadian AI projects, eh!

## Acknowledgments

Built on the OpenAI Realtime Console example. Special thanks to the OpenAI team for the Realtime API and to all Canadians for being so wonderfully polite and helpful! 🍁
