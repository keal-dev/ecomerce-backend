import { Controller, Get, Param } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import {
  DniLookupResult,
  DocumentLookupService,
  RucLookupResult,
} from './document-lookup.service';

@Controller('document-lookup')
export class DocumentLookupController {
  constructor(private readonly documentLookupService: DocumentLookupService) {}

  @Public()
  @Get('dni/:numero')
  async lookupDni(@Param('numero') numero: string): Promise<DniLookupResult> {
    return await this.documentLookupService.lookupDni(numero);
  }

  @Public()
  @Get('ruc/:numero')
  async lookupRuc(@Param('numero') numero: string): Promise<RucLookupResult> {
    return await this.documentLookupService.lookupRuc(numero);
  }
}
