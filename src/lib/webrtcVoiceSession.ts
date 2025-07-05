// src/lib/webrtcVoiceSession.ts
// WebRTC + ChatGPT + Location voice session logic, adapted from the demo

export type SessionState = {
  isSessionActive: boolean;
  userLocation: GeolocationPosition | null;
};

export class WebRTCVoiceSession {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private sessionActive: boolean = false;
  private ephemeralKey: string | null = null;
  private onSessionStart?: () => void;
  private onSessionStop?: () => void;
  private onError?: (err: Error) => void;

  constructor(
    onSessionStart?: () => void,
    onSessionStop?: () => void,
    onError?: (err: Error) => void
  ) {
    this.onSessionStart = onSessionStart;
    this.onSessionStop = onSessionStop;
    this.onError = onError;
  }

  public async startSession() {
    try {
      console.log("[WebRTCVoiceSession] Starting session...");
      // Get ephemeral key from server (assume endpoint exists)
      console.log(
        "[WebRTCVoiceSession] Fetching ephemeral token from /token..."
      );
      const tokenResponse = await fetch("/token");
      const data = await tokenResponse.json();
      this.ephemeralKey = data.client_secret.value;
      console.log(
        "[WebRTCVoiceSession] Received ephemeral key:",
        this.ephemeralKey ? "***" : "MISSING"
      );

      // Create peer connection
      console.log("[WebRTCVoiceSession] Creating RTCPeerConnection...");
      this.peerConnection = new RTCPeerConnection();
      this.audioElement = document.createElement("audio");
      this.audioElement.autoplay = true;
      this.peerConnection.ontrack = (e) => {
        console.log(
          "[WebRTCVoiceSession] peerConnection.ontrack called. Streams:",
          e.streams
        );
        if (this.audioElement) {
          this.audioElement.srcObject = e.streams[0];
          console.log(
            "[WebRTCVoiceSession] Audio element srcObject set to remote stream."
          );
        }
      };

      // Add local audio track (mic)
      console.log("[WebRTCVoiceSession] Getting user media (microphone)...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => {
        this.peerConnection!.addTrack(track, stream);
      });
      console.log(
        "[WebRTCVoiceSession] Microphone tracks added to peer connection."
      );

      // Data channel for signaling/events
      console.log("[WebRTCVoiceSession] Creating data channel...");
      this.dataChannel = this.peerConnection.createDataChannel("events");
      this.dataChannel.onopen = () => {
        this.sessionActive = true;
        console.log(
          "[WebRTCVoiceSession] Data channel opened, session active."
        );
        if (this.onSessionStart) this.onSessionStart();
      };
      this.dataChannel.onclose = () => {
        this.sessionActive = false;
        console.log(
          "[WebRTCVoiceSession] Data channel closed, session stopped."
        );
        if (this.onSessionStop) this.onSessionStop();
      };

      // Create offer and send to OpenAI Realtime API
      console.log("[WebRTCVoiceSession] Creating offer...");
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      console.log(
        "[WebRTCVoiceSession] Sending offer to OpenAI Realtime API..."
      );

      const sdpResponse = await fetch(
        "https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17",
        {
          method: "POST",
          body: offer.sdp,
          headers: {
            Authorization: `Bearer ${this.ephemeralKey}`,
            "Content-Type": "application/sdp",
          },
        }
      );

      console.log(
        "[WebRTCVoiceSession] sdpResponse status:",
        sdpResponse.status,
        sdpResponse.statusText
      );
      const answer = {
        type: "answer" as RTCSdpType,
        sdp: await sdpResponse.text(),
      };
      await this.peerConnection.setRemoteDescription(answer);
    } catch (err) {
      if (this.onError) this.onError(err as Error);
      else throw err;
    }
  }

  public stopSession() {
    if (this.dataChannel) {
      this.dataChannel.close();
    }
    if (this.peerConnection) {
      this.peerConnection.getSenders().forEach((sender) => {
        if (sender.track) sender.track.stop();
      });
      this.peerConnection.close();
    }
    this.sessionActive = false;
    this.dataChannel = null;
    this.peerConnection = null;
    if (this.onSessionStop) this.onSessionStop();
  }

  public isActive() {
    return this.sessionActive;
  }
}

// Utility for getting user location
export async function getUserLocation(): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position),
        () => resolve(null)
      );
    } else {
      resolve(null);
    }
  });
}
