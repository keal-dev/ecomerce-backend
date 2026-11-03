import { IsUUID, IsNotEmpty, IsNumber, Min, IsOptional, IsString } from 'class-validator';

export class CloseCashSessionDto {
  @IsUUID()
  @IsNotEmpty()
  closedById: string;

  @IsNumber()
  @Min(0, { message: 'El monto físico contado no puede ser negativo' })
  actualAmount: number;

  @IsOptional()
  @IsNumber()
  expectedAmount?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
