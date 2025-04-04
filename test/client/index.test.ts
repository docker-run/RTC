import request from 'supertest';
import express from 'express';
import { clientStateRoute } from '../../src/client';
import { describe, it } from 'vitest';

describe('GET /client/state', () => {
  it('should return 200 status code', async () => {
    const app = express();
    app.use(clientStateRoute());

    await request(app)
      .get('/client/state')
      .expect(200);
  });
});
