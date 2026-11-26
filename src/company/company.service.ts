import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './company.entity';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompanyService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
  ) {}

  async getCompany(): Promise<Company> {
    const companies = await this.companyRepository.find({
      take: 1,
      order: { createdAt: 'ASC' },
    });

    if (companies.length > 0) {
      const existing = companies[0];
      let needsSave = false;

      if (!existing.primaryColor || existing.primaryColor.toLowerCase() === '#ffe600') {
        existing.primaryColor = '#000000';
        needsSave = true;
      }

      if (!existing.accentColor) {
        existing.accentColor = '#de2a2a';
        needsSave = true;
      }

      if (needsSave) {
        return await this.companyRepository.save(existing);
      }

      return existing;
    }

    // Si aún no existe registro de empresa, inicializamos uno por defecto
    const defaultCompany = this.companyRepository.create({
      name: 'Cooperativa Gourmet',
      legalName: 'Cooperativa Gourmet S.A.C.',
      primaryColor: '#000000',
      accentColor: '#de2a2a',
      currency: 'PEN',
      currencySymbol: 'S/',
    });

    return await this.companyRepository.save(defaultCompany);
  }

  async updateCompany(dto: UpdateCompanyDto): Promise<Company> {
    const company = await this.getCompany();
    Object.assign(company, dto);
    return await this.companyRepository.save(company);
  }
}
