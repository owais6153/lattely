import { IsEmail } from 'class-validator';

export class TestEmailDto {
  @IsEmail()
  email: string;
}
