import { Module } from '@nestjs/common';
import { DocumentLookupController } from './document-lookup.controller';
import { DocumentLookupService } from './document-lookup.service';

@Module({
  controllers: [DocumentLookupController],
  providers: [DocumentLookupService],
  exports: [DocumentLookupService],
})
export class DocumentLookupModule {}
