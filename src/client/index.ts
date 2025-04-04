import express from 'express';

export function clientStateRoute() {
  const router = express.Router();

  router.get('/client/state', async (req, res) => {
    res.status(200).json({});
  });

  return router;
}
