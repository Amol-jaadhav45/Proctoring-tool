import { io, Socket } from 'socket.io-client';

class SignalingService {
    private socket: Socket | null = null;
    private url: string;

    constructor() {
        // Default to same-origin signaling unless overridden
        // (works for both dev proxy setups and production where server hosts the SPA).
        this.url =
            (import.meta.env.VITE_SIGNALING_URL as string | undefined) ||
            (typeof window !== 'undefined' ? window.location.origin : '');
    }

    connect(url?: string) {
        if (this.socket?.connected) return;

        this.url = url || this.url;
        if (!this.url) {
            throw new Error(
                'Signaling URL is not set. Set VITE_SIGNALING_URL or run from a browser origin.'
            );
        }
        this.socket = io(this.url);

        this.socket.on('connect', () => {
            console.log('Connected to signaling server:', this.socket?.id);
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from signaling server');
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    joinRoom(roomId: string, userId: string) {
        this.socket?.emit('join-room', roomId, userId);
    }

    onUserConnected(callback: (userId: string) => void) {
        this.socket?.on('user-connected', callback);
    }

    onAllUsers(callback: (userIds: string[]) => void) {
        this.socket?.on('all-users', callback);
    }

    onUserDisconnected(callback: (userId: string) => void) {
        this.socket?.on('user-disconnected', callback);
    }

    // WebRTC Signaling
    sendOffer(payload: { target: string; caller: string; sdp: any }) {
        this.socket?.emit('offer', payload);
    }

    onOffer(callback: (payload: { target: string; caller: string; sdp: any }) => void) {
        this.socket?.on('offer', callback);
    }

    sendAnswer(payload: { target: string; caller: string; sdp: any }) {
        this.socket?.emit('answer', payload);
    }

    onAnswer(callback: (payload: { target: string; caller: string; sdp: any }) => void) {
        this.socket?.on('answer', callback);
    }

    sendIceCandidate(payload: { target: string; candidate: any; caller: string }) {
        this.socket?.emit('ice-candidate', payload);
    }

    onIceCandidate(callback: (payload: { target: string; candidate: any; caller: string }) => void) {
        this.socket?.on('ice-candidate', callback);
    }

    // Violations & Messages
    sendViolation(payload: any) {
        this.socket?.emit('violation-snapshot', payload);
    }

    onViolationSnapshot(callback: (payload: any) => void) {
        this.socket?.on('violation-snapshot', callback);
    }
}

export const signalingService = new SignalingService();
