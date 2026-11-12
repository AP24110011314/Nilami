import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '../store/auth';
import { SOCKET_BASE_URL } from './env';

const SOCKET_URL = SOCKET_BASE_URL;

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = useAuthStore.getState().accessToken;

    socket = io(SOCKET_URL, {
      auth: token ? { token } : undefined,
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    // Automatically update token when auth store changes
    useAuthStore.subscribe((state, prevState) => {
      if (state.accessToken !== prevState.accessToken && socket) {
        socket.auth = state.accessToken ? { token: state.accessToken } : {};
        if (socket.connected) {
          if (state.accessToken) {
            socket.emit('auth-refresh', { token: state.accessToken });
          } else {
            // Logged out: disconnect and reconnect anonymously
            socket.disconnect().connect();
          }
        }
      }
    });
  }

  return socket;
}

