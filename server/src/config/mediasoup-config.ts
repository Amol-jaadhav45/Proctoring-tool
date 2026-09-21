import { RtpCodecCapability, TransportListenInfo, WorkerLogTag } from 'mediasoup/node/lib/types';
import * as os from 'os';

const numCpus = (() => {
    try {
        return os.cpus?.()?.length ?? 1;
    } catch {
        return 1;
    }
})();

// Helper to find local IP
const getLocalIp = () => {
    const interfaces = os.networkInterfaces();
    let selectedIp = '127.0.0.1';

    // Priority: 1. e* (eth/en), 2. w* (wlan/wifi), 3. any non-internal IPv4
    const candidates: { ip: string, name: string, priority: number }[] = [];

    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]!) {
            // Skip internal and non-ipv4
            if (iface.family !== 'IPv4' || iface.internal) continue;

            // Skip docker/virtual interfaces causing black screen issues
            if (name.includes('docker') || name.includes('veth') || name.includes('br-')) continue;

            let priority = 3;
            if (name.startsWith('e')) priority = 1; // eth0, en0
            else if (name.startsWith('w')) priority = 2; // wlan0, wi-fi

            candidates.push({ ip: iface.address, name, priority });
        }
    }

    if (candidates.length > 0) {
        // Sort by priority (asc)
        candidates.sort((a, b) => a.priority - b.priority);
        selectedIp = candidates[0].ip;
        console.log(`[mediasoup] Auto-detected announced IP: ${selectedIp} (interface: ${candidates[0].name})`);
    } else {
        console.warn('[mediasoup] Could not auto-detect LAN IP. Using 127.0.0.1. Set MEDIASOUP_ANNOUNCED_IP if remote access fails.');
    }

    return selectedIp;
};

export const config = {
    domain: process.env.DOMAIN || 'localhost',
    https: {
        listenIp: '0.0.0.0',
        listenPort: process.env.PROTOO_LISTEN_PORT || 4443,
        tls: {
            cert: process.env.HTTPS_CERT_FULLCHAIN || '',
            key: process.env.HTTPS_CERT_PRIVKEY || '',
        },
    },
    mediasoup: {
        numWorkers: numCpus,
        // mediasoup Worker settings.
        workerSettings: {
            logLevel: 'warn' as 'debug' | 'warn' | 'error' | 'none',
            logTags: [
                'info',
                'ice',
                'dtls',
                'rtp',
                'srtp',
                'rtcp',
            ] as WorkerLogTag[],
            rtcMinPort: Number(process.env.MEDIASOUP_MIN_PORT) || 10000,
            rtcMaxPort: Number(process.env.MEDIASOUP_MAX_PORT) || 10100,
        },
        // mediasoup Router settings.
        routerOptions: {
            mediaCodecs: [
                {
                    kind: 'audio',
                    mimeType: 'audio/opus',
                    clockRate: 48000,
                    channels: 2,
                },
                {
                    kind: 'video',
                    mimeType: 'video/VP8',
                    clockRate: 90000,
                    parameters: {
                        'x-google-start-bitrate': 1000,
                    },
                },
                {
                    kind: 'video',
                    mimeType: 'video/VP9',
                    clockRate: 90000,
                },
                {
                    kind: 'video',
                    mimeType: 'video/H264',
                    clockRate: 90000,
                    parameters: {
                        'packetization-mode': 1,
                        'profile-level-id': '42e01f',
                        'level-asymmetry-allowed': 1,
                    },
                },
            ] as RtpCodecCapability[],
        },
        // mediasoup WebRtcTransport settings.
        webRtcTransportOptions: {
            listenIps: [
                {
                    ip: process.env.MEDIASOUP_LISTEN_IP || '0.0.0.0',
                    announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP || getLocalIp(),
                },
            ] as TransportListenInfo[],
            initialAvailableOutgoingBitrate: 1000000,
            minimumAvailableOutgoingBitrate: 600000,
            maxSctpMessageSize: 262144,
            maxIncomingBitrate: 1500000,
        },
    },
};
