import { IsString, IsEmail, IsOptional } from 'class-validator';

export class SyncUserDto {
  @IsOptional()
  @IsString()
  clerkId?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}

