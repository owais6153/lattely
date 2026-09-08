import { IsEnum, IsString, Matches, MaxLength } from 'class-validator';

export class RegisterPushTokenDto {
  @IsString()
  @MaxLength(255)
  @Matches(/^Expo(?:nent)?PushToken\[[\w-]+\]$/)
  token: string;

  @IsEnum(['ios', 'android'])
  platform: 'ios' | 'android';
}
