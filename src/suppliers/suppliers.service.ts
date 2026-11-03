import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Supplier } from './entities/supplier.entity';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SuppliersService {
  private readonly logger = new Logger(SuppliersService.name);

  constructor(
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
  ) {}

  async findAll(params?: { search?: string; isActive?: boolean }): Promise<Supplier[]> {
    const query = this.supplierRepository.createQueryBuilder('supplier');

    if (params?.search && params.search.trim()) {
      const search = `%${params.search.trim().toLowerCase()}%`;
      query.andWhere(
        '(LOWER(supplier.name) LIKE :search OR LOWER(COALESCE(supplier.documentNumber, \'\')) LIKE :search OR LOWER(COALESCE(supplier.contactName, \'\')) LIKE :search)',
        { search },
      );
    }

    if (params?.isActive !== undefined) {
      query.andWhere('supplier.isActive = :isActive', { isActive: params.isActive });
    }

    query.orderBy('supplier.name', 'ASC');
    return await query.getMany();
  }

  async findOne(id: string): Promise<Supplier> {
    const supplier = await this.supplierRepository.findOne({ where: { id } });
    if (!supplier) {
      throw new NotFoundException(`Proveedor con ID "${id}" no encontrado.`);
    }
    return supplier;
  }

  async create(dto: CreateSupplierDto): Promise<Supplier> {
    const supplier = this.supplierRepository.create({
      name: dto.name.trim(),
      documentType: dto.documentType?.trim() || null,
      documentNumber: dto.documentNumber?.trim() || null,
      phone: dto.phone?.trim() || null,
      email: dto.email?.trim() || null,
      contactName: dto.contactName?.trim() || null,
      address: dto.address?.trim() || null,
      notes: dto.notes?.trim() || null,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
    });

    const saved = await this.supplierRepository.save(supplier);
    this.logger.log(`Proveedor "${saved.name}" registrado con éxito.`);
    return saved;
  }

  async update(id: string, dto: UpdateSupplierDto): Promise<Supplier> {
    const supplier = await this.findOne(id);

    if (dto.name !== undefined) supplier.name = dto.name.trim();
    if (dto.documentType !== undefined) supplier.documentType = dto.documentType?.trim() || null;
    if (dto.documentNumber !== undefined) supplier.documentNumber = dto.documentNumber?.trim() || null;
    if (dto.phone !== undefined) supplier.phone = dto.phone?.trim() || null;
    if (dto.email !== undefined) supplier.email = dto.email?.trim() || null;
    if (dto.contactName !== undefined) supplier.contactName = dto.contactName?.trim() || null;
    if (dto.address !== undefined) supplier.address = dto.address?.trim() || null;
    if (dto.notes !== undefined) supplier.notes = dto.notes?.trim() || null;
    if (dto.isActive !== undefined) supplier.isActive = dto.isActive;

    return await this.supplierRepository.save(supplier);
  }

  async remove(id: string): Promise<{ success: boolean; message: string }> {
    const supplier = await this.findOne(id);
    await this.supplierRepository.remove(supplier);
    this.logger.log(`Proveedor "${supplier.name}" eliminado.`);
    return {
      success: true,
      message: `Proveedor "${supplier.name}" eliminado correctamente.`,
    };
  }
}
