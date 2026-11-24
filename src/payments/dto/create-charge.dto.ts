import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsEmail,
  Min,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ChargeItemDto {
  @IsString()
  @IsOptional()
  productId?: string;

  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  sku?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsNumber()
  @Min(1, { message: 'La cantidad mínima por producto es 1' })
  quantity: number;

  @IsNumber()
  @IsOptional()
  price?: number;
}

export class CreateChargeDto {
  @IsString()
  @IsNotEmpty({ message: 'El tokenId generado por Culqi es obligatorio' })
  tokenId: string;

  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'El monto debe ser mayor a 0' })
  amount?: number; // Monto referencial en céntimos; el backend siempre recalcula el real desde BD

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

  @IsArray({ message: 'Debe incluir los productos del carrito' })
  @ValidateNested({ each: true })
  @Type(() => ChargeItemDto)
  items: ChargeItemDto[];
}

