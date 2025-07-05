import { useState, useRef, useEffect } from "react";
import VoiceButton from "@/components/VoiceButton";
import { WebRTCVoiceSession, getUserLocation } from "@/lib/webrtcVoiceSession";
import { Search, MapPin, Loader2 } from "lucide-react";
import Map from "@/components/Map";

const MainPage = () => {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastResponse, setLastResponse] = useState<string>("");
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
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
                    ? "Ask about your surroundings"
                    : isConnecting
                    ? "Connecting to Canadian AI..."
                    : "Tap to start voice assistant"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  "Find Tim Hortons nearby" • "What's that building?" • "Show me
                  restaurants"
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MainPage;
