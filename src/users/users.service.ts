import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { SyncUserDto } from './dto/sync-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Sincronización automática de sesión con Clerk.
   * Si es el primer usuario del sistema, se le otorga SUPER_ADMIN automáticamente.
   */
  async syncUser(dto: SyncUserDto): Promise<User> {
    const { clerkId, email, firstName, lastName, imageUrl } = dto;

    const whereConditions: { clerkId?: string; email?: string }[] = [];
    if (clerkId) {
      whereConditions.push({ clerkId });
    }
    if (email) {
      whereConditions.push({ email });
    }

    if (whereConditions.length === 0) {
      throw new BadRequestException('Se requiere clerkId o email para sincronizar el usuario.');
    }

    let user = await this.userRepository.findOne({
      where: whereConditions,
    });

    if (!user) {
      const totalUsers = await this.userRepository.count();
      const initialRole = totalUsers === 0 ? UserRole.SUPER_ADMIN : UserRole.CLIENT;

      this.logger.log(`Creando nuevo usuario: ${email} (Rol inicial: ${initialRole})`);
      user = this.userRepository.create({
        clerkId,
        email,
        firstName,
        lastName,
        imageUrl,
        role: initialRole,
        isActive: true,
      });
      return await this.userRepository.save(user);
    }

    let hasChanges = false;
    if (user.clerkId !== clerkId) {
      user.clerkId = clerkId;
      hasChanges = true;
    }
    if (firstName && user.firstName !== firstName) {
      user.firstName = firstName;
      hasChanges = true;
    }
    if (lastName && user.lastName !== lastName) {
      user.lastName = lastName;
      hasChanges = true;
    }
    if (imageUrl && user.imageUrl !== imageUrl) {
      user.imageUrl = imageUrl;
      hasChanges = true;
    }

    if (hasChanges) {
      this.logger.log(`Actualizando perfil sincronizado: ${email}`);
      await this.userRepository.save(user);
    }

    return (await this.findOne(user.id))!;
  }

  /**
   * Listar usuarios con filtros por rol, búsqueda y estado.
   */
  async findAll(params?: {
    role?: UserRole;
    search?: string;
    isActive?: boolean;
  }): Promise<User[]> {
    const query = this.userRepository
      .createQueryBuilder('user')
      .orderBy('user.createdAt', 'DESC');

    if (params?.role) {
      query.andWhere('user.role = :role', { role: params.role });
    }

    if (typeof params?.isActive === 'boolean') {
      query.andWhere('user.isActive = :isActive', { isActive: params.isActive });
    }

    if (params?.search && params.search.trim()) {
      const s = `%${params.search.trim().toLowerCase()}%`;
      query.andWhere(
        '(LOWER(user.email) LIKE :s OR LOWER(user.firstName) LIKE :s OR LOWER(user.lastName) LIKE :s OR LOWER(COALESCE(user.phone, \'\')) LIKE :s)',
        { s },
      );
    }

    return await query.getMany();
  }

  async findOne(id: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { id },
    });
  }

  async findByClerkId(clerkId: string): Promise<User | null> {
    if (!clerkId) return null;
    return await this.userRepository.findOne({
      where: { clerkId },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    if (!email) return null;
    return await this.userRepository.findOne({
      where: { email },
    });
  }

  /**
   * Crear usuario / colaborador desde el panel de administración
   */
  async create(dto: CreateUserDto): Promise<User> {
    const existing = await this.findByEmail(dto.email.trim().toLowerCase());
    if (existing) {
      throw new ConflictException(`Ya existe un usuario registrado con el correo ${dto.email}`);
    }

    const newUser = this.userRepository.create({
      email: dto.email.trim().toLowerCase(),
      firstName: dto.firstName?.trim() || null,
      lastName: dto.lastName?.trim() || null,
      phone: dto.phone?.trim() || null,
      role: dto.role || UserRole.CLIENT,
      isActive: dto.isActive !== false,
    });

    const saved = await this.userRepository.save(newUser);
    return (await this.findOne(saved.id))!;
  }

  /**
   * Actualizar usuario o rol
   */
  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    if (dto.firstName !== undefined) {
      user.firstName = dto.firstName?.trim() || null;
    }
    if (dto.lastName !== undefined) {
      user.lastName = dto.lastName?.trim() || null;
    }
    if (dto.phone !== undefined) {
      user.phone = dto.phone?.trim() || null;
    }
    if (dto.role !== undefined) {
      user.role = dto.role;
    }
    if (dto.isActive !== undefined) {
      user.isActive = dto.isActive;
    }

    await this.userRepository.save(user);
    return (await this.findOne(id))!;
  }

  /**
   * Alternar estado Activo / Inactivo con 1 clic
   */
  async toggleActive(id: string): Promise<User> {
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    // Prevenir desactivar al único super admin del sistema
    if (user.role === UserRole.SUPER_ADMIN && user.isActive) {
      const activeSuperAdmins = await this.userRepository.count({
        where: { role: UserRole.SUPER_ADMIN, isActive: true },
      });
      if (activeSuperAdmins <= 1) {
        throw new BadRequestException(
          'No puedes desactivar al único Super Administrador activo del sistema.',
        );
      }
    }

    user.isActive = !user.isActive;
    await this.userRepository.save(user);
    return user;
  }

  /**
   * Eliminar usuario
   */
  async remove(id: string): Promise<{ deleted: boolean }> {
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    if (user.role === UserRole.SUPER_ADMIN) {
      const count = await this.userRepository.count({
        where: { role: UserRole.SUPER_ADMIN },
      });
      if (count <= 1) {
        throw new BadRequestException(
          'No puedes eliminar al único Super Administrador del sistema.',
        );
      }
    }

    await this.userRepository.delete(id);
    return { deleted: true };
  }
}
