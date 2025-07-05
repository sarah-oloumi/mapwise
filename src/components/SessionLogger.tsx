import React, { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Activity,
  Clock,
  MessageSquare,
} from "lucide-react";

interface SessionEvent {
  timestamp: Date;
  type: string;
  direction: "incoming" | "outgoing";
  data: Record<string, unknown>;
}

interface SessionLoggerProps {
  events: SessionEvent[];
  isVisible: boolean;
  onToggle: () => void;
}

const SessionLogger: React.FC<SessionLoggerProps> = ({
  events,
  isVisible,
  onToggle,
}) => {
  const [expandedEvent, setExpandedEvent] = useState<number | null>(null);

  const getEventTypeColor = (type: string) => {
    if (type.includes("audio")) return "text-blue-500";
    if (type.includes("function")) return "text-green-500";
    if (type.includes("response")) return "text-purple-500";
    if (type.includes("conversation")) return "text-orange-500";
    if (type.includes("error")) return "text-red-500";
    return "text-gray-500";
  };

  const getEventIcon = (direction: string) => {
    return direction === "incoming" ? "⬇️" : "⬆️";
  };

  const formatEventData = (data: Record<string, unknown>) => {
    const filtered = Object.entries(data).reduce((acc, [key, value]) => {
      if (key !== "timestamp" && key !== "event_id" && value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, unknown>);

    return JSON.stringify(filtered, null, 2);
  };

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={onToggle}
          className="bg-primary text-primary-foreground p-3 rounded-full shadow-lg hover:bg-primary/90 transition-colors"
        >
          <Activity className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-80 max-h-96 bg-card border border-border rounded-lg shadow-xl z-50">
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center space-x-2">
          <Activity className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-medium text-foreground">Session Log</h3>
          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
            {events.length}
          </span>
        </div>
        <button
          onClick={onToggle}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      <div className="max-h-80 overflow-y-auto">
        {events.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            No session events yet
          </div>
        ) : (
          <div className="space-y-1">
            {events
              .slice(-20)
              .reverse()
              .map((event, index) => (
                <div
                  key={index}
                  className={`p-2 border-b border-border/50 cursor-pointer hover:bg-muted/50 transition-colors ${
                    expandedEvent === index ? "bg-muted/30" : ""
                  }`}
                  onClick={() =>
                    setExpandedEvent(expandedEvent === index ? null : index)
                  }
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2 flex-1">
                      <span className="text-xs">
                        {getEventIcon(event.direction)}
                      </span>
                      <span
                        className={`text-xs font-medium ${getEventTypeColor(
                          event.type
                        )}`}
                      >
                        {event.type}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {event.timestamp.toLocaleTimeString()}
                      </span>
                      {expandedEvent === index ? (
                        <ChevronUp className="w-3 h-3 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-3 h-3 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {expandedEvent === index && (
                    <div className="mt-2 p-2 bg-background rounded text-xs">
                      <pre className="text-muted-foreground whitespace-pre-wrap font-mono text-xs overflow-x-auto">
                        {formatEventData(event.data)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>

      {events.length > 0 && (
        <div className="p-3 border-t border-border bg-muted/30">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center space-x-1">
              <MessageSquare className="w-3 h-3 text-muted-foreground" />
              <span className="text-muted-foreground">
                Incoming:{" "}
                {events.filter((e) => e.direction === "incoming").length}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <MessageSquare className="w-3 h-3 text-muted-foreground" />
              <span className="text-muted-foreground">
                Outgoing:{" "}
                {events.filter((e) => e.direction === "outgoing").length}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionLogger;
