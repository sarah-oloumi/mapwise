import { useState } from "react";
import VoiceButton from "@/components/VoiceButton";
import { Search } from "lucide-react";
import Map from "@/components/Map";

const MapPage = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [lastResponse, setLastResponse] = useState<string>("");

  const handleStartRecording = () => {
    setIsRecording(true);
    // TODO: Implement voice recording with Whisper API
    console.log("Started recording...");
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    // TODO: Process recording and get AI response
    console.log("Stopped recording...");
    
    // Mock response for now
    setTimeout(() => {
      setLastResponse("The building north of you is Central Library, a historic landmark built in 1928.");
    }, 1000);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between p-4 bg-card shadow-sm">
        <h1 className="text-xl font-semibold text-foreground">Explore</h1>
        <Search className="w-6 h-6 text-muted-foreground" />
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
          <VoiceButton
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
            isRecording={isRecording}
          />
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">Ask about your surroundings</p>
            <p className="text-xs text-muted-foreground mt-1">
              "What's that building?" • "Find nearby cafes" • "What's north of me?"
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapPage;