import { useEffect, useState, useRef } from 'react';
import { sfuService } from '../services/sfu-service';
import { signalingService } from '../services/signaling';

interface UseWebRTCProps {
    roomId: string;
    isBroadcaster: boolean;
    localStream?: MediaStream | null;
    userId?: string;
}

export const useWebRTC = ({ roomId, isBroadcaster, localStream, userId }: UseWebRTCProps) => {
    const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
    const [isJoined, setIsJoined] = useState(false);
    const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const publishedTrackIds = useRef<Set<string>>(new Set());

    // Single effect: join first, then (for viewer) set callback and start polling only after join completes
    useEffect(() => {
        if (!roomId) return;
        if (isBroadcaster && !userId) return;

        let cancelled = false;

        const run = async () => {
            try {
                // Join Signaling Socket Room (for cleanup and messaging)
                signalingService.connect();
                signalingService.joinRoom(roomId, userId || 'viewer-' + Math.random().toString(36).slice(2, 7));

                console.log('[useWebRTC] Joining SFU Session:', roomId, 'as', isBroadcaster ? 'broadcaster' : 'viewer');
                setIsJoined(false);
                await sfuService.join(roomId, isBroadcaster, userId);
                if (cancelled) return;

                setIsJoined(true);
                console.log('[useWebRTC] Joined successfully');

                if (!isBroadcaster) {
                    sfuService.onStreamsUpdate((streams) => {
                        if (!cancelled) setRemoteStreams(new Map(streams));
                    });
                    setRemoteStreams(new Map(sfuService.getRemoteStreams()));

                    // Poll only after join has created recvTransport
                    const poll = async () => {
                        if (cancelled) return;
                        try {
                            await sfuService.consumeAvailableProducers(roomId);
                            if (!cancelled) {
                                const streams = sfuService.getRemoteStreams();
                                setRemoteStreams(new Map(streams));
                            }
                        } catch (err) {
                            console.error('[useWebRTC] Poll error:', err);
                        }
                    };
                    // Initial poll
                    await poll();
                    // Set up more frequent polling for better real-time updates
                    pollIntervalRef.current = setInterval(poll, 1500);
                }
            } catch (err) {
                console.error('[useWebRTC] Failed to join SFU:', err);
            }
        };

        run();

        return () => {
            cancelled = true;
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
            }
            console.log('[useWebRTC] Cleaning up SFU session...');
            sfuService.leave();
            setIsJoined(false);
            setRemoteStreams(new Map());
            publishedTrackIds.current.clear();
        };
    }, [roomId, isBroadcaster, userId]);

    // Publish tracks (broadcaster only) - now waits for isJoined
    useEffect(() => {
        if (!isBroadcaster || !localStream || !roomId || !isJoined || !userId) return;

        let cancelled = false;

        const publishTracks = async () => {
            try {
                const tracks = localStream.getTracks();
                if (tracks.length === 0) {
                    console.warn('[useWebRTC] No tracks available to publish');
                    return;
                }

                console.log(`[useWebRTC] Publishing ${tracks.length} tracks for user ${userId}`);

                for (const track of tracks) {
                    if (cancelled) return;

                    // Avoid re-producing same tracks if stream object is recreated but tracks are same
                    if (publishedTrackIds.current.has(track.id)) {
                        continue;
                    }

                    try {
                        // Detect if this is a screen share track
                        const settings = track.getSettings();
                        const isScreen = (track as any).isScreen ?? (
                            track.label.toLowerCase().includes('screen') ||
                            track.label.toLowerCase().includes('display') ||
                            track.label.toLowerCase().includes('window') ||
                            !!settings.displaySurface
                        );

                        console.log(`[useWebRTC] Producing NEW ${track.kind} track (id: ${track.id}, isScreen: ${isScreen}) for user ${userId}`);
                        await sfuService.produce(track, isScreen);
                        publishedTrackIds.current.add(track.id);
                    } catch (err) {
                        console.error(`[useWebRTC] Failed to produce ${track.kind}:`, err);
                    }
                }
            } catch (err) {
                console.error('[useWebRTC] Error in publishTracks:', err);
            }
        };

        publishTracks();

        return () => {
            cancelled = true;
        };
    }, [localStream, isBroadcaster, roomId, isJoined, userId]);

    return { remoteStreams };
};
