import { useEffect, useRef, useState } from "react";
import logo from "/assets/openai-logomark.svg";
import EventLog from "./EventLog";
import SessionControls from "./SessionControls";
import ToolPanel from "./ToolPanel";

// Google Maps MCP integration service
class GoogleMapsMCPService {
  constructor() {
    this.baseUrl = "/api/mcp-gmaps";
  }

  async searchPlaces(query, location = null, radius = 5000) {
    const params = new URLSearchParams({
      query,
      radius: radius.toString(),
    });

    if (location) {
      params.append("location", `${location.latitude},${location.longitude}`);
    }

    const response = await fetch(`${this.baseUrl}/search?${params}`);
    if (!response.ok) {
      throw new Error(`Places search failed: ${response.statusText}`);
    }
    return response.json();
  }

  async getPlaceDetails(placeId) {
    const response = await fetch(`${this.baseUrl}/details/${placeId}`);
    if (!response.ok) {
      throw new Error(`Place details failed: ${response.statusText}`);
    }
    return response.json();
  }

  async getDirections(origin, destination, mode = "driving") {
    const params = new URLSearchParams({
      origin,
      destination,
      mode,
    });

    const response = await fetch(`${this.baseUrl}/directions?${params}`);
    if (!response.ok) {
      throw new Error(`Directions failed: ${response.statusText}`);
    }
    return response.json();
  }

