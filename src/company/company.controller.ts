import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CompanyService } from './company.service';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { Company } from './company.entity';

@Controller('company')
export class CompanyController {
  constructor(
    private readonly companyService: CompanyService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Get()
  async getCompany(): Promise<Company> {
    return await this.companyService.getCompany();
  }

  @Put()
  async updateCompany(@Body() dto: UpdateCompanyDto): Promise<Company> {
    return await this.companyService.updateCompany(dto);
  }

  @Post('upload-logo')
  @UseInterceptors(FileInterceptor('file'))
  async uploadLogo(@UploadedFile() file: Express.Multer.File) {
    const result = await this.cloudinaryService.uploadFile(file, 'ecomerce/company');
    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  }
}
