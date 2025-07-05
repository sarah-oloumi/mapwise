import { useState } from "react";
import { Mic, MicOff } from "lucide-react";

interface VoiceButtonProps {
  onStartRecording: () => void;
  onStopRecording: () => void;
  isRecording: boolean;
}

const VoiceButton = ({ onStartRecording, onStopRecording, isRecording }: VoiceButtonProps) => {
  const [isPressing, setIsPressing] = useState(false);

  const handleStart = () => {
    setIsPressing(true);
    onStartRecording();
  };

  const handleEnd = () => {
    setIsPressing(false);
    onStopRecording();
  };

  return (
    <div className="flex flex-col items-center space-y-2">
      <button
        onMouseDown={handleStart}
        onMouseUp={handleEnd}
        onTouchStart={handleStart}
        onTouchEnd={handleEnd}
        className={`
          w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg
          ${isRecording || isPressing
            ? "bg-destructive text-destructive-foreground scale-110 shadow-destructive/25"
            : "bg-primary text-primary-foreground hover:bg-primary-hover shadow-primary/25"
          }
        `}
      >
        {isRecording || isPressing ? (
          <MicOff className="w-6 h-6" />
        ) : (
          <Mic className="w-6 h-6" />
        )}
      </button>
      <p className="text-xs text-muted-foreground text-center">
        {isRecording ? "Release to stop" : "Hold to speak"}
      </p>
    </div>
  );
};

export default VoiceButton;