import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Claim, ClaimStatus } from './entities/claim.entity';
import { CreateClaimDto } from './dto/create-claim.dto';
import { RespondClaimDto } from './dto/respond-claim.dto';
import { Company } from '../company/company.entity';
import { MailService } from '../mail/mail.service';

@Injectable()
export class ClaimsService {
  private readonly logger = new Logger(ClaimsService.name);

  constructor(
    @InjectRepository(Claim)
    private readonly claimRepository: Repository<Claim>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly mailService: MailService,
  ) {}

  private async generateNextCode(attemptOffset = 0): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `LR-${year}-`;

    const lastClaim = await this.claimRepository
      .createQueryBuilder('claim')
      .where('claim.code LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('claim.createdAt', 'DESC')
      .addOrderBy('claim.code', 'DESC')
      .getOne();

    let nextNumber = 1;
    if (lastClaim?.code) {
      const suffix = lastClaim.code.replace(prefix, '');
      const parsed = parseInt(suffix, 10);
      if (!isNaN(parsed) && parsed > 0) {
        nextNumber = parsed + 1;
      }
    }

    nextNumber += attemptOffset;
    return `${prefix}${String(nextNumber).padStart(5, '0')}`;
  }

  async create(dto: CreateClaimDto): Promise<Claim> {
    if (dto.isMinor && (!dto.tutorName?.trim() || !dto.tutorDocNumber?.trim())) {
      throw new BadRequestException(
        'Para menores de edad es obligatorio ingresar los datos del padre, madre o tutor.',
      );
    }

    const parsedAmount =
      dto.claimedAmount !== undefined &&
      dto.claimedAmount !== null &&
      !isNaN(Number(dto.claimedAmount))
        ? Number(dto.claimedAmount)
        : null;

    let savedClaim: Claim | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const code = await this.generateNextCode(attempt);
      const claim = this.claimRepository.create({
        code,
        isMinor: Boolean(dto.isMinor),
        tutorName: dto.isMinor ? dto.tutorName?.trim() || null : null,
        tutorDocType: dto.isMinor ? dto.tutorDocType?.trim() || 'DNI' : null,
        tutorDocNumber: dto.isMinor ? dto.tutorDocNumber?.trim() || null : null,
        tutorPhone: dto.isMinor ? dto.tutorPhone?.trim() || null : null,
        docType: dto.docType.trim(),
        docNumber: dto.docNumber.trim(),
        fullName: dto.fullName.trim(),
        email: dto.email.trim(),
        phone: dto.phone?.trim() || null,
        department: dto.department.trim(),
        province: dto.province.trim(),
        district: dto.district.trim(),
        address: dto.address.trim(),
        contractType: dto.contractType,
        claimedAmount: parsedAmount,
        orderNumber: dto.orderNumber?.trim() || null,
        contractDescription: dto.contractDescription.trim(),
        claimType: dto.claimType,
        claimDetail: dto.claimDetail.trim(),
        claimRequest: dto.claimRequest.trim(),
        status: ClaimStatus.PENDING,
      });

      try {
        savedClaim = await this.claimRepository.save(claim);
        break;
      } catch (err: any) {
        const isUniqueViolation =
          err?.code === '23505' ||
          String(err?.message || '').toLowerCase().includes('unique');
        if (!isUniqueViolation || attempt === 2) {
          throw err;
        }
      }
    }

    if (!savedClaim) {
      throw new BadRequestException('No se pudo registrar la hoja de reclamación.');
    }

    this.logger.log(
      `[Claims] Hoja de Reclamación ${savedClaim.code} registrada para ${savedClaim.email}.`,
    );

    const [company] = await this.companyRepository.find({ take: 1 });
    this.mailService
      .sendClaimConfirmation({
        code: savedClaim.code,
        createdAt: savedClaim.createdAt,
        fullName: savedClaim.fullName,
        docType: savedClaim.docType,
        docNumber: savedClaim.docNumber,
        email: savedClaim.email,
        phone: savedClaim.phone,
        department: savedClaim.department,
        province: savedClaim.province,
        district: savedClaim.district,
        address: savedClaim.address,
        isMinor: savedClaim.isMinor,
        tutorName: savedClaim.tutorName,
        tutorDocType: savedClaim.tutorDocType,
        tutorDocNumber: savedClaim.tutorDocNumber,
        tutorPhone: savedClaim.tutorPhone,
        contractType: savedClaim.contractType,
        claimedAmount: savedClaim.claimedAmount,
        orderNumber: savedClaim.orderNumber,
        contractDescription: savedClaim.contractDescription,
        claimType: savedClaim.claimType,
        claimDetail: savedClaim.claimDetail,
        claimRequest: savedClaim.claimRequest,
        companyName: company?.name,
        legalName: company?.legalName,
        taxId: company?.taxId,
        fiscalAddress: company?.address,
      })
      .catch((err) => {
        this.logger.error(
          `[Claims] Error asíncrono enviando constancia de reclamo ${savedClaim!.code}: ${err.message}`,
        );
      });

    return savedClaim;
  }

  async findAll(query?: {
    status?: string;
    claimType?: string;
    search?: string;
  }): Promise<Claim[]> {
    const qb = this.claimRepository
      .createQueryBuilder('claim')
      .orderBy('claim.createdAt', 'DESC');

    if (query?.status && query.status !== 'all') {
      qb.andWhere('claim.status = :status', { status: query.status });
    }

    if (query?.claimType && query.claimType !== 'all') {
      qb.andWhere('claim.claimType = :claimType', {
        claimType: query.claimType,
      });
    }

    if (query?.search && query.search.trim() !== '') {
      const term = `%${query.search.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(claim.code) LIKE :term OR LOWER(claim.fullName) LIKE :term OR LOWER(claim.email) LIKE :term OR LOWER(claim.docNumber) LIKE :term OR LOWER(COALESCE(claim.orderNumber, \'\')) LIKE :term)',
        { term },
      );
    }

    return qb.getMany();
  }

  async findOne(id: string): Promise<Claim> {
    const cleanId = id.trim();
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        cleanId,
      );

    const claim = isUuid
      ? await this.claimRepository.findOne({ where: { id: cleanId } })
      : await this.claimRepository
          .createQueryBuilder('claim')
          .where('UPPER(claim.code) = UPPER(:code)', { code: cleanId })
          .getOne();

    if (!claim) {
      throw new NotFoundException(
        `Hoja de reclamación '${id}' no encontrada.`,
      );
    }

    return claim;
  }

  async respond(
    id: string,
    dto: RespondClaimDto,
    respondedById: string,
  ): Promise<Claim> {
    const claim = await this.findOne(id);

    claim.status = dto.status;
    claim.adminResponse = dto.adminResponse.trim();
    claim.respondedAt = new Date();
    claim.respondedById = respondedById;

    const updated = await this.claimRepository.save(claim);

    this.logger.log(
      `[Claims] Reclamo ${updated.code} actualizado a estado '${updated.status}'.`,
    );

    const [company] = await this.companyRepository.find({ take: 1 });
    this.mailService
      .sendClaimResponse({
        code: updated.code,
        fullName: updated.fullName,
        email: updated.email,
        claimType: updated.claimType,
        status: updated.status,
        adminResponse: updated.adminResponse || '',
        respondedAt: updated.respondedAt || new Date(),
        companyName: company?.name,
        legalName: company?.legalName,
        taxId: company?.taxId,
      })
      .catch((err) => {
        this.logger.error(
          `[Claims] Error asíncrono enviando respuesta de reclamo ${updated.code}: ${err.message}`,
        );
      });

    return updated;
  }
}
