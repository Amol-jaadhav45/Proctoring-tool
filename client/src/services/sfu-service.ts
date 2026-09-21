import * as mediasoupClient from 'mediasoup-client';

export class SFUService {
    private device: mediasoupClient.Device;
    private sendTransport: mediasoupClient.types.Transport | null = null;
    private recvTransport: mediasoupClient.types.Transport | null = null;
    private producers: Map<string, mediasoupClient.types.Producer> = new Map();
    private consumers: Map<string, mediasoupClient.types.Consumer> = new Map();
    private remoteStreams: Map<string, MediaStream> = new Map();
    private isInitialized = false;
    private onStreamUpdate?: (streams: Map<string, MediaStream>) => void;
    private sessionId: string | null = null;
    private userId: string | null = null;

    constructor() {
        this.device = new mediasoupClient.Device();
    }

    /**
     * 1. Load Device with Router RTP Capabilities
     */
    async loadDevice(routerRtpCapabilities: mediasoupClient.types.RtpCapabilities) {
        if (!this.device.loaded) {
            await this.device.load({ routerRtpCapabilities });
        }
        this.isInitialized = true;
        console.log('[SFU] Device Loaded', this.device.rtpCapabilities);
    }

    /**
   * Main entry point: Join a session using the server API
   */
    async join(sessionId: string, isBroadcaster: boolean = true, userId?: string) {
        this.sessionId = sessionId;
        this.userId = userId || null;

        if (!this.device.loaded) {
            // 1. Get Router Capabilities for the SAME room (must match create-transport room)
            const response = await fetch(`/api/sfu/router-capabilities?roomId=${encodeURIComponent(sessionId)}`);
            const routerRtpCapabilities = await response.json();
            await this.loadDevice(routerRtpCapabilities);
        }

        // 2. Create Send Transport for broadcasters (students)
        if (isBroadcaster && !this.sendTransport) {
            await this.initSendTransport(sessionId);
        }

        // 3. Create Receive Transport for viewers (proctors)
        if (!isBroadcaster && !this.recvTransport) {
            await this.initRecvTransport(sessionId);
            // Automatically consume available producers
            await this.consumeAvailableProducers(sessionId);
        }
    }

    /**
     * Set callback for stream updates
     */
    onStreamsUpdate(callback: (streams: Map<string, MediaStream>) => void) {
        this.onStreamUpdate = callback;
    }

    /**
     * Helper to notify listeners of stream/track changes
     */
    private notifyStreamsUpdate() {
        if (this.onStreamUpdate) {
            this.onStreamUpdate(new Map(this.remoteStreams));
        }
    }

    /**
     * Closing/Leaving the session
     */
    async leave() {
        console.log('[SFU] Leaving session, cleaning up...');
        this.producers.forEach(p => p.close());
        this.producers.clear();
        this.consumers.forEach(c => c.close());
        this.consumers.clear();
        this.remoteStreams.clear();

        if (this.sendTransport) {
            this.sendTransport.close();
            this.sendTransport = null;
        }
        if (this.recvTransport) {
            this.recvTransport.close();
            this.recvTransport = null;
        }
        this.sessionId = null;
        this.userId = null;
        this.device = new mediasoupClient.Device();
        this.isInitialized = false;
    }

    /**
     * Get remote streams map
     */
    getRemoteStreams(): Map<string, MediaStream> {
        return this.remoteStreams;
    }

