import { io } from 'socket.io-client';
import dotenv from 'dotenv';

dotenv.config();

const port = process.env.PORT || 5000;
const socketUrl = `http://localhost:${port}`;

process.stdout.write(`Attempting socket connection to ${socketUrl}...\n`);

const socket = io(socketUrl, {
  transports: ['websocket', 'polling'],
  timeout: 5000,
});

socket.on('connect', () => {
  process.stdout.write(`Connected successfully (ID: ${socket.id}). Emitting ping:test...\n`);

  socket.emit('ping:test', { sentAt: Date.now() }, (ack) => {
    process.stdout.write(`Server acknowledgment received: ${JSON.stringify(ack)}\n`);
    socket.disconnect();
    process.exit(0);
  });
});

socket.on('connect_error', (error) => {
  process.stderr.write(`Socket connection error: ${error.message}\n`);
  process.exit(1);
});

setTimeout(() => {
  process.stderr.write('Timed out waiting for socket ping acknowledgment.\n');
  socket.disconnect();
  process.exit(1);
}, 6000);
