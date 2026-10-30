import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import HandStore from './handStore';

export function sharingRouter(store: HandStore) {
  const router = Router();
  router.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
  });
  router.use(rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: true, legacyHeaders: false }));
  router.post('/', async (req, res) => {
    try {
      const { handId, playerId, token } = req.body ?? {};
      if (![handId, playerId, token].every(v => typeof v === 'string' && v.length <= 100)) {
        res.status(400).json({ error: 'invalid request' }); return;
      }
      const hand = await store.getHand(handId);
      if (!hand?.players.some((p: any) => p.id === playerId && p.token === token && !p.isBot)) {
        res.status(403).json({ error: 'unauthorized' }); return;
      }
      if (hand.stage !== 'showdown' || !hand.players.some((p: any) => p.id === playerId && p.stack + (hand.totalContributions?.[p.id] ?? 0) > 0)) {
        res.status(409).json({ error: 'completed participating hand required' }); return;
      }
      const share = await store.shareHand(hand, playerId);
      res.json({ path: `/share/${share.token}`, expires: share.expires });
    } catch (error) {
      console.error('Share creation failed', error);
      res.status(500).json({ error: 'share failed' });
    }
  });
  router.post('/:token/claim', async (req, res) => {
    try {
      const claim = req.body?.claim;
      const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuid.test(req.params.token) || typeof claim !== 'string' || !uuid.test(claim)) {
        res.status(400).json({ error: 'invalid request' }); return;
      }
      const result = await store.claimSharedHand(req.params.token, claim);
      if (!result) { res.status(404).json({ error: 'share unavailable' }); return; }
      const player = result.hand.players.find((p: any) => p.id === result.heroId)!;
      res.json({ playerUrl: `/player/${result.hand.id}/${player.id}/${player.token}` });
    } catch (error) {
      console.error('Share claim failed', error);
      res.status(500).json({ error: 'share failed' });
    }
  });
  return router;
}
