import { IsUUID, IsNotEmpty, IsNumber, Min, IsOptional, IsString } from 'class-validator';

export class OpenCashSessionDto {
  @IsUUID()
  @IsNotEmpty()
  openedById: string;

  @IsNumber()
  @Min(0, { message: 'El monto inicial no puede ser negativo' })
  initialAmount: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
