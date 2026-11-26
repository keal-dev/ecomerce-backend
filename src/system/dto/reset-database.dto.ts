import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class ResetDatabaseDto {
  @IsString()
  confirmationText: string;

  @IsOptional()
  @IsBoolean()
  resetCompany?: boolean;
}
