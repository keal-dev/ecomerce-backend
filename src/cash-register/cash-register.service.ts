import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CashSession,
  CashSessionStatus,
} from './entities/cash-session.entity';
import { OpenCashSessionDto } from './dto/open-cash-session.dto';
import { CloseCashSessionDto } from './dto/close-cash-session.dto';

@Injectable()
export class CashRegisterService {
  private readonly logger = new Logger(CashRegisterService.name);

  constructor(
    @InjectRepository(CashSession)
    private readonly cashSessionRepository: Repository<CashSession>,
  ) {}

  /**
   * Obtiene la sesión de caja abierta actualmente en el negocio
   */
  async getCurrentSession(): Promise<CashSession | null> {
    return await this.cashSessionRepository.findOne({
      where: {
        status: CashSessionStatus.OPEN,
      },
      order: {
        openedAt: 'DESC',
      },
    });
  }

  /**
   * Abre una nueva sesión de caja para el negocio
   */
  async openSession(dto: OpenCashSessionDto): Promise<CashSession> {
    const { openedById, initialAmount, notes } = dto;

    // Verificar si ya existe una caja abierta en el negocio
    const existingOpenSession = await this.getCurrentSession();
    if (existingOpenSession) {
      throw new BadRequestException(
        'Ya existe una caja abierta en el negocio. Debe cerrarla antes de realizar una nueva apertura.',
      );
    }

    this.logger.log(
      `Abriendo caja con monto base S/ ${initialAmount} (Usuario: ${openedById})`,
    );

    const session = this.cashSessionRepository.create({
      openedById,
      initialAmount: Number(initialAmount) || 0,
      expectedAmount: Number(initialAmount) || 0,
      status: CashSessionStatus.OPEN,
      openedAt: new Date(),
      notes: notes?.trim() || null,
    });

    return await this.cashSessionRepository.save(session);
  }

  /**
   * Cierra una sesión de caja y realiza el arqueo de valores
   */
  async closeSession(
    id: string,
    dto: CloseCashSessionDto,
  ): Promise<CashSession> {
    const session = await this.cashSessionRepository.findOne({
      where: { id },
    });

    if (!session) {
      throw new NotFoundException('Sesión de caja no encontrada.');
    }

    if (session.status === CashSessionStatus.CLOSED) {
      throw new BadRequestException('Esta sesión de caja ya fue cerrada.');
    }

    const actualAmount = Number(dto.actualAmount) || 0;
    const expectedAmount =
      dto.expectedAmount !== undefined && dto.expectedAmount !== null
        ? Number(dto.expectedAmount)
        : Number(session.initialAmount);

    const difference = actualAmount - expectedAmount;

    session.closedById = dto.closedById;
    session.actualAmount = actualAmount;
    session.expectedAmount = expectedAmount;
    session.difference = difference;
    session.status = CashSessionStatus.CLOSED;
    session.closedAt = new Date();

    if (dto.notes) {
      session.notes = session.notes
        ? `${session.notes} | Cierre: ${dto.notes.trim()}`
        : dto.notes.trim();
    }

    this.logger.log(
      `Cerrando caja ${id}. Monto físico: S/ ${actualAmount}, Esperado: S/ ${expectedAmount}, Diferencia: S/ ${difference}`,
    );

    return await this.cashSessionRepository.save(session);
  }

  /**
   * Obtiene el historial de sesiones de caja del negocio
   */
  async getSessionHistory(): Promise<CashSession[]> {
    return await this.cashSessionRepository.find({
      order: {
        openedAt: 'DESC',
      },
      take: 50,
    });
  }
}
