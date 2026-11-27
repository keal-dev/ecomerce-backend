import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface DniLookupResult {
  type: 'DNI';
  documentNumber: string;
  fullName: string;
  firstName: string;
  firstLastName: string;
  secondLastName: string;
}

export interface RucLookupResult {
  type: 'RUC';
  documentNumber: string;
  legalName: string;
  status: string;
  condition: string;
  address: string;
  department: string;
  province: string;
  district: string;
}

type CachedEntry<T> = {
  data: T;
  expiresAt: number;
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas
const MAX_CACHE_ENTRIES = 2000;

@Injectable()
export class DocumentLookupService {
  private readonly logger = new Logger(DocumentLookupService.name);
  private readonly dniCache = new Map<string, CachedEntry<DniLookupResult>>();
  private readonly rucCache = new Map<string, CachedEntry<RucLookupResult>>();

  constructor(private readonly configService: ConfigService) {}

  private getApiKey(): string {
    const key = (
      this.configService.get<string>('DECOLECTA_API_KEY') ||
      process.env.DECOLECTA_API_KEY ||
      ''
    ).trim();

    if (!key) {
      throw new InternalServerErrorException(
        'La clave DECOLECTA_API_KEY no está configurada en el servidor.',
      );
    }

    return key;
  }

  private getFromCache<T>(cache: Map<string, CachedEntry<T>>, key: string): T | null {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      cache.delete(key);
      return null;
    }
    return entry.data;
  }

  private setInCache<T>(cache: Map<string, CachedEntry<T>>, key: string, data: T): void {
    if (cache.size >= MAX_CACHE_ENTRIES) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey) cache.delete(oldestKey);
    }
    cache.set(key, {
      data,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
  }

  private async fetchDecolecta(url: string): Promise<Record<string, unknown>> {
    const apiKey = this.getApiKey();

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(8000),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error de red';
      this.logger.warn(`Error de conexión con Decolecta: ${msg}`);
      throw new BadGatewayException(
        'No se pudo conectar con el servicio de consulta. Puedes ingresar los datos manualmente.',
      );
    }

    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

    if (response.status === 404 || response.status === 422) {
      throw new NotFoundException('No se encontraron datos para el documento ingresado.');
    }

    if (!response.ok) {
      const detail =
        typeof payload.message === 'string'
          ? payload.message
          : typeof payload.error === 'string'
            ? payload.error
            : `HTTP ${response.status}`;
      this.logger.warn(`Decolecta devolvió ${response.status}: ${detail}`);
      throw new BadGatewayException(
        'El servicio de consulta no respondió correctamente. Puedes ingresar los datos manualmente.',
      );
    }

    return payload;
  }

  private pickString(obj: Record<string, unknown>, keys: string[]): string {
    for (const key of keys) {
      const val = obj[key];
      if (typeof val === 'string' && val.trim()) {
        return val.trim();
      }
    }
    return '';
  }

  async lookupDni(rawNumero: string): Promise<DniLookupResult> {
    const numero = String(rawNumero || '').replace(/\D/g, '');
    if (!/^\d{8}$/.test(numero)) {
      throw new BadRequestException('El DNI debe tener exactamente 8 dígitos numéricos.');
    }

    const cached = this.getFromCache(this.dniCache, numero);
    if (cached) {
      return cached;
    }

    const data = await this.fetchDecolecta(
      `https://api.decolecta.com/v1/reniec/dni?numero=${encodeURIComponent(numero)}`,
    );

    const firstName = this.pickString(data, ['first_name', 'nombres', 'firstName']);
    const firstLastName = this.pickString(data, [
      'first_last_name',
      'apellido_paterno',
      'apellidoPaterno',
      'firstLastName',
    ]);
    const secondLastName = this.pickString(data, [
      'second_last_name',
      'apellido_materno',
      'apellidoMaterno',
      'secondLastName',
    ]);
    const rawFullName = this.pickString(data, [
      'full_name',
      'nombre_completo',
      'nombreCompleto',
      'nombre',
    ]);

    const assembledName = [firstName, firstLastName, secondLastName]
      .filter(Boolean)
      .join(' ')
      .trim();

    const fullName = assembledName || rawFullName;

    if (!fullName) {
      throw new NotFoundException('No se encontraron datos para el DNI ingresado.');
    }

    const result: DniLookupResult = {
      type: 'DNI',
      documentNumber: numero,
      fullName,
      firstName,
      firstLastName,
      secondLastName,
    };

    this.setInCache(this.dniCache, numero, result);
    return result;
  }

  async lookupRuc(rawNumero: string): Promise<RucLookupResult> {
    const numero = String(rawNumero || '').replace(/\D/g, '');
    if (!/^\d{11}$/.test(numero)) {
      throw new BadRequestException('El RUC debe tener exactamente 11 dígitos numéricos.');
    }

    const cached = this.getFromCache(this.rucCache, numero);
    if (cached) {
      return cached;
    }

    const data = await this.fetchDecolecta(
      `https://api.decolecta.com/v1/sunat/ruc?numero=${encodeURIComponent(numero)}`,
    );

    const legalName = this.pickString(data, [
      'razon_social',
      'razonSocial',
      'nombre',
      'nombre_o_razon_social',
    ]);

    if (!legalName) {
      throw new NotFoundException('No se encontraron datos para el RUC ingresado.');
    }

    const result: RucLookupResult = {
      type: 'RUC',
      documentNumber: numero,
      legalName,
      status: this.pickString(data, ['estado', 'status']),
      condition: this.pickString(data, ['condicion', 'condition']),
      address: this.pickString(data, ['direccion', 'direccion_completa', 'address']),
      department: this.pickString(data, ['departamento', 'department']),
      province: this.pickString(data, ['provincia', 'province']),
      district: this.pickString(data, ['distrito', 'district']),
    };

    this.setInCache(this.rucCache, numero, result);
    return result;
  }
}
