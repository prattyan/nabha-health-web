import React, { useRef, useState, useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import { createSignalingSocket } from '../../services/socketService';

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
  
  // Refs for stable access in callbacks
  const isInitiatorRef = useRef(false);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const roomReadyRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;

    let socket: Socket | undefined;
    let pc: RTCPeerConnection | undefined;

    const startCallSequence = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        pc = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        });
        peerConnectionRef.current = pc;

        // Add local tracks to peer connection
        stream.getTracks().forEach(track => pc?.addTrack(track, stream));

        // Handle remote stream
        pc.ontrack = (event) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
            setRemoteConnected(true);
          }
        };

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
          if (event.candidate && socket) {
            socket.emit('ice-candidate', { roomId, candidate: event.candidate });
          }
        };

        socket = createSignalingSocket();
        socketRef.current = socket;

        // --- Socket Event Handlers ---

        socket.on('connect', () => {
          socket?.emit('join-room', { roomId });
        });

        socket.on('room-joined', ({ isInitiator: initiator }) => {
          isInitiatorRef.current = initiator;
        });

        socket.on('room-ready', async () => {
          roomReadyRef.current = true;
          
          if (isInitiatorRef.current && pc) {
            try {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              socket?.emit('offer', { roomId, offer });
            } catch (err) {
              console.error('Error creating offer:', err);
            }
          }
        });

        socket.on('offer', async ({ offer }) => {
          if (!pc) return;
          
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket?.emit('answer', { roomId, answer });

            // Process any queued candidates
            while (pendingCandidatesRef.current.length > 0) {
              const candidate = pendingCandidatesRef.current.shift();
              if (candidate) {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
              }
            }
          } catch (err) {
            console.error('Error handling offer:', err);
          }
        });

        socket.on('answer', async ({ answer }) => {
          if (!pc) return;
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
          } catch (err) {
            console.error('Error handling answer:', err);
          }
        });

        socket.on('ice-candidate', async ({ candidate }) => {
          if (!pc) return;
          try {
            if (pc.remoteDescription) {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } else {
              // Queue candidate if remote description isn't set yet
              pendingCandidatesRef.current.push(candidate);
            }
          } catch (err) {
            console.error('Error adding ice candidate:', err);
          }
        });

        socket.on('peer-disconnected', () => {
          setRemoteConnected(false);
        });

        socket.on('connect_error', (err) => {
          console.error('Socket connection error:', err);
          setError('Failed to connect to signaling server. Please try again later.');
        });

        pc.oniceconnectionstatechange = () => {
          if (pc?.iceConnectionState === 'failed' || pc?.iceConnectionState === 'disconnected') {
            setError('Connection lost. Please try reconnecting.');
          }
        };

        // Finally, connect the socket
        socket.connect();

      } catch (err) {
        console.error('Setup error:', err);
        setError('Could not access camera/microphone');
      }
    };

    void startCallSequence();

    // Cleanup function
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      pendingCandidatesRef.current = [];
      roomReadyRef.current = false;
      isInitiatorRef.current = false;
    };
  }, [isOpen, roomId]);

  return isOpen ? (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl flex flex-col items-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Video Call Room: {roomId}</h3>
        {error && <div className="text-red-600 mb-2">{error}</div>}
        <div className="flex space-x-4 mb-4">
          <div>
            <video ref={localVideoRef} autoPlay playsInline muted className="w-64 h-48 bg-black rounded-lg transform -scale-x-100" />
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
        <div className="mt-4 text-xs text-gray-500">Signaling connected via Socket.IO</div>
      </div>
    </div>
  ) : null;
}
