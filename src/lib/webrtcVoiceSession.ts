// WebRTC Voice Session for Canadian AI Assistant
export class WebRTCVoiceSession {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private isActive = false;

  constructor(
    private onSessionStart: () => void,
    private onSessionEnd: () => void,
    private onError: (error: Error) => void
  ) {}

  async startSession(userLocation?: { latitude: number; longitude: number }) {
    if (this.isActive) return;

    try {
      console.log('[WebRTCVoiceSession] Starting session...');
      // Get ephemeral key from server (assume endpoint exists)
      console.log('[WebRTCVoiceSession] Fetching ephemeral token from /token...');
      const tokenResponse = await fetch("/token");
      const data = await tokenResponse.json();
      this.ephemeralKey = data.client_secret.value;
      console.log('[WebRTCVoiceSession] Received ephemeral key:', this.ephemeralKey ? '***' : 'MISSING');

      // Create peer connection
      console.log('[WebRTCVoiceSession] Creating RTCPeerConnection...');
      this.peerConnection = new RTCPeerConnection();
      this.audioElement = document.createElement("audio");
      this.audioElement.autoplay = true;
      this.peerConnection.ontrack = (e) => {
        console.log('[WebRTCVoiceSession] peerConnection.ontrack called. Streams:', e.streams);
        if (this.audioElement) {
          this.audioElement.srcObject = e.streams[0];
          console.log('[WebRTCVoiceSession] Audio element srcObject set to remote stream.');
        }
      };

      // Add local audio track (mic)
      console.log('[WebRTCVoiceSession] Getting user media (microphone)...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => {
        this.peerConnection!.addTrack(track, stream);
      });
      console.log('[WebRTCVoiceSession] Microphone tracks added to peer connection.');

      // Data channel for signaling/events
      console.log('[WebRTCVoiceSession] Creating data channel...');
      this.dataChannel = this.peerConnection.createDataChannel("events");
      this.dataChannel.onopen = () => {
        this.sessionActive = true;
        console.log('[WebRTCVoiceSession] Data channel opened, session active.');
        if (this.onSessionStart) this.onSessionStart();
      };
      this.dataChannel.onclose = () => {
        this.sessionActive = false;
        console.log('[WebRTCVoiceSession] Data channel closed, session stopped.');
        if (this.onSessionStop) this.onSessionStop();
      };

      // Create offer and send to OpenAI Realtime API
      console.log('[WebRTCVoiceSession] Creating offer...');
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      console.log('[WebRTCVoiceSession] Sending offer to OpenAI Realtime API...');

            console.log(
              "🇨🇦 [GREETING] Sending greeting with location:",
              locationText
            );

            this.sendTextMessage(
              `Hey there! I'm your friendly Canadian AI assistant, eh! I can see you're located ${locationText}. I'm here to help you find great places nearby - just ask me for restaurants, Tim Hortons, attractions, or anything else you're looking for, bud!`
            );
          }, 1000);
        }
      );

      console.log('[WebRTCVoiceSession] sdpResponse status:', sdpResponse.status, sdpResponse.statusText);

      const answer = {
        type: "answer" as RTCSdpType,
        sdp: await sdpResponse.text(),
      };
      await pc.setRemoteDescription(answer);

      this.peerConnection = pc;
    } catch (error) {
      console.error("Failed to start session:", error);
      this.onError(error as Error);
    }
  }

  stopSession() {
    if (this.dataChannel) {
      this.dataChannel.close();
    }

    if (this.peerConnection) {
      this.peerConnection.getSenders().forEach((sender) => {
        if (sender.track) {
          sender.track.stop();
        }
      });
      this.peerConnection.close();
    }

    this.isActive = false;
    this.dataChannel = null;
    this.peerConnection = null;
    this.onSessionEnd();
  }

  isSessionActive(): boolean {
    return this.isActive;
  }

  private sendClientEvent(message: Record<string, any>) {
    if (this.dataChannel) {
      const timestamp = new Date().toLocaleTimeString();
      message.event_id = message.event_id || crypto.randomUUID();

      this.dataChannel.send(JSON.stringify(message));

      if (!message.timestamp) {
        message.timestamp = timestamp;
      }
    } else {
      console.error(
        "Failed to send message - no data channel available",
        message
      );
    }
  }

  private sendTextMessage(message: string) {
    const event = {
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text: message,
          },
        ],
      },
    };

    this.sendClientEvent(event);
    this.sendClientEvent({ type: "response.create" });
  }

  private async handleFunctionCall(
    functionName: string,
    functionArgs: Record<string, any>,
    callId: string,
    userLocation?: { latitude: number; longitude: number }
  ) {
    console.log("🔧 [FRONTEND] Handling function call:", functionName);
    console.log("📋 [FRONTEND] Function arguments:", functionArgs);
    console.log("🆔 [FRONTEND] Call ID:", callId);

    try {
      let result;

      switch (functionName) {
        case "search_places": {
          const { query, location, radius } = functionArgs;
          console.log("🔍 [FRONTEND] Search parameters:", {
            query,
            location,
            radius,
          });

          // Validate query parameter
          if (!query || query === "undefined") {
            console.error("❌ [FRONTEND] Invalid query parameter:", query);
            throw new Error("Search query is required and cannot be undefined");
          }

          const searchLocation = location || userLocation;
          console.log("📍 [FRONTEND] Using location:", searchLocation);

          result = await this.searchPlaces(query, searchLocation, radius);
          break;
        }

        case "get_place_details": {
          const { place_id } = functionArgs;
          result = await this.getPlaceDetails(place_id);
          break;
        }

        case "get_directions": {
          const { origin, destination, mode } = functionArgs;
          result = await this.getDirections(origin, destination, mode);
          break;
        }

        default:
          throw new Error(`Unknown function: ${functionName}`);
      }

      // Send function result back to the AI
      const functionResult = {
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: callId,
          output: JSON.stringify(result),
        },
      };

      this.sendClientEvent(functionResult);
      this.sendClientEvent({ type: "response.create" });
    } catch (error: any) {
      console.error(`Error executing function ${functionName}:`, error);

      // Send error back to the AI
      const errorResult = {
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: callId,
          output: JSON.stringify({
            error: error.message,
            message:
              "Sorry bud, I couldn't get that information right now. Maybe try again, eh?",
          }),
        },
      };

      this.sendClientEvent(errorResult);
      this.sendClientEvent({ type: "response.create" });
    }
  }

  private async searchPlaces(
    query: string,
    location: { latitude: number; longitude: number } | null = null,
    radius = 5000
  ) {
    const params = new URLSearchParams({
      query,
      radius: radius.toString(),
    });

    if (location) {
      params.append("location", `${location.latitude},${location.longitude}`);
    }

    const response = await fetch(`/api/mcp-gmaps/search?${params}`);
    if (!response.ok) {
      throw new Error(`Places search failed: ${response.statusText}`);
    }
    return response.json();
  }

  private async getPlaceDetails(placeId: string) {
    const response = await fetch(`/api/mcp-gmaps/details/${placeId}`);
    if (!response.ok) {
      throw new Error(`Place details failed: ${response.statusText}`);
    }
    return response.json();
  }

  private async getDirections(
    origin: string,
    destination: string,
    mode = "driving"
  ) {
    const params = new URLSearchParams({
      origin,
      destination,
      mode,
    });

    const response = await fetch(`/api/mcp-gmaps/directions?${params}`);
    if (!response.ok) {
      throw new Error(`Directions failed: ${response.statusText}`);
    }
    return response.json();
  }
}

// Helper function to get user location
export const getUserLocation = (): Promise<{
  latitude: number;
  longitude: number;
}> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        reject(new Error(`Geolocation error: ${error.message}`));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
};
