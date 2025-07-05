// Types for session events
interface SessionEvent {
  timestamp: Date;
  type: string;
  direction: "incoming" | "outgoing";
  data: Record<string, unknown>;
}

interface EventLogCallback {
  (event: SessionEvent): void;
}

// WebRTC Voice Session for Canadian AI Assistant
export class WebRTCVoiceSession {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private isActive = false;
  private sessionStartTime: Date | null = null;
  private eventLog: SessionEvent[] = [];

  constructor(
    private onSessionStart: () => void,
    private onSessionEnd: () => void,
    private onError: (error: Error) => void,
    private onEventLog?: EventLogCallback
  ) {}

  async startSession(userLocation?: { latitude: number; longitude: number }) {
    if (this.isActive) return;

    try {
      this.sessionStartTime = new Date();
      this.eventLog = [];
      console.log(
        "🚀 [SESSION] Starting Canadian AI session at",
        this.sessionStartTime.toISOString()
      );

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

        // Log the event
        this.logEvent(event.type, "incoming", event);

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

  // Log session events
  private logEvent(
    type: string,
    direction: "incoming" | "outgoing",
    data: Record<string, unknown>
  ) {
    const event: SessionEvent = {
      timestamp: new Date(),
      type,
      direction,
      data,
    };

    this.eventLog.push(event);

    // Enhanced console logging
    const timeStr = event.timestamp.toLocaleTimeString();
    const directionIcon = direction === "incoming" ? "⬇️" : "⬆️";
    console.log(`${directionIcon} [${timeStr}] ${type}:`, data);

    // Call the callback if provided
    if (this.onEventLog) {
      this.onEventLog(event);
    }
  }

  // Get session statistics
  getSessionStats() {
    if (!this.sessionStartTime) return null;

    const duration = Date.now() - this.sessionStartTime.getTime();
    const eventCounts = this.eventLog.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      startTime: this.sessionStartTime,
      duration,
      totalEvents: this.eventLog.length,
      eventCounts,
      lastEvent: this.eventLog[this.eventLog.length - 1],
    };
  }

  // Get event log
  getEventLog() {
    return [...this.eventLog];
  }

  // Send text message (public method)
  sendTextMessage(message: string) {
    if (!this.isActive) {
      console.warn(
        "⚠️ [SESSION] Cannot send text message - session not active"
      );
      return;
    }

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

    this.logEvent("text_message_sent", "outgoing", { message });
    this.sendClientEvent(event);
    this.sendClientEvent({ type: "response.create" });
  }

  private sendClientEvent(message: Record<string, unknown>) {
    if (this.dataChannel) {
      const timestamp = new Date().toLocaleTimeString();
      message.event_id = message.event_id || crypto.randomUUID();

      // Log outgoing event
      this.logEvent((message.type as string) || "unknown", "outgoing", message);

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
          console.log(
            "🏢 [FRONTEND] get_place_details called with place_id:",
            place_id
          );
          console.log("🔍 [FRONTEND] place_id type:", typeof place_id);
          console.log(
            "🔍 [FRONTEND] place_id value:",
            JSON.stringify(place_id)
          );

          if (!place_id || place_id === "undefined") {
            console.error("❌ [FRONTEND] Invalid place_id:", place_id);
            throw new Error("Place ID is required and cannot be undefined");
          }

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

        case "web_search": {
          const {
            query,
            search_depth,
            include_images,
            include_answer,
            max_results,
          } = functionArgs;
          console.log("🌐 [FRONTEND] web_search called with:", {
            query,
            search_depth,
            include_images,
            include_answer,
            max_results,
          });

          if (!query || query === "undefined") {
            console.error("❌ [FRONTEND] Invalid web search query:", query);
            throw new Error(
              "Web search query is required and cannot be undefined"
            );
          }

          result = await this.webSearch(
            query as string,
            search_depth as string,
            include_images as boolean,
            include_answer as boolean,
            max_results as number
          );
          break;
        }

        case "extract_web_content": {
          const { urls } = functionArgs;
          console.log(
            "📄 [FRONTEND] extract_web_content called with URLs:",
            urls
          );

          if (!urls || !Array.isArray(urls) || urls.length === 0) {
            console.error("❌ [FRONTEND] Invalid URLs for extraction:", urls);
            throw new Error("URLs array is required and cannot be empty");
          }

          result = await this.extractWebContent(urls as string[]);
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

      console.log("📤 [FRONTEND] Sending function result to AI:");
      console.log("🔧 Function:", functionName);
      console.log("🆔 Call ID:", callId);
      console.log(
        "📊 Result preview:",
        JSON.stringify(result, null, 2).substring(0, 500) + "..."
      );

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
            error: error instanceof Error ? error.message : String(error),
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

  private async webSearch(
    query: string,
    searchDepth = "basic",
    includeImages = false,
    includeAnswer = true,
    maxResults = 5
  ) {
    const response = await fetch("/api/tavily/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        search_depth: searchDepth,
        include_images: includeImages,
        include_answer: includeAnswer,
        max_results: maxResults,
      }),
    });

    if (!response.ok) {
      throw new Error(`Web search failed: ${response.statusText}`);
    }
    return response.json();
  }

  private async extractWebContent(urls: string[]) {
    const response = await fetch("/api/tavily/extract", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        urls,
      }),
    });

    if (!response.ok) {
      throw new Error(`Web content extraction failed: ${response.statusText}`);
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
