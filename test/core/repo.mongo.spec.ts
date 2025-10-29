import { describe, it, expect, vi } from 'vitest';
import { MongoInterestRepository } from '../../src/core/repo.mongo';

vi.mock('mongodb', () => {
  const insertOne = vi.fn().mockResolvedValue({ insertedId: 'id' });
  const collection = vi.fn().mockReturnValue({ insertOne });
  const db = vi.fn().mockReturnValue({ collection });
  const connect = vi.fn().mockResolvedValue(undefined);
  const close = vi.fn().mockResolvedValue(undefined);
  const MongoClient = vi.fn().mockImplementation(() => ({ connect, db, close }));
  return { MongoClient };
});

describe('MongoInterestRepository', () => {
  it('create insere documento e retorna id/createdAt', async () => {
    const repo = new MongoInterestRepository('mongodb://localhost:27017', 'fristad', 'interests');
    const res = await repo.create({ persona: 'nomade', email: 'a@b.com', consent: true });
    expect(res.id).toBeDefined();
    expect(res.createdAt).toBeTypeOf('string');
  });
});






