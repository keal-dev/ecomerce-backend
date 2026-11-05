import { IsOptional, IsString, IsEnum, IsBoolean } from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEnum(UserRole, { message: 'El rol especificado no es válido' })
  role?: UserRole;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
