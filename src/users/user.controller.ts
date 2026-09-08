import { Body, Controller, Patch, Req } from '@nestjs/common';

import type { AuthenticatedRequest } from '../common/types/auth.types';

import {
  UpdateLocationDto,
  UpdatePreferencesDto,
  UpdateProfileDto,
} from './users.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Patch('location')
  async updateLocation(
    @Req() req: AuthenticatedRequest,
    @Body() body: UpdateLocationDto,
  ) {
    return this.users.updateLocation(req.user.id, body);
  }

  @Patch('profile')
  updateProfile(
    @Req() req: AuthenticatedRequest,
    @Body() body: UpdateProfileDto,
  ) {
    return this.users.updateProfile(req.user.id, body);
  }

  @Patch('preferences')
  async updatePreferences(
    @Req() req: AuthenticatedRequest,
    @Body() body: UpdatePreferencesDto,
  ) {
    return this.users.updatePreferences(req.user.id, body);
  }

  @Patch('permissions')
  completePermissions(@Req() req: AuthenticatedRequest) {
    return this.users.markPermissionsCompleted(req.user.id);
  }
}
