import { Body, Controller, Patch, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateLocationDto, UpdatePreferencesDto } from './users.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Patch('location')
  async updateLocation(@Req() req: any, @Body() body: UpdateLocationDto) {
    return this.users.updateLocation(req.user.id, body);
  }

  @Patch('preferences')
  async updatePreferences(@Req() req: any, @Body() body: UpdatePreferencesDto) {
    return this.users.updatePreferences(req.user.id, body);
  }
}
