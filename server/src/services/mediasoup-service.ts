import * as mediasoup from 'mediasoup';
import { Worker, Router, WebRtcTransport, Producer, DtlsParameters, RtpCapabilities, RtpParameters, MediaKind } from 'mediasoup/node/lib/types';
import { config } from '../config/mediasoup-config';

let workers: Worker[] = [];
let nextWorkerIdx = 0;
const routerPromises = new Map<string, Promise<Router>>();
const routers = new Map<string, Router>(); // Keep this for easier access if needed, but primary is routerPromises
const transports = new Map<string, WebRtcTransport>();
const producers = new Map<string, { producer: Producer; roomId: string; userId?: string; kind: string; appData: any }>();

export const initMediasoup = async () => {
    console.log('Initializing Mediasoup workers...');
    const { numWorkers } = config.mediasoup;

    for (let i = 0; i < numWorkers; i++) {
        const worker = await mediasoup.createWorker({
            logLevel: config.mediasoup.workerSettings.logLevel,
            logTags: config.mediasoup.workerSettings.logTags,
            rtcMinPort: config.mediasoup.workerSettings.rtcMinPort,
            rtcMaxPort: config.mediasoup.workerSettings.rtcMaxPort,
        });

        worker.on('died', () => {
            console.error('mediasoup worker died, exiting in 2 seconds... [pid:%d]', worker.pid);
            setTimeout(() => process.exit(1), 2000);
        });

        workers.push(worker);
    }
};

export const getWorker = (): Worker => {
    const worker = workers[nextWorkerIdx];
    nextWorkerIdx = (nextWorkerIdx + 1) % workers.length;
    return worker;
};

export const getOrCreateRouter = async (roomId: string): Promise<Router> => {
    let routerPromise = routerPromises.get(roomId);

    if (!routerPromise) {
        console.log(`[Mediasoup] Creating new router for room ${roomId}`);
        routerPromise = (async () => {
            const worker = getWorker();
            const router = await worker.createRouter({ mediaCodecs: config.mediasoup.routerOptions.mediaCodecs });

            router.observer.on('close', () => {
                routerPromises.delete(roomId);
                routers.delete(roomId);
                console.log(`[Mediasoup] Router closed and removed for room ${roomId}`);
            });

            routers.set(roomId, router);
            return router;
        })();
        routerPromises.set(roomId, routerPromise);
    }

    return routerPromise;
};

export const createWebRtcTransport = async (router: Router) => {
    const transport = await router.createWebRtcTransport(config.mediasoup.webRtcTransportOptions);
    transports.set(transport.id, transport);
    transport.observer.on('close', () => transports.delete(transport.id));
    return transport;
};

export function getTransport(id: string): WebRtcTransport | undefined {
    return transports.get(id);
}

export async function connectTransport(transportId: string, dtlsParameters: DtlsParameters): Promise<void> {
    const transport = transports.get(transportId);
    if (!transport) throw new Error('Transport not found');
    await transport.connect({ dtlsParameters });
}

export async function createProducer(transportId: string, kind: MediaKind, rtpParameters: RtpParameters, roomId: string, userId?: string, appData: any = {}): Promise<string> {
    const transport = transports.get(transportId);
    if (!transport) throw new Error('Transport not found');

    // Pass appData to mediasoup producer
    const producer = await transport.produce({ kind, rtpParameters, appData });

    producers.set(producer.id, { producer, roomId, userId, kind, appData });
    producer.observer.on('close', () => producers.delete(producer.id));

    return producer.id;
}

export function getProducersInRoom(roomId: string): { id: string; kind: string; userId?: string; appData: any }[] {
    try {
        if (!producers) return [];

        const result = Array.from(producers.entries())
            .filter((entry) => {
                if (!entry || !entry[1]) return false;
                const producerData = entry[1];
                if (producerData.roomId !== roomId) return false;
                if (!producerData.producer || producerData.producer.closed) return false;
                return true;
            })
            .map(([id, v]) => ({
                id,
                kind: v.kind,
                userId: v.userId || `user-${id.slice(-8)}`,
                appData: v.appData || {}
            }));

        // console.log(`[Mediasoup] getProducersInRoom(${roomId}) found ${result.length} active producers`);
        return result;
    } catch (error) {
        console.error('[Mediasoup] Error in getProducersInRoom:', error);
        return [];
    }
}

export async function createConsumer(transportId: string, producerId: string, rtpCapabilities: RtpCapabilities): Promise<{ id: string; kind: string; rtpParameters: RtpParameters; appData: any } | null> {
    const transport = transports.get(transportId);
    if (!transport) throw new Error('Transport not found');

    const entry = producers.get(producerId);
    if (!entry) throw new Error('Producer not found');

    const router = routers.get(entry.roomId);
    if (!router) throw new Error('Router not found');

    const canConsume = router.canConsume({ producerId, rtpCapabilities });
    if (!canConsume) return null;

    const consumer = await transport.consume({ producerId, rtpCapabilities, paused: false });

    // Explicitly resume to ensure it's flowing
    await consumer.resume();

    return {
        id: consumer.id,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
        appData: entry.appData
    };
}


// Cleanup all resources for a specific peer (transport, producers, consumers)
export function cleanupPeer(userId: string) {
    try {
        console.log(`[Mediasoup] Cleaning up resources for peer ${userId}`);
        let cleanedProducers = 0;

        // 1. Close and remove all producers for this user
        for (const [id, producerData] of producers.entries()) {
            if (producerData.userId === userId) {
                producerData.producer.close();
                producers.delete(id);
                cleanedProducers++;
            }
        }

        console.log(`[Mediasoup] Cleaned up ${cleanedProducers} producers for ${userId}`);
    } catch (error) {
        console.error('[Mediasoup] Error cleaning up peer:', error);
    }
}
