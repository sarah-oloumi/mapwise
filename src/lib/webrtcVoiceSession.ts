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
      // Get a session token for OpenAI Realtime API with location context
      const tokenResponse = await fetch("/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userLocation: userLocation,
        }),
      });
      const data = await tokenResponse.json();
      const EPHEMERAL_KEY = data.client_secret.value;

      console.log("📍 [SESSION] Location info received:", data.locationInfo);

      // Create a peer connection
      const pc = new RTCPeerConnection();

      // Set up to play remote audio from the model
      this.audioElement = document.createElement("audio");
      this.audioElement.autoplay = true;
      pc.ontrack = (e) => {
        if (this.audioElement) {
          this.audioElement.srcObject = e.streams[0];
        }
      };

      // Add local audio track for microphone input in the browser
      const ms = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      pc.addTrack(ms.getTracks()[0]);

      // Set up data channel for sending and receiving events
      const dc = pc.createDataChannel("oai-events");
      this.dataChannel = dc;

      // Handle Google Maps function calls
      this.dataChannel.addEventListener("message", (e) => {
        const event = JSON.parse(e.data);
        console.log("📨 [FRONTEND] Received event:", event.type, event);

        // Handle different types of function call events from the AI
        if (event.type === "response.function_call_arguments.done") {
          const functionName = event.name;
          const functionArgs = JSON.parse(event.arguments);
          const callId = event.call_id;

          console.log(`🤖 [AI] Function call: ${functionName}`, functionArgs);
          this.handleFunctionCall(
            functionName,
            functionArgs,
            callId,
            userLocation
          );
        }
        // Also handle the case where function calls are in conversation items
        else if (
          event.type === "conversation.item.created" &&
          event.item?.type === "function_call"
        ) {
          const functionName = event.item.name;
          const functionArgs = JSON.parse(event.item.arguments || "{}");
          const callId = event.item.call_id;

          console.log(
            `🤖 [AI] Function call via conversation item: ${functionName}`,
            functionArgs
          );
          this.handleFunctionCall(
            functionName,
            functionArgs,
            callId,
            userLocation
          );
        }
        // Handle response output items that contain function calls
        else if (
          event.type === "response.output_item.added" &&
          event.item?.type === "function_call"
        ) {
          const functionName = event.item.name;
          const functionArgs = JSON.parse(event.item.arguments || "{}");
          const callId = event.item.call_id;

          console.log(
            `🤖 [AI] Function call via output item: ${functionName}`,
            functionArgs
          );
          this.handleFunctionCall(
            functionName,
            functionArgs,
            callId,
            userLocation
          );
        }
      });

      // Set session active when the data channel is opened
      this.dataChannel.addEventListener("open", () => {
        this.isActive = true;
        this.onSessionStart();
        console.log(
          "🇨🇦 [SESSION] Canadian AI assistant is ready with location context!"
        );

        // Send a greeting message with location context
        if (userLocation && data.locationInfo) {
          setTimeout(() => {
            let locationText = "";
            if (data.locationInfo && data.locationInfo.fullAddress) {
              locationText = `at ${data.locationInfo.fullAddress}`;
            } else if (
              data.locationInfo &&
              data.locationInfo.city &&
              data.locationInfo.province
            ) {
              locationText = `in ${data.locationInfo.city}, ${data.locationInfo.province}`;
              if (
                data.locationInfo.country &&
                data.locationInfo.country !== "Canada"
              ) {
                locationText += `, ${data.locationInfo.country}`;
              }
            } else {
              locationText = `around ${userLocation.latitude.toFixed(
                4
              )}, ${userLocation.longitude.toFixed(4)}`;
            }

            console.log(
              "🇨🇦 [GREETING] Sending greeting with location:",
              locationText
            );

            this.sendTextMessage(
              `Hey there! I'm your friendly Canadian AI assistant, eh! I can see you're located ${locationText}. I'm here to help you find great places nearby - just ask me for restaurants, Tim Hortons, attractions, or anything else you're looking for, bud!`
            );
          }, 1000);
        }
      });

      // Start the session using the Session Description Protocol (SDP)
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const baseUrl = "https://api.openai.com/v1/realtime";
      const model = "gpt-4o-realtime-preview-2024-12-17";
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${EPHEMERAL_KEY}`,
          "Content-Type": "application/sdp",
        },
      });

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

  private sendClientEvent(message: Record<string, unknown>) {
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
    functionArgs: Record<string, unknown>,
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

          result = await this.searchPlaces(
            query as string,
            searchLocation as { latitude: number; longitude: number } | null,
            radius as number
          );
          break;
        }

        case "get_place_details": {
          const { place_id } = functionArgs;
          result = await this.getPlaceDetails(place_id as string);
          break;
        }

        case "get_directions": {
          const { origin, destination, mode } = functionArgs;
          result = await this.getDirections(
            origin as string,
            destination as string,
            mode as string
          );
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
    } catch (error: unknown) {
      console.error(`Error executing function ${functionName}:`, error);

      // Send error back to the AI
      const errorResult = {
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: callId,
          output: JSON.stringify({
            error: error instanceof Error ? error.message : "Unknown error",
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
