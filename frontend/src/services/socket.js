import { io } from 'socket.io-client';

const socket = io('http://localhost:4004', {
  autoConnect: false, // Connect only after login
});

export default socket;