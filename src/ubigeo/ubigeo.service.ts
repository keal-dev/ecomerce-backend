import { Injectable, Logger, OnModuleInit, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Ubigeo } from './ubigeo.entity';

@Injectable()
export class UbigeoService implements OnModuleInit {
  private readonly logger = new Logger(UbigeoService.name);

  constructor(
    @InjectRepository(Ubigeo)
    private readonly ubigeoRepository: Repository<Ubigeo>,
  ) {}

  async onModuleInit() {
    try {
      const count = await this.ubigeoRepository.count();
      if (count === 0) {
        this.logger.log('Sembrando catálogo oficial de Ubigeos del Perú (INEI)...');
        await this.seedUbigeos();
      }
    } catch (err) {
      this.logger.error('Error al verificar / inicializar ubigeos:', err);
    }
  }

  private async seedUbigeos() {
    const candidates = [
      path.join(__dirname, 'data', 'ubigeos-peru.json'),
      path.join(process.cwd(), 'src', 'ubigeo', 'data', 'ubigeos-peru.json'),
      path.join(process.cwd(), 'dist', 'ubigeo', 'data', 'ubigeos-peru.json'),
    ];

    let filePath: string | null = null;
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        filePath = candidate;
        break;
      }
    }

    if (!filePath) {
      this.logger.warn('No se encontró el archivo ubigeos-peru.json para el sembrado inicial.');
      return;
    }

    try {
      let rawText = fs.readFileSync(filePath, 'utf-8');
      // 1. Eliminar Byte Order Mark (BOM) UTF-8 (\uFEFF) si estuviese presente
      if (rawText.charCodeAt(0) === 0xfeff) {
        rawText = rawText.slice(1);
      }
      rawText = rawText.trim();

      // 2. Limpiar posibles saltos de línea sin escapar dentro de strings
      const sanitized = rawText.replace(/[\r\n]+/g, ' ');
      const rawList: any[] = JSON.parse(sanitized);

      const entities: Ubigeo[] = rawList.map((item) => {
        const ineiCode = String(item.inei || '').trim().padStart(6, '0');
        const dep = String(item.departamento || '').trim().toUpperCase();
        const prov = String(item.provincia || '').trim().toUpperCase();
        const dist = String(item.distrito || '').trim().toUpperCase();

        const ubigeo = new Ubigeo();
        ubigeo.code = ineiCode;
        ubigeo.department = dep;
        ubigeo.province = prov;
        ubigeo.district = dist;
        ubigeo.departmentCode = ineiCode.substring(0, 2);
        ubigeo.provinceCode = ineiCode.substring(0, 4);
        ubigeo.reniecCode = item.reniec ? String(item.reniec).trim() : ineiCode;
        ubigeo.fullName = `${dep} - ${prov} - ${dist}`;
        return ubigeo;
      });

      // Insertar por lotes de 300 para no sobrecargar el pool de conexiones de Postgres
      const chunkSize = 300;
      for (let i = 0; i < entities.length; i += chunkSize) {
        const chunk = entities.slice(i, i + chunkSize);
        await this.ubigeoRepository.save(chunk);
      }

      this.logger.log(`¡${entities.length} ubigeos del Perú sembrados exitosamente!`);
    } catch (err) {
      this.logger.error('Error durante la carga de ubigeos:', err);
    }
  }

  // 1. Departamentos (25 regiones únicas)
  async getDepartments(): Promise<{ departmentCode: string; department: string }[]> {
    return await this.ubigeoRepository
      .createQueryBuilder('u')
      .select('u.departmentCode', 'departmentCode')
      .addSelect('u.department', 'department')
      .distinct(true)
      .orderBy('u.department', 'ASC')
      .getRawMany();
  }

  // 2. Provincias filtradas por departamento
  async getProvinces(departmentCode: string): Promise<{ provinceCode: string; province: string; departmentCode: string }[]> {
    return await this.ubigeoRepository
      .createQueryBuilder('u')
      .select('u.provinceCode', 'provinceCode')
      .addSelect('u.province', 'province')
      .addSelect('u.departmentCode', 'departmentCode')
      .where('u.departmentCode = :departmentCode', { departmentCode })
      .distinct(true)
      .orderBy('u.province', 'ASC')
      .getRawMany();
  }

  // 3. Distritos filtrados por provincia (cada uno contiene el código de 6 dígitos)
  async getDistricts(provinceCode: string): Promise<{ code: string; district: string; provinceCode: string; departmentCode: string }[]> {
    return await this.ubigeoRepository
      .createQueryBuilder('u')
      .select('u.code', 'code')
      .addSelect('u.district', 'district')
      .addSelect('u.provinceCode', 'provinceCode')
      .addSelect('u.departmentCode', 'departmentCode')
      .where('u.provinceCode = :provinceCode', { provinceCode })
      .orderBy('u.district', 'ASC')
      .getRawMany();
  }

  // 4. Buscar Ubigeo por código oficial (6 dígitos)
  async getByCode(code: string): Promise<Ubigeo> {
    const cleanCode = String(code).trim().padStart(6, '0');
    const ubigeo = await this.ubigeoRepository.findOneBy({ code: cleanCode });
    if (!ubigeo) {
      throw new NotFoundException(`Ubigeo con código «${code}» no encontrado`);
    }
    return ubigeo;
  }

  // 5. Búsqueda rápida / Autocompletado por texto o código
  async search(query: string, limit = 20): Promise<Ubigeo[]> {
    if (!query || !query.trim()) {
      return [];
    }

    const cleanQuery = query.trim();
    return await this.ubigeoRepository.find({
      where: [
        { fullName: ILike(`%${cleanQuery}%`) },
        { code: ILike(`%${cleanQuery}%`) },
        { district: ILike(`%${cleanQuery}%`) },
      ],
      take: Math.min(limit, 50),
      order: {
        department: 'ASC',
        province: 'ASC',
        district: 'ASC',
      },
    });
  }
}
