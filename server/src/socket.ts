import { Server, Socket } from 'socket.io';
import { cleanupPeer } from './services/mediasoup-service';

interface RoomUser {
    socketId: string;
    userId: string;
}

// Store room state: roomId -> RoomUser[]
const rooms: Record<string, RoomUser[]> = {};
// Store socket mapping: socketId -> { roomId, userId }
const socketParams: Record<string, { roomId: string; userId: string }> = {};

export const initSocket = (io: Server) => {
    io.on('connection', (socket: Socket) => {
        console.log('User connected:', socket.id);

        socket.on('join-room', (roomId: string, userId: string) => {
            console.log(`User ${userId} joining room ${roomId}`);

            socket.join(roomId);

            if (!rooms[roomId]) {
                rooms[roomId] = [];
            }
            rooms[roomId].push({ socketId: socket.id, userId });
            socketParams[socket.id] = { roomId, userId };

            // Notify others in the room
            socket.to(roomId).emit('user-connected', userId);

            // Send list of existing users to the new user
            const userIds = rooms[roomId].map(u => u.userId).filter(id => id !== userId);
            socket.emit('all-users', userIds);
        });

        socket.on('offer', (payload: { target: string; caller: string; sdp: any }) => {
            // Find the target socket
            const targetUser = Object.values(rooms).flat().find(u => u.userId === payload.target);
            if (targetUser) {
                io.to(targetUser.socketId).emit('offer', payload);
            }
        });

        socket.on('answer', (payload: { target: string; caller: string; sdp: any }) => {
            const targetUser = Object.values(rooms).flat().find(u => u.userId === payload.target);
            if (targetUser) {
                io.to(targetUser.socketId).emit('answer', payload);
            }
        });

        socket.on('ice-candidate', (payload: { target: string; candidate: any; caller: string }) => {
            const targetUser = Object.values(rooms).flat().find(u => u.userId === payload.target);
            if (targetUser) {
                io.to(targetUser.socketId).emit('ice-candidate', payload);
            }
        });

        socket.on('send-message', (payload: any) => {
            const { roomId } = socketParams[socket.id] || {};
            if (roomId) {
                // Broadcast to everyone in the room except the sender
                socket.to(roomId).emit('new-message', payload);
            }
        });

        socket.on('violation-snapshot', (payload: any) => {
            console.log('Violation received:', payload.violationType, 'for room:', payload.roomId);
            const { roomId } = payload;
            if (roomId) {
                // Broadcast to everyone in the room (proctors)
                socket.to(roomId).emit('violation-snapshot', payload);
            }
        });

        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
            const params = socketParams[socket.id];
            if (params) {
                const { roomId, userId } = params;
                if (rooms[roomId]) {
                    rooms[roomId] = rooms[roomId].filter(u => u.socketId !== socket.id);
                    if (rooms[roomId].length === 0) {
                        delete rooms[roomId];
                    }
                }

                // Cleanup MediaSoup resources
                cleanupPeer(userId);

                socket.to(roomId).emit('user-disconnected', userId);
                delete socketParams[socket.id];
            }
        });
    });
};
