import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { verifyToken } from '@clerk/backend';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';
import { UsersService } from '../../users/users.service';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  private readonly logger = new Logger(ClerkAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.headers['authorization'];

    if (!authHeader || typeof authHeader !== 'string') {
      throw new UnauthorizedException('Token de autenticación requerido.');
    }

    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Token de autenticación requerido.');
    }

    const secretKey =
      this.configService.get<string>('CLERK_SECRET_KEY') ||
      process.env.CLERK_SECRET_KEY;

    if (!secretKey) {
      throw new InternalServerErrorException(
        'CLERK_SECRET_KEY no configurado en el servidor.',
      );
    }

    let clerkUserId: string;
    let payload: Record<string, unknown>;

    try {
      const verified = await verifyToken(token, { secretKey });
      payload = verified as unknown as Record<string, unknown>;
      if (!verified?.sub) {
        throw new UnauthorizedException('Token inválido o expirado.');
      }
      clerkUserId = verified.sub;
    } catch (error) {
      this.logger.warn(
        `Fallo al verificar JWT de Clerk: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new UnauthorizedException('Token inválido o expirado.');
    }

    request.clerkUserId = clerkUserId;
    request.clerkPayload = payload;

    const dbUser = await this.usersService.findByClerkId(clerkUserId);
    request.dbUser = dbUser;

    if (dbUser && dbUser.isActive === false) {
      throw new ForbiddenException('Tu cuenta ha sido desactivada.');
    }

    return true;
  }
}