    /**
     * 2. Initialize Transport from Server Params
     */
    async initSendTransport(sessionId: string) {
        if (!this.isInitialized) throw new Error('Device not loaded');

        // Request Server to create a transport for us
        const response = await fetch('/api/sfu/create-transport', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ socketId: sessionId }),
        });

        if (!response.ok) throw new Error(`Failed to create transport: ${response.status}`);
        const transportData = await response.json();

        this.sendTransport = this.device.createSendTransport({
            ...transportData,
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' },
                { urls: 'stun:stun4.l.google.com:19302' }
            ]
        });

        this.sendTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
            try {
                console.log('[SFU] Connecting send transport...');
                await fetch('/api/sfu/connect-transport', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        transportId: this.sendTransport!.id,
                        dtlsParameters
                    }),
                });
                console.log('[SFU] Send transport connected');
                callback();
            } catch (error: any) {
                console.error('[SFU] Send transport connect error:', error);
                errback(error);
            }
        });

        this.sendTransport.on('produce', async ({ kind, rtpParameters, appData }, callback, errback) => {
            try {
                // console.log(`[SFU] Producing ${kind} track (isScreen: ${appData?.isScreen})...`);
                const response = await fetch('/api/sfu/produce', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        transportId: this.sendTransport!.id,
                        kind,
                        rtpParameters,
                        appData,
                        sessionId: this.sessionId,
                        userId: this.userId
                    }),
                });

                if (!response.ok) throw new Error(`Server returned ${response.status}`);

                const { id } = await response.json();
                // console.log(`[SFU] Producer created: ${id} (${kind})`);
                callback({ id });
            } catch (error: any) {
                console.error(`[SFU] Produce failed (${kind}):`, error);
                errback(error);
            }
        });

        console.log('[SFU] Send Transport Created:', this.sendTransport.id);
    }

    /**
     * Initialize Receive Transport for consuming streams (proctors)
     */
    async initRecvTransport(sessionId: string) {
        if (!this.isInitialized) throw new Error('Device not loaded');

        const response = await fetch('/api/sfu/create-transport', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ socketId: sessionId, isConsumer: true }),
        });

        if (!response.ok) throw new Error(`Failed to create recv transport: ${response.status}`);
        const transportData = await response.json();

        this.recvTransport = this.device.createRecvTransport({
            ...transportData,
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' },
                { urls: 'stun:stun4.l.google.com:19302' }
            ]
        });

        this.recvTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
            try {
                console.log('[SFU] Connecting recv transport...');
                await fetch('/api/sfu/connect-transport', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        transportId: this.recvTransport!.id,
                        dtlsParameters
                    }),
                });
                console.log('[SFU] Recv transport connected');
                callback();
            } catch (error: any) {
                console.error('[SFU] Recv transport connect error:', error);
                errback(error);
            }
        });

        console.log('[SFU] Receive Transport Created:', this.recvTransport.id);
    }

    /**
     * Get available producers and consume them. No-op if recvTransport not ready yet.
     */
    async consumeAvailableProducers(sessionId: string) {
        if (!this.recvTransport) {
            console.warn('[SFU] Receive transport not ready, skipping producer consumption');
            return;
        }
        try {
            const response = await fetch(`/api/sfu/producers?roomId=${encodeURIComponent(sessionId)}`);
            if (!response.ok) {
                console.warn('[SFU] Failed to get producers list');
                return;
            }
            const data = await response.json();
            const producers = Array.isArray(data.producers) ? data.producers : [];

            console.log(`[SFU] Found ${producers.length} producers for room ${sessionId}`);

            // Keep track of current producer IDs from the server
            const currentProducerIds = new Set(producers.map((p: any) => p.id));

            // 1. Cleanup old consumers for producers no longer present
            for (const [producerId, consumer] of this.consumers.entries()) {
                if (!currentProducerIds.has(producerId)) {
                    console.log(`[SFU] Cleaning up stale consumer for producer ${producerId}`);
                    // Trigger cleanup logic
                    const userIdForCleanup = producers.find((p: any) => p.id === producerId)?.userId;
                    this.removeConsumerTrack(producerId, consumer.track, userIdForCleanup || 'unknown');
                }
            }

            // 2. Consume new producers
            for (const producerInfo of producers) {
                // Ensure we have a valid userId, fallback to id if missing
                const targetUserId = (producerInfo.userId && producerInfo.userId !== '') ? producerInfo.userId : null;

                // If we don't have a userId yet but we have an id, we might still want to group them if we find a match
                // However, the server should always provide userId for proctoring sessions.

                if (!targetUserId) {
                    console.warn('[SFU] Producer without userId, using fallback ID:', producerInfo.id);
                }

                const finalUserId = targetUserId || producerInfo.id;

                // Check if already consuming this producer
                if (this.consumers.has(producerInfo.id)) {
                    continue;
                }

                await this.consume(producerInfo.id, producerInfo.kind, finalUserId);
            }
        } catch (error) {
            console.error('[SFU] Error consuming producers:', error);
        }
    }

    /**
     * Consume a producer's stream
     */
    async consume(producerId: string, kind: string, userId: string) {
        if (!this.recvTransport) {
            console.error('[SFU] Cannot consume: no receive transport');
            return;
        }
        if (this.consumers.has(producerId)) {
            return;
        }

        try {
            // Request server to create consumer
            const response = await fetch('/api/sfu/consume', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transportId: this.recvTransport.id,
                    producerId,
                    rtpCapabilities: this.device.rtpCapabilities
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server returned ${response.status}: ${errorText}`);
            }
            const { id, kind: trackKind, rtpParameters, appData } = await response.json();

            // Create consumer
            const consumer = await this.recvTransport.consume({
                id,
                producerId,
                kind: trackKind,
                rtpParameters,
                appData
            });

            console.log(`[SFU] Created consumer for ${trackKind} track ${producerId}. isScreen: ${appData?.isScreen}`);

            // Get or create stream for this user
            let stream = this.remoteStreams.get(userId);
            if (!stream) {
                stream = new MediaStream();
                this.remoteStreams.set(userId, stream);
                console.log(`[SFU] Created new stream for user ${userId}`);
            }

            // Add custom property to track for identification
            if (appData?.isScreen) {
                console.log(`[SFU] Identified track ${consumer.track.id} for user ${userId} as SCREEN via appData`);
                (consumer.track as any).isScreen = true;
            } else if (consumer.track.label.toLowerCase().includes('screen') || consumer.track.label.toLowerCase().includes('display')) {
                console.log(`[SFU] Identified track ${consumer.track.id} for user ${userId} as SCREEN via label: ${consumer.track.label}`);
                (consumer.track as any).isScreen = true;
            } else {
                console.log(`[SFU] Track ${consumer.track.id} for user ${userId} is camera/audio (label: ${consumer.track.label})`);
            }

            stream.addTrack(consumer.track);
            console.log(`[SFU] Added ${trackKind} track ${consumer.track.id} to user ${userId}'s stream. Total tracks: ${stream.getTracks().length}`);

            this.consumers.set(producerId, consumer);
            this.notifyStreamsUpdate(); // Ensure listeners are notified of track changes

            // Set up consumer event handlers
            consumer.on('transportclose', () => {
                console.log(`[SFU] Consumer transport closed for ${producerId}`);
                this.removeConsumerTrack(producerId, consumer.track, userId);
            });

            consumer.on('trackended', () => {
                console.log(`[SFU] Consumer track ended for ${producerId}`);
                this.removeConsumerTrack(producerId, consumer.track, userId);
            });
        } catch (error: any) {
            console.error(`[SFU] Error consuming ${kind}:`, error);
        }
    }

    private removeConsumerTrack(producerId: string, track: MediaStreamTrack, userId: string) {
        const stream = this.remoteStreams.get(userId);
        if (stream) {
            stream.removeTrack(track);
            console.log(`[SFU] Removed track from user ${userId}'s stream. Remaining tracks: ${stream.getTracks().length}`);

            // Clean up empty streams
            if (stream.getTracks().length === 0) {
                console.log(`[SFU] Stream for user ${userId} is now empty, removing it.`);
                this.remoteStreams.delete(userId);
            }
            this.notifyStreamsUpdate(); // Ensure listeners are notified
        }
        this.consumers.delete(producerId);
    }

    /**
     * 3. Publish Media Stream (key by track.id so screen + camera both get sent)
     */
    async produce(track: MediaStreamTrack, isScreen: boolean = false) {
        if (!this.sendTransport) {
            console.error('[SFU] Cannot produce: no send transport available');
            throw new Error('Transport not created');
        }

        if (!track) {
            console.error('[SFU] Cannot produce: no track provided');
            throw new Error('No track provided');
        }

        try {
            console.log(`[SFU] Starting to produce ${track.kind} track (${track.id}, label: "${track.label}", isScreen: ${isScreen}) for user ${this.userId} in room ${this.sessionId}`);

            const producer = await this.sendTransport.produce({
                track,
                appData: { isScreen }
            });

            producer.on('trackended', () => {
                console.log(`[SFU] ${track.kind} track ended for producer ${producer.id}`);
                this.producers.delete(producer.id);
            });

            producer.on('transportclose', () => {
                console.log(`[SFU] Transport closed for ${track.kind} producer ${producer.id}`);
                this.producers.delete(producer.id);
            });

            this.producers.set(producer.id, producer);
            console.log(`[SFU] Producer registered successfully: ${track.kind} (${track.label}) -> ${producer.id}`);
            return producer;
        } catch (err) {
            console.error(`[SFU] Error producing ${track.kind}:`, err);
            throw err;
        }
    }
}

export const sfuService = new SFUService();
