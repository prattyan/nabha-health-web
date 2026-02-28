import { io, type Socket } from 'socket.io-client';
import { ApiClient } from './apiClient';

// Use same base URL as API
const getBaseUrl = () => {
    const envBase = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined;
    return envBase || window.location.origin;
};

export const createSignalingSocket = (): Socket => {
  const token = ApiClient.getInstance().getAccessToken();
  return io(getBaseUrl(), {
    autoConnect: false,
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    auth: {
      token
    }
  });
};
