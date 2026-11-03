import { Controller, Get, Param, Query } from '@nestjs/common';
import { UbigeoService } from './ubigeo.service';
import { Ubigeo } from './ubigeo.entity';

@Controller('ubigeo')
export class UbigeoController {
  constructor(private readonly ubigeoService: UbigeoService) {}

  // 1. Obtener los 25 departamentos
  @Get('departments')
  async getDepartments() {
    return await this.ubigeoService.getDepartments();
  }

  // 2. Obtener provincias (por query param o ruta)
  @Get('provinces')
  async getProvincesByQuery(@Query('departmentCode') departmentCode: string) {
    if (!departmentCode) return [];
    return await this.ubigeoService.getProvinces(departmentCode);
  }

  @Get('provinces/:departmentCode')
  async getProvincesByParam(@Param('departmentCode') departmentCode: string) {
    return await this.ubigeoService.getProvinces(departmentCode);
  }

  // 3. Obtener distritos (por query param o ruta)
  @Get('districts')
  async getDistrictsByQuery(@Query('provinceCode') provinceCode: string) {
    if (!provinceCode) return [];
    return await this.ubigeoService.getDistricts(provinceCode);
  }

  @Get('districts/:provinceCode')
  async getDistrictsByParam(@Param('provinceCode') provinceCode: string) {
    return await this.ubigeoService.getDistricts(provinceCode);
  }

  // 4. Búsqueda rápida / autocompletado
  @Get('search')
  async search(@Query('q') q: string, @Query('limit') limit?: string): Promise<Ubigeo[]> {
    const numLimit = limit ? parseInt(limit, 10) : 20;
    return await this.ubigeoService.search(q, isNaN(numLimit) ? 20 : numLimit);
  }

  // 5. Obtener ubigeo específico por código de 6 dígitos (ej. "150118")
  @Get(':code')
  async getByCode(@Param('code') code: string): Promise<Ubigeo> {
    return await this.ubigeoService.getByCode(code);
  }
}
