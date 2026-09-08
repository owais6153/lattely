import { MODULE_METADATA } from '@nestjs/common/constants';

import { UsersController } from './user.controller';
import { UsersModule } from './users.module';

describe('UsersModule', () => {
  it('registers the onboarding controller', () => {
    const controllers = Reflect.getMetadata(
      MODULE_METADATA.CONTROLLERS,
      UsersModule,
    ) as unknown[];

    expect(controllers).toContain(UsersController);
  });
});
