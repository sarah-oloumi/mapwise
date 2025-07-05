import { useState, useRef, useEffect } from "react";
import VoiceButton from "@/components/VoiceButton";
import { WebRTCVoiceSession, getUserLocation } from "@/lib/webrtcVoiceSession";
import {
  Search,
  MapPin,
  Loader2,
  Send,
  Coffee,
  Navigation,
  MapPinIcon,
} from "lucide-react";
import Map from "@/components/Map";
import SessionLogger from "@/components/SessionLogger";

const MainPage = () => {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastResponse, setLastResponse] = useState<string>("");
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [textInput, setTextInput] = useState<string>("");
  const [eventLog, setEventLog] = useState<
    Array<{
      timestamp: Date;
      type: string;
      direction: "incoming" | "outgoing";
      data: Record<string, unknown>;
    }>
  >([]);
  const [showSessionLogger, setShowSessionLogger] = useState<boolean>(false);
  const sessionRef = useRef<WebRTCVoiceSession | null>(null);

  // Get user location on component mount
  useEffect(() => {
    getUserLocation()
      .then((location) => {
        setUserLocation(location);
        console.log("📍 User location obtained:", location);
      })
      .catch((error) => {
        setLocationError(error.message);
        console.error("❌ Failed to get user location:", error);
      });
  }, []);

  const handleStartSession = async () => {
    if (sessionRef.current && sessionRef.current.isSessionActive()) return;

    if (!userLocation) {
      setLastResponse(
        "Please allow location access to use the Canadian AI assistant, eh!"
      );
      return;
    }

    setIsConnecting(true);
    sessionRef.current = new WebRTCVoiceSession(
      () => {
        setIsSessionActive(true);
        setIsConnecting(false);
      },
      () => {
        setIsSessionActive(false);
        setIsConnecting(false);
      },
      (err) => {
        setIsSessionActive(false);
        setIsConnecting(false);
        setLastResponse("Error starting voice session: " + err.message);
      },
      (event) => {
        setEventLog((prev) => [...prev, event]);
      }
    );

    try {
      await sessionRef.current.startSession(userLocation);
    } catch (error) {
      setIsConnecting(false);
      console.error("Failed to start session:", error);
    }
  };

  const handleStopSession = () => {
    if (sessionRef.current) {
      sessionRef.current.stopSession();
      setIsSessionActive(false);
      setIsConnecting(false);
    }
  };

  const handleSendText = () => {
    if (sessionRef.current && textInput.trim()) {
      sessionRef.current.sendTextMessage(textInput.trim());
      setTextInput("");
    }
  };

  const handleQuickAction = (message: string) => {
    if (sessionRef.current) {
      sessionRef.current.sendTextMessage(message);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between p-4 bg-card shadow-sm">
        <div className="flex items-center space-x-2">
          <h1 className="text-xl font-semibold text-foreground">
            Canadian AI Assistant
          </h1>
          {isConnecting && (
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
          )}
          {isSessionActive && (
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {userLocation && (
            <div className="flex items-center text-xs text-muted-foreground">
              <MapPin className="w-3 h-3 mr-1" />
              Location Ready
            </div>
          )}
          <Search className="w-6 h-6 text-muted-foreground" />
        </div>
      </header>

      {/* Map Area */}
      <div className="flex-1 relative bg-muted/30">
        <div className="absolute inset-4 bg-card rounded-xl shadow-md flex items-center justify-center overflow-hidden">
          <Map />
        </div>
      </div>

      {/* Response Card */}
      {lastResponse && (
        <div className="mx-4 mb-4 p-4 bg-card rounded-xl shadow-md border border-primary/20">
          <p className="text-sm text-foreground">{lastResponse}</p>
        </div>
      )}

      {/* Quick Actions */}
      {isSessionActive && (
        <div className="mx-4 mb-4">
          <div className="bg-card rounded-xl p-4 shadow-md border border-primary/20">
            <h3 className="text-sm font-medium text-foreground mb-3">
              Quick Actions
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleQuickAction("Find Tim Hortons nearby")}
                className="flex items-center space-x-2 p-2 bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
              >
                <Coffee className="w-4 h-4 text-primary" />
                <span className="text-sm text-foreground">Tim Hortons</span>
              </button>
              <button
                onClick={() => handleQuickAction("Show me restaurants nearby")}
                className="flex items-center space-x-2 p-2 bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
              >
                <MapPinIcon className="w-4 h-4 text-primary" />
                <span className="text-sm text-foreground">Restaurants</span>
              </button>
              <button
                onClick={() => handleQuickAction("Find gas stations nearby")}
                className="flex items-center space-x-2 p-2 bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
              >
                <Navigation className="w-4 h-4 text-primary" />
                <span className="text-sm text-foreground">Gas Stations</span>
              </button>
              <button
                onClick={() =>
                  handleQuickAction("What's interesting around here?")
                }
                className="flex items-center space-x-2 p-2 bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
              >
                <Search className="w-4 h-4 text-primary" />
                <span className="text-sm text-foreground">Explore</span>
              </button>
              <button
                onClick={() =>
                  handleQuickAction("Search the web for latest news in Canada")
                }
                className="flex items-center space-x-2 p-2 bg-blue-500/10 rounded-lg hover:bg-blue-500/20 transition-colors"
              >
                <Search className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-foreground">Web News</span>
              </button>
              <button
                onClick={() =>
                  handleQuickAction("What's the weather like today?")
                }
                className="flex items-center space-x-2 p-2 bg-green-500/10 rounded-lg hover:bg-green-500/20 transition-colors"
              >
                <MapPin className="w-4 h-4 text-green-500" />
                <span className="text-sm text-foreground">Weather</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Text Input */}
      {isSessionActive && (
        <div className="mx-4 mb-4">
          <div className="bg-card rounded-xl p-4 shadow-md border border-primary/20">
            <div className="flex space-x-2">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message here..."
                className="flex-1 px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder-muted-foreground"
              />
              <button
                onClick={handleSendText}
                disabled={!textInput.trim()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Voice Interaction */}
      <div className="p-6 bg-card border-t border-border">
        <div className="flex flex-col items-center space-y-4">
          {!userLocation ? (
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                {locationError
                  ? "Location access denied"
                  : "Getting your location..."}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Please allow location access to use the Canadian AI assistant,
                eh!
              </p>
            </div>
          ) : (
            <>
              <VoiceButton
                onStartRecording={handleStartSession}
                onStopRecording={handleStopSession}
                isRecording={isSessionActive || isConnecting}
              />
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  {isSessionActive
                    ? "Voice chat active - use text input above or speak"
                    : isConnecting
                    ? "Connecting to Canadian AI..."
                    : "Tap to start voice assistant"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isSessionActive
                    ? "Try the quick actions or type your questions"
                    : '"Find Tim Hortons nearby" • "What\'s that building?" • "Show me restaurants"'}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Session Logger */}
      <SessionLogger
        events={eventLog}
        isVisible={showSessionLogger}
        onToggle={() => setShowSessionLogger(!showSessionLogger)}
      />
    </div>
  );
};

export default MainPage;
