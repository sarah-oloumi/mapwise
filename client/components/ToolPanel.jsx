import { useEffect, useState } from "react";
import { MapPin, Navigation, Search, Info } from "react-feather";

// Example suggestions for the Canadian AI assistant
const EXAMPLE_QUERIES = [
  "Find Tim Hortons near me",
  "Show me the best poutine places around here",
  "Where's the closest hockey rink?",
  "Find some good restaurants for dinner, eh",
  "Show me directions to the CN Tower",
  "What's the weather like? Find me indoor activities",
  "Find gas stations on my route",
  "Show me tourist attractions nearby",
];

export default function ToolPanel({
  isSessionActive,
  sendTextMessage,
  events,
  userLocation,
}) {
  const [recentFunctionCalls, setRecentFunctionCalls] = useState([]);
  const [placesFound, setPlacesFound] = useState([]);

  // Track function calls and results
  useEffect(() => {
    if (!events || events.length === 0) return;

    // Look for function call events
    const functionCallEvents = events.filter(
      (event) =>
        event.type === "response.function_call_arguments.done" ||
        event.type === "conversation.item.created",
    );

    if (functionCallEvents.length > 0) {
      const latestEvent = functionCallEvents[0];

      if (latestEvent.type === "response.function_call_arguments.done") {
        const functionCall = {
          name: latestEvent.name,
          arguments: JSON.parse(latestEvent.arguments || "{}"),
          timestamp: latestEvent.timestamp,
          callId: latestEvent.call_id,
        };

        setRecentFunctionCalls((prev) => [functionCall, ...prev.slice(0, 4)]);
      }

      // Track places found in function results
      if (latestEvent.item?.content?.[0]?.type === "function_call_output") {
        try {
          const output = JSON.parse(latestEvent.item.content[0].output);
          console.log("Model output:", output);
          if (output.places && Array.isArray(output.places)) {
            setPlacesFound(output.places.slice(0, 5)); // Keep top 5 places
          }
        } catch (error) {
          // Ignore parsing errors
        }
      }
    }
  }, [events]);

  const handleExampleQuery = (query) => {
    if (isSessionActive) {
      sendTextMessage(query);
    }
  };

  const formatLocation = (location) => {
    if (!location) return "Location not available";
    return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
  };

  const getFunctionIcon = (functionName) => {
    switch (functionName) {
      case "search_places":
        return <Search size={16} className="text-blue-500" />;
      case "get_place_details":
        return <Info size={16} className="text-green-500" />;
      case "get_directions":
        return <Navigation size={16} className="text-purple-500" />;
      case "geocode_address":
        return <MapPin size={16} className="text-orange-500" />;
      default:
        return <MapPin size={16} className="text-gray-500" />;
    }
  };

  return (
    <section className="h-full w-full flex flex-col gap-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-500 to-red-600 text-white rounded-md p-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          🇨🇦 Canadian AI Places Assistant
        </h2>
        <p className="text-sm opacity-90 mt-1">
          Your friendly neighborhood guide, eh!
        </p>
      </div>

      {/* Location Status */}
      {userLocation && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <div className="flex items-center gap-2 text-blue-700">
            <MapPin size={16} />
            <span className="text-sm font-medium">Your Location</span>
          </div>
          <p className="text-xs text-blue-600 mt-1">
            📍 {formatLocation(userLocation)}
          </p>
        </div>
      )}

      {/* Session Status */}
      <div
        className={`rounded-md p-3 ${
          isSessionActive
            ? "bg-green-50 border-green-200"
            : "bg-gray-50 border-gray-200"
        } border`}
      >
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isSessionActive ? "bg-green-500" : "bg-gray-400"
            }`}
          ></div>
          <span className="text-sm font-medium">
            {isSessionActive
              ? "🎤 Ready to help, bud!"
              : "💤 Start session to chat"}
          </span>
        </div>
        {isSessionActive && (
          <p className="text-xs text-gray-600 mt-1">
            Ask me about places, directions, or anything you need!
          </p>
        )}
      </div>

      {/* Example Queries */}
      <div className="bg-gray-50 rounded-md p-4">
        <h3 className="text-sm font-bold text-gray-700 mb-3">
          💡 Try asking me:
        </h3>
        <div className="space-y-2">
          {EXAMPLE_QUERIES.map((query, index) => (
            <button
              key={index}
              onClick={() => handleExampleQuery(query)}
              disabled={!isSessionActive}
              className={`w-full text-left text-xs p-2 rounded border transition-colors ${
                isSessionActive
                  ? "bg-white hover:bg-blue-50 border-gray-200 hover:border-blue-300 text-gray-700"
                  : "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              "{query}"
            </button>
          ))}
        </div>
      </div>

      {/* Recent Function Calls */}
      {recentFunctionCalls.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-md p-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3">
            🔧 Recent Actions:
          </h3>
          <div className="space-y-2">
            {recentFunctionCalls.map((call, index) => (
              <div key={index} className="flex items-start gap-2 text-xs">
                {getFunctionIcon(call.name)}
                <div className="flex-1">
                  <div className="font-medium text-gray-700">
                    {call.name
                      .replace("_", " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                  </div>
                  <div className="text-gray-500 truncate">
                    {call.arguments.query ||
                      call.arguments.origin ||
                      call.arguments.address ||
                      "Processing..."}
                  </div>
                  <div className="text-gray-400 text-xs">{call.timestamp}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Places Found */}
      {placesFound.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-md p-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3">
            📍 Places Found:
          </h3>
          <div className="space-y-2">
            {placesFound.map((place, index) => (
              <div
                key={index}
                className="text-xs border-l-2 border-blue-300 pl-2"
              >
                <div className="font-medium text-gray-700">{place.name}</div>
                <div className="text-gray-500">{place.formatted_address}</div>
                {place.rating && (
                  <div className="text-yellow-600">⭐ {place.rating}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-xs">
        <div className="font-medium text-yellow-800 mb-1">
          🍁 Canadian Tips:
        </div>
        <ul className="text-yellow-700 space-y-1">
          <li>• I'll always mention Tim Hortons nearby, eh!</li>
          <li>• Distances in hockey rink units for fun</li>
          <li>• Temperature in Celsius, like a true Canadian</li>
          <li>• Polite recommendations with "sorry" included</li>
        </ul>
      </div>
    </section>
  );
}
