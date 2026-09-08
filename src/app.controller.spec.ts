import type { DataSource } from 'typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  it('reports readiness only after the database responds', async () => {
    const dataSource = { query: jest.fn().mockResolvedValue([{ result: 1 }]) };
    const controller = new AppController(
      new AppService(),
      dataSource as unknown as DataSource,
    );

    await expect(controller.health()).resolves.toMatchObject({
      status: 'ok',
      database: 'reachable',
    });
    expect(dataSource.query).toHaveBeenCalledWith('SELECT 1');
  });
});
