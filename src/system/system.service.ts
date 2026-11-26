import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import { ResetDatabaseDto } from './dto/reset-database.dto';

const PROTECTED_SUPER_ADMIN_EMAIL = 'delacruzlopezkeal@gmail.com';
const REQUIRED_CONFIRMATION_TEXT = 'RESETEAR BASE DE DATOS';

export interface DatabaseTableCounts {
  products: number;
  categories: number;
  brands: number;
  banners: number;
  orders: number;
  purchases: number;
  suppliers: number;
  cashSessions: number;
  claims: number;
  otherUsers: number;
  company: number;
  ubigeos: number;
}

export interface DatabaseStatsResponse {
  protectedSuperAdminEmail: string;
  counts: DatabaseTableCounts;
}

export interface ResetDatabaseResponse {
  success: boolean;
  message: string;
  resetAt: string;
  preservedSuperAdminEmail: string;
  resetCompany: boolean;
  deletedCounts: DatabaseTableCounts;
}

@Injectable()
export class SystemService {
  private readonly logger = new Logger(SystemService.name);

  constructor(private readonly dataSource: DataSource) {}

  private async countRows(
    runner: DataSource | EntityManager,
    tableName: string,
  ): Promise<number> {
    const rows = await runner.query(
      `SELECT COUNT(*)::int AS count FROM "${tableName}"`,
    );
    return Number(rows[0]?.count ?? 0);
  }

  private async collectCounts(
    runner: DataSource | EntityManager,
  ): Promise<DatabaseTableCounts> {
    const [
      products,
      categories,
      brands,
      banners,
      orders,
      purchases,
      suppliers,
      cashSessions,
      claims,
      otherUsersRows,
      company,
      ubigeos,
    ] = await Promise.all([
      this.countRows(runner, 'products'),
      this.countRows(runner, 'categories'),
      this.countRows(runner, 'brands'),
      this.countRows(runner, 'banners'),
      this.countRows(runner, 'orders'),
      this.countRows(runner, 'purchases'),
      this.countRows(runner, 'suppliers'),
      this.countRows(runner, 'cash_sessions'),
      this.countRows(runner, 'claims'),
      runner.query(
        'SELECT COUNT(*)::int AS count FROM "users" WHERE LOWER(email) <> LOWER($1)',
        [PROTECTED_SUPER_ADMIN_EMAIL],
      ),
      this.countRows(runner, 'company'),
      this.countRows(runner, 'ubigeos'),
    ]);

    return {
      products,
      categories,
      brands,
      banners,
      orders,
      purchases,
      suppliers,
      cashSessions,
      claims,
      otherUsers: Number(otherUsersRows[0]?.count ?? 0),
      company,
      ubigeos,
    };
  }

  async getDatabaseStats(): Promise<DatabaseStatsResponse> {
    const counts = await this.collectCounts(this.dataSource);
    return {
      protectedSuperAdminEmail: PROTECTED_SUPER_ADMIN_EMAIL,
      counts,
    };
  }

  async resetDatabase(
    dto: ResetDatabaseDto,
    currentUser: User,
  ): Promise<ResetDatabaseResponse> {
    if (!currentUser || currentUser.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Solo un usuario SUPER_ADMIN puede resetear la base de datos.',
      );
    }

    const normalizedConfirmation = (dto.confirmationText || '')
      .trim()
      .toUpperCase();

    if (normalizedConfirmation !== REQUIRED_CONFIRMATION_TEXT) {
      throw new BadRequestException(
        `Debes escribir exactamente "${REQUIRED_CONFIRMATION_TEXT}" para confirmar.`,
      );
    }

    const shouldResetCompany = dto.resetCompany !== false;

    return await this.dataSource.transaction(async (manager) => {
      const deletedCounts = await this.collectCounts(manager);

      const tablesToTruncate = [
        '"order_items"',
        '"orders"',
        '"purchase_items"',
        '"purchases"',
        '"cash_sessions"',
        '"claims"',
        '"products"',
        '"categories"',
        '"brands"',
        '"banners"',
        '"suppliers"',
      ];

      if (shouldResetCompany) {
        tablesToTruncate.push('"company"');
      }

      await manager.query(
        `TRUNCATE TABLE ${tablesToTruncate.join(', ')} RESTART IDENTITY CASCADE`,
      );

      await manager.query(
        'DELETE FROM "users" WHERE LOWER(email) <> LOWER($1) AND id <> $2',
        [PROTECTED_SUPER_ADMIN_EMAIL, currentUser.id],
      );

      const userRepo = manager.getRepository(User);
      let protectedAdmin = await userRepo
        .createQueryBuilder('u')
        .where('LOWER(u.email) = LOWER(:email)', {
          email: PROTECTED_SUPER_ADMIN_EMAIL,
        })
        .getOne();

      if (!protectedAdmin) {
        protectedAdmin = userRepo.create({
          email: PROTECTED_SUPER_ADMIN_EMAIL,
          role: UserRole.SUPER_ADMIN,
          isActive: true,
        });
        await userRepo.save(protectedAdmin);
      } else if (
        protectedAdmin.role !== UserRole.SUPER_ADMIN ||
        !protectedAdmin.isActive
      ) {
        protectedAdmin.role = UserRole.SUPER_ADMIN;
        protectedAdmin.isActive = true;
        await userRepo.save(protectedAdmin);
      }

      this.logger.warn(
        `Reseteo total de base de datos ejecutado por ${currentUser.email} (resetCompany=${shouldResetCompany}).`,
      );

      return {
        success: true,
        message: 'Base de datos reseteada correctamente.',
        resetAt: new Date().toISOString(),
        preservedSuperAdminEmail: PROTECTED_SUPER_ADMIN_EMAIL,
        resetCompany: shouldResetCompany,
        deletedCounts: {
          ...deletedCounts,
          company: shouldResetCompany ? deletedCounts.company : 0,
        },
      };
    });
  }
}