  async geocodeAddress(address = null, latitude = null, longitude = null) {
    const params = new URLSearchParams();

    if (address) {
      params.append("address", address);
    } else if (latitude && longitude) {
      params.append("lat", latitude.toString());
      params.append("lng", longitude.toString());
    }

    const response = await fetch(`${this.baseUrl}/geocode?${params}`);
    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.statusText}`);
    }
    return response.json();
  }
}

export default function App() {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [events, setEvents] = useState([]);
  const [dataChannel, setDataChannel] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locationInfo, setLocationInfo] = useState(null);
  const peerConnection = useRef(null);
  const audioElement = useRef(null);
  const mapsService = useRef(new GoogleMapsMCPService());

  // Get user's location on component mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          console.log("User location obtained:", position.coords);
        },
        (error) => {
          console.warn("Could not get user location:", error);
        },
      );
    }
  }, []);

  async function startSession() {
    // Ensure we have user location before starting session
    if (!userLocation) {
      console.log("⏳ Waiting for user location...");
      alert(
        "Please allow location access to use the Canadian AI assistant, eh!",
      );
      return;
    }

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

    // Store the resolved location info for the greeting
    setLocationInfo(data.locationInfo);
    console.log("📍 [SESSION] Location info received:", data.locationInfo);

    // Create a peer connection
    const pc = new RTCPeerConnection();

    // Set up to play remote audio from the model
    audioElement.current = document.createElement("audio");
    audioElement.current.autoplay = true;
    pc.ontrack = (e) => (audioElement.current.srcObject = e.streams[0]);

    // Add local audio track for microphone input in the browser
    const ms = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });
    pc.addTrack(ms.getTracks()[0]);

    // Set up data channel for sending and receiving events
    const dc = pc.createDataChannel("oai-events");
    setDataChannel(dc);

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
      type: "answer",
      sdp: await sdpResponse.text(),
    };
    await pc.setRemoteDescription(answer);

    peerConnection.current = pc;
  }

  // Stop current session, clean up peer connection and data channel
  function stopSession() {
    if (dataChannel) {
      dataChannel.close();
    }

    peerConnection.current.getSenders().forEach((sender) => {
      if (sender.track) {
        sender.track.stop();
      }
    });

    if (peerConnection.current) {
      peerConnection.current.close();
    }

    setIsSessionActive(false);
    setDataChannel(null);
    peerConnection.current = null;
  }

  // Handle Google Maps function calls
  async function handleFunctionCall(functionName, functionArgs, callId) {
    console.log("🔧 [FRONTEND] Handling function call:", functionName);
    console.log("📋 [FRONTEND] Function arguments:", functionArgs);
    console.log("🆔 [FRONTEND] Call ID:", callId);

    try {
      let result;

      switch (functionName) {
        case "search_places":
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

          result = await mapsService.current.searchPlaces(
            query,
            searchLocation,
            radius,
          );
          break;

        case "get_place_details":
          const { place_id } = functionArgs;
          result = await mapsService.current.getPlaceDetails(place_id);
          break;

        case "get_directions":
          const { origin, destination, mode } = functionArgs;
          result = await mapsService.current.getDirections(
            origin,
            destination,
            mode,
          );
          break;

        case "geocode_address":
          const { address, latitude, longitude } = functionArgs;
          result = await mapsService.current.geocodeAddress(
            address,
            latitude,
            longitude,
          );
          break;

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

      sendClientEvent(functionResult);

      // Request a new response from the AI
      sendClientEvent({ type: "response.create" });
    } catch (error) {
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

      sendClientEvent(errorResult);
      sendClientEvent({ type: "response.create" });
    }
  }

  // Send a message to the model
  function sendClientEvent(message) {
    if (dataChannel) {
      const timestamp = new Date().toLocaleTimeString();
      message.event_id = message.event_id || crypto.randomUUID();

      // send event before setting timestamp since the backend peer doesn't expect this field
      dataChannel.send(JSON.stringify(message));

      // if guard just in case the timestamp exists by miracle
      if (!message.timestamp) {
        message.timestamp = timestamp;
      }
      setEvents((prev) => [message, ...prev]);
    } else {
      console.error(
        "Failed to send message - no data channel available",
        message,
      );
    }
  }

  // Send a text message to the model
  function sendTextMessage(message) {
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

    sendClientEvent(event);
    sendClientEvent({ type: "response.create" });
  }

  // Attach event listeners to the data channel when a new one is created
  useEffect(() => {
    if (dataChannel) {
      // Append new server events to the list
      dataChannel.addEventListener("message", (e) => {
        const event = JSON.parse(e.data);
        if (!event.timestamp) {
          event.timestamp = new Date().toLocaleTimeString();
        }

        // Log all events for debugging
        console.log("📨 [FRONTEND] Received event:", event.type, event);

        // Handle different types of function call events from the AI
        if (event.type === "response.function_call_arguments.done") {
          const functionName = event.name;
          const functionArgs = JSON.parse(event.arguments);
          const callId = event.call_id;

          console.log(`🤖 [AI] Function call: ${functionName}`, functionArgs);
          handleFunctionCall(functionName, functionArgs, callId);
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
            functionArgs,
          );
          handleFunctionCall(functionName, functionArgs, callId);
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
            functionArgs,
          );
          handleFunctionCall(functionName, functionArgs, callId);
        }

        setEvents((prev) => [event, ...prev]);
      });

      // Set session active when the data channel is opened
      dataChannel.addEventListener("open", () => {
        setIsSessionActive(true);
        setEvents([]);
        console.log(
          "🇨🇦 [SESSION] Canadian AI assistant is ready with location context!",
        );

        // Send a greeting message with location context
        if (userLocation) {
          setTimeout(() => {
            let locationText = "";
            if (locationInfo && locationInfo.fullAddress) {
              locationText = `at ${locationInfo.fullAddress}`;
            } else if (
              locationInfo &&
              locationInfo.city &&
              locationInfo.province
            ) {
              locationText = `in ${locationInfo.city}, ${locationInfo.province}`;
              if (locationInfo.country && locationInfo.country !== "Canada") {
                locationText += `, ${locationInfo.country}`;
              }
            } else {
              locationText = `around ${userLocation.latitude.toFixed(
                4,
              )}, ${userLocation.longitude.toFixed(4)}`;
            }

            console.log(
              "🇨🇦 [GREETING] Sending greeting with location:",
              locationText,
            );

            sendTextMessage(
              `Hey there! I'm your friendly Canadian AI assistant, eh! I can see you're located ${locationText}. I'm here to help you find great places nearby - just ask me for restaurants, Tim Hortons, attractions, or anything else you're looking for, bud!`,
            );
          }, 1000);
        }
      });
    }
  }, [dataChannel, userLocation, locationInfo]);

  return (
    <>
      <nav className="absolute top-0 left-0 right-0 h-16 flex items-center">
        <div className="flex items-center gap-4 w-full m-4 pb-2 border-0 border-b border-solid border-gray-200">
          <img style={{ width: "24px" }} src={logo} />
          <h1>Canadian AI Places Assistant 🇨🇦</h1>
          {userLocation && (
            <span className="text-sm text-gray-500">
              📍 Location: {userLocation.latitude.toFixed(4)},{" "}
              {userLocation.longitude.toFixed(4)}
            </span>
          )}
        </div>
      </nav>
      <main className="absolute top-16 left-0 right-0 bottom-0">
        <section className="absolute top-0 left-0 right-[380px] bottom-0 flex">
          <section className="absolute top-0 left-0 right-0 bottom-32 px-4 overflow-y-auto">
            <EventLog events={events} />
          </section>
          <section className="absolute h-32 left-0 right-0 bottom-0 p-4">
            <SessionControls
              startSession={startSession}
              stopSession={stopSession}
              sendClientEvent={sendClientEvent}
              sendTextMessage={sendTextMessage}
              events={events}
              isSessionActive={isSessionActive}
              userLocation={userLocation}
            />
          </section>
        </section>
        <section className="absolute top-0 w-[380px] right-0 bottom-0 p-4 pt-0 overflow-y-auto">
          <ToolPanel
            sendClientEvent={sendClientEvent}
            sendTextMessage={sendTextMessage}
            events={events}
            isSessionActive={isSessionActive}
            userLocation={userLocation}
          />
        </section>
      </main>
    </>
  );
}
