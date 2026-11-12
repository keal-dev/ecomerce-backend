import { IsNotEmpty, IsNumber, IsString, IsEmail, Min, IsOptional } from 'class-validator';

export class CreateChargeDto {
  @IsString()
  @IsNotEmpty({ message: 'El tokenId generado por Culqi es obligatorio' })
  tokenId: string;

  @IsNumber()
  @Min(1, { message: 'El monto debe ser mayor a 0' })
  amount: number; // Monto en céntimos (ej. S/ 15.00 -> 1500)

  @IsEmail({}, { message: 'Debe ingresar un correo electrónico válido' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'La moneda es requerida (ej. PEN)' })
  currencyCode: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @IsString()
  @IsOptional()
  docType?: string;

  @IsString()
  @IsOptional()
  docNumber?: string;

  @IsString()
  @IsOptional()
  department?: string;

  @IsString()
  @IsOptional()
  province?: string;

  @IsString()
  @IsOptional()
  district?: string;

  @IsString()
  @IsOptional()
  orderNumber?: string;

  @IsNumber()
  @IsOptional()
  subtotal?: number;

  @IsNumber()
  @IsOptional()
  shippingCost?: number;

  @IsString()
  @IsOptional()
  reference?: string;

  @IsString()
  @IsOptional()
  invoiceType?: string;

  @IsString()
  @IsOptional()
  companyRuc?: string;

  @IsString()
  @IsOptional()
  companyLegalName?: string;

  @IsString()
  @IsOptional()
  companyName?: string;

  @IsString()
  @IsOptional()
  currencySymbol?: string;

  @IsOptional()
  items?: {
    title: string;
    quantity: number;
    price: number;
    imageUrl?: string;
  }[];
}

