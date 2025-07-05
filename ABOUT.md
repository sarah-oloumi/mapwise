# 🗺️ Mapwise
**Mapwise** is a mobile-first web app that allows users to explore their surroundings using natural voice input. Built around the principles of Human-Computer Interaction and delightful UX, Mapwise helps users discover nearby landmarks in real time using AI.
---
## 🌟 Vision
> Let people explore the world around them simply by speaking — no typing, no scrolling, no friction.
Mapwise is designed to feel magical, intuitive, and human. Whether the user is walking, biking, or driving, they can simply press a button, ask a question like _"What is the building north of me?"_, and receive a spoken answer about nearby landmarks.
---
## 🧭 Core User Flow
1. **User opens the app.**
2. **Presses and holds a microphone button.**
3. **Speaks a location-based query** (e.g., “What’s that building north of me?”).
4. **Voice is transcribed** using OpenAI Whisper or equivalent.
5. **Intent is extracted** using GPT (e.g., direction, radius, and type of object).
6. **Device location is used** to get the current position.
7. **Nearby landmarks are fetched** via Google Maps API in the given direction.
8. **Landmark is returned and spoken aloud** via text-to-speech (TTS).
9. **Result is optionally displayed** visually in the app.
---
## 🧠 Tech Stack
| Feature                        | Technology                             |
|-------------------------------|----------------------------------------|
| Voice Transcription           | OpenAI Whisper API                     |
| Intent Extraction             | OpenAI GPT / Embedding Models          |
| Geolocation                   | Browser Geolocation API                |
| Map & POI Data                | Google Maps Places + Directions API    |
| Distance/Direction Logic      | Turf.js or Haversine formula           |
| Voice Output                  | Web Speech API or ElevenLabs           |
| Frontend Framework            | React + Tailwind (Next.js optional)    |
---
## 🎨 Visual Design Guidelines
Mapwise follows the visual style in the provided reference screenshot.
**Design Style:**
- Mobile-first layout
- Minimal, clean interface with light backgrounds
- Rounded cards with subtle shadows
- Modern, readable typography
- Consistent use of purple accent color (`#6C63FF` or similar)
- Floating action button (FAB) for mic
- Bottom tab bar with 4 sections: `Main`, `Nearby`, `News`, `Profile`
**Main Screen**
- Map with real-time location
- Live speed indicator (optional)
- Floating mic button
**Nearby Screen**
- Horizontally scrollable cards
- Filter chips (e.g., All, Top Rated, Open Now)
- Rating, distance, and share button
**News Screen**
- Cards for articles with category tags and timestamps
---
## 📱 App Structure