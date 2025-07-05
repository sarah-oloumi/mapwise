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
      // Get ephemeral key from server (assume endpoint exists)
      const tokenResponse = await fetch("/token");
      const data = await tokenResponse.json();
      this.ephemeralKey = data.client_secret.value;

      // Create peer connection
      this.peerConnection = new RTCPeerConnection();
      this.audioElement = document.createElement("audio");
      this.audioElement.autoplay = true;
      this.peerConnection.ontrack = (e) => {
        if (this.audioElement) this.audioElement.srcObject = e.streams[0];
      };

      // Add local audio track (mic)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => {
        this.peerConnection!.addTrack(track, stream);
      });

      // Data channel for signaling/events
      this.dataChannel = this.peerConnection.createDataChannel("events");
      this.dataChannel.onopen = () => {
        this.sessionActive = true;
        if (this.onSessionStart) this.onSessionStart();
      };
      this.dataChannel.onclose = () => {
        this.sessionActive = false;
        if (this.onSessionStop) this.onSessionStop();
      };

      // Create offer and send to OpenAI Realtime API
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

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
      const answer = {
        type: "answer",
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
