import express from 'express';
import {
  getOrCreateRouter,
  createWebRtcTransport,
  connectTransport,
  createProducer,
  getProducersInRoom,
  createConsumer,
} from '../services/mediasoup-service';

const router = express.Router();

router.get('/router-capabilities', async (req, res) => {
  const roomId = (req.query.roomId as string) || (req.query.roomId as string) || 'default';
  console.log(`[SFU] router-capabilities requested for room ${roomId}`);
  try {
    const mediaRouter = await getOrCreateRouter(roomId);
    res.json(mediaRouter.rtpCapabilities);
  } catch (error) {
    console.error('[SFU] router-capabilities error:', error);
    res.status(500).json({ error: 'Failed to get router capabilities' });
  }
});

router.post('/create-transport', async (req, res) => {
  const { socketId, isConsumer } = req.body;
  const roomId = socketId || req.body.roomId || 'default';
  console.log(`[SFU] create-transport requested for room ${roomId} (isConsumer: ${!!isConsumer})`);
  try {
    const mediaRouter = await getOrCreateRouter(roomId);
    const transport = await createWebRtcTransport(mediaRouter);

    const payload = {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
    };
    res.json(payload);
  } catch (error) {
    console.error('[SFU] create-transport error:', error);
    res.status(500).json({ error: 'Failed to create transport' });
  }
});

router.post('/connect-transport', async (req, res) => {
  const { transportId, dtlsParameters } = req.body;
  console.log(`[SFU] connect-transport requested for transport ${transportId}`);
  if (!transportId || !dtlsParameters) {
    return res.status(400).json({ error: 'transportId and dtlsParameters required' });
  }
  try {
    await connectTransport(transportId, dtlsParameters);
    res.json({ connected: true });
  } catch (error) {
    console.error('[SFU] connect-transport error:', error);
    res.status(500).json({ error: 'Failed to connect transport' });
  }
});

router.post('/produce', async (req, res) => {
  const { transportId, kind, rtpParameters, sessionId, userId, appData } = req.body;
  // console.log(`[SFU] produce requested for transport ${transportId} (${kind}) from user ${userId} in room ${sessionId}. appData:`, appData);
  if (!transportId || !kind || !rtpParameters) {
    console.warn('[SFU] produce missing params:', { transportId, kind, hasRtp: !!rtpParameters });
    return res.status(400).json({ error: 'transportId, kind, rtpParameters required' });
  }
  const roomId = sessionId || 'default';
  try {
    const id = await createProducer(transportId, kind as 'audio' | 'video', rtpParameters, roomId, userId, appData);
    // console.log(`[SFU] Producer created successfully: ${id} (${kind}) from user ${userId} in room ${roomId}`);
    res.json({ id });
  } catch (error) {
    console.error('[SFU] produce error:', error);
    res.status(500).json({ error: 'Failed to produce', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

router.get('/producers', async (req, res) => {
  const roomId = (req.query.roomId as string) || 'default';
  // console.log(`[SFU] producers list requested for room ${roomId}`); // formatted to reduce noise
  try {
    const producers = getProducersInRoom(roomId);
    res.json({ producers });
  } catch (error: any) {
    console.error('[SFU] producers error:', error);
    // Log full stack for debugging
    if (error instanceof Error) {
      console.error(error.stack);
    }
    res.status(500).json({ error: 'Failed to get producers', details: error?.message });
  }
});

router.post('/consume', async (req, res) => {
  const { transportId, producerId, rtpCapabilities } = req.body;
  // console.log(`[SFU] consume requested for producer ${producerId} on transport ${transportId}`);
  if (!transportId || !producerId || !rtpCapabilities) {
    return res.status(400).json({ error: 'transportId, producerId, rtpCapabilities required' });
  }
  try {
    const result = await createConsumer(transportId, producerId, rtpCapabilities);
    if (!result) {
      console.warn(`[SFU] Cannot consume producer ${producerId} - incompatible capabilities`);
      return res.status(400).json({ error: 'Cannot consume - incompatible rtpCapabilities' });
    }
    res.json(result);
  } catch (error) {
    console.error('[SFU] consume error:', error);
    res.status(500).json({ error: 'Failed to consume' });
  }
});

export default router;
