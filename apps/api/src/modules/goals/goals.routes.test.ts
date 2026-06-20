import type { Agent } from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp, signUp } from '../../../test/app.js';
import { createTestDatabase, resetDatabase } from '../../../test/db.js';
import type { Database } from '../../db/types.js';

describe('goals routes', () => {
  let db: Database;
  let app: ReturnType<typeof buildTestApp>;
  let agent: Agent;

  beforeAll(async () => {
    db = await createTestDatabase();
    app = buildTestApp(db);
  });

  beforeEach(async () => {
    await resetDatabase(db);
    ({ agent } = await signUp(app));
  });

  afterAll(() => db.close());

  it('creates a goal and tracks progress', async () => {
    const created = await agent
      .post('/api/goals')
      .send({ name: 'Emergency fund', targetAmount: 6000_00, savedAmount: 1500_00 })
      .expect(201);
    expect(created.body.goal).toMatchObject({
      name: 'Emergency fund',
      targetAmount: 6000_00,
      savedAmount: 1500_00,
      targetDate: null,
      progress: 25,
      completed: false,
    });

    const list = await agent.get('/api/goals').expect(200);
    expect(list.body.goals).toHaveLength(1);
  });

  it('adds contributions and marks the goal complete', async () => {
    const { goal } = (await agent.post('/api/goals').send({ name: 'Bike', targetAmount: 900_00 }))
      .body;

    await agent.post(`/api/goals/${goal.id}/contributions`).send({ amount: 400_00 }).expect(200);
    const res = await agent
      .post(`/api/goals/${goal.id}/contributions`)
      .send({ amount: 600_00 })
      .expect(200);
    expect(res.body.goal).toMatchObject({ savedAmount: 1000_00, progress: 100, completed: true });
  });

  it('allows taking money back out', async () => {
    const { goal } = (
      await agent
        .post('/api/goals')
        .send({ name: 'Trip', targetAmount: 2000_00, savedAmount: 500_00 })
    ).body;
    const res = await agent
      .post(`/api/goals/${goal.id}/contributions`)
      .send({ amount: -200_00 })
      .expect(200);
    expect(res.body.goal.savedAmount).toBe(300_00);
  });

  it('refuses to withdraw more than has been saved', async () => {
    const { goal } = (
      await agent
        .post('/api/goals')
        .send({ name: 'Trip', targetAmount: 2000_00, savedAmount: 50_00 })
    ).body;
    const res = await agent.post(`/api/goals/${goal.id}/contributions`).send({ amount: -80_00 });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Cannot withdraw more than the 50.00 saved in "Trip"');

    const list = await agent.get('/api/goals');
    expect(list.body.goals[0].savedAmount).toBe(50_00);
  });

  it('updates and deletes goals', async () => {
    const { goal } = (await agent.post('/api/goals').send({ name: 'Car', targetAmount: 100 })).body;
    const res = await agent
      .patch(`/api/goals/${goal.id}`)
      .send({ targetAmount: 15000_00, targetDate: '2027-06-30' })
      .expect(200);
    expect(res.body.goal).toMatchObject({ targetAmount: 15000_00, targetDate: '2027-06-30' });

    await agent.delete(`/api/goals/${goal.id}`).expect(204);
    await agent.delete(`/api/goals/${goal.id}`).expect(404);
  });

  it('validates input', async () => {
    await agent.post('/api/goals').send({ name: '', targetAmount: 100 }).expect(400);
    await agent.post('/api/goals').send({ name: 'X', targetAmount: 0 }).expect(400);
    const { goal } = (await agent.post('/api/goals').send({ name: 'X', targetAmount: 100 })).body;
    await agent.post(`/api/goals/${goal.id}/contributions`).send({ amount: 0 }).expect(400);
  });

  it("keeps other users' goals private", async () => {
    const { goal } = (await agent.post('/api/goals').send({ name: 'Mine', targetAmount: 100 }))
      .body;
    const other = await signUp(app);
    await other.agent.post(`/api/goals/${goal.id}/contributions`).send({ amount: 5 }).expect(404);
    expect((await other.agent.get('/api/goals')).body.goals).toEqual([]);
  });
});
