import { UserRole } from '../entities/user.entity';

export class CreateUserDto {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role: UserRole;
  isActive?: boolean;
}
