import React, { useRef, useState } from 'react';

interface VideoCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
}

export default function VideoCallModal({ isOpen, onClose, roomId }: VideoCallModalProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState('');
  const [remoteConnected, setRemoteConnected] = useState(false);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    // Connect to signaling server
    wsRef.current = new WebSocket('ws://localhost:8080');
    wsRef.current.onmessage = async (event) => {
      const { type, payload } = JSON.parse(event.data);
      if (!peerConnectionRef.current) return;
      if (type === 'offer') {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(payload));
        const answer = await peerConnectionRef.current.createAnswer();
        await peerConnectionRef.current.setLocalDescription(answer);
        wsRef.current?.send(JSON.stringify({ roomId, type: 'answer', payload: answer }));
      } else if (type === 'answer') {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(payload));
      } else if (type === 'ice') {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(payload));
      }
    };

    // Get local media
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        // Setup peer connection
        const pc = new RTCPeerConnection();
        peerConnectionRef.current = pc;
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
        pc.ontrack = (event) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
            setRemoteConnected(true);
          }
        };
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            wsRef.current?.send(JSON.stringify({ roomId, type: 'ice', payload: event.candidate }));
          }
        };
        // If first to join, create offer
        wsRef.current!.onopen = async () => {
          // Wait a moment for other peer to join
          setTimeout(async () => {
            if (pc.signalingState === 'stable') {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              wsRef.current?.send(JSON.stringify({ roomId, type: 'offer', payload: offer }));
            }
          }, 1000);
        };
      })
      .catch(() => setError('Could not access camera/microphone'));

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [isOpen, roomId]);

  return isOpen ? (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl flex flex-col items-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Video Call Room: {roomId}</h3>
        {error && <div className="text-red-600 mb-2">{error}</div>}
        <div className="flex space-x-4 mb-4">
          <div>
            <video ref={localVideoRef} autoPlay playsInline muted className="w-64 h-48 bg-black rounded-lg" />
            <div className="text-center text-xs mt-1">You</div>
          </div>
          <div>
            <video ref={remoteVideoRef} autoPlay playsInline className="w-64 h-48 bg-black rounded-lg" />
            <div className="text-center text-xs mt-1">Remote</div>
            {!remoteConnected && (
              <div className="text-center text-xs text-gray-500 mt-2">Waiting for other participant to join...</div>
            )}
          </div>
        </div>
        <div className="flex justify-end w-full space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            End Call
          </button>
        </div>
        <div className="mt-4 text-xs text-gray-500">* Demo only: Add signaling for real calls</div>
      </div>
    </div>
  ) : null;
}
