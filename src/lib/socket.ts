import { io } from 'socket.io-client';
import { useStore } from '../store/useStore';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
});

socket.on('connect', () => {
  console.log('Connected to game server');
});

socket.on('balance_update', ({ userId, newBalance }) => {
  const { user, setUser } = useStore.getState();
  if (user && user.id === userId) {
    setUser({ ...user, balance: newBalance });
  }
});

socket.on('achievement_unlocked', ({ userId, achievement }) => {
  // Show achievement notification
  const notification = new Notification('Achievement Unlocked!', {
    body: achievement.title,
    icon: achievement.icon,
  });
});

socket.on('friend_request', ({ from, username }) => {
  const notification = new Notification('New Friend Request', {
    body: `${username} wants to be your friend!`,
  });
});

export const connectSocket = (userId: string) => {
  socket.auth = { userId };
  socket.connect();
};

export const disconnectSocket = () => {
  socket.disconnect();
};