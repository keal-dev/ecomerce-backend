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
      return companies[0];
    }

    // Si aún no existe registro de empresa, inicializamos uno por defecto
    const defaultCompany = this.companyRepository.create({
      name: 'Cooperativa Gourmet',
      legalName: 'Cooperativa Gourmet S.A.C.',
      primaryColor: '#000000',
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
