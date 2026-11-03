import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  IsUUID,
  Min,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePurchaseItemDto {
  @IsUUID('all', { message: 'El ID del producto no es válido' })
  @IsNotEmpty({ message: 'El producto es obligatorio' })
  productId: string;

  @IsNumber({}, { message: 'La cantidad debe ser un número' })
  @Min(1, { message: 'La cantidad mínima a ingresar es 1' })
  @Type(() => Number)
  quantity: number;

  @IsNumber({}, { message: 'El costo unitario debe ser un número válido' })
  @Min(0, { message: 'El costo no puede ser negativo' })
  @Type(() => Number)
  costPrice: number;

  @IsOptional()
  @IsNumber({}, { message: 'El precio de venta debe ser un número válido' })
  @Min(0, { message: 'El precio de venta no puede ser negativo' })
  @Type(() => Number)
  newSalePrice?: number;
}

export class CreatePurchaseDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre del proveedor es obligatorio' })
  supplierName: string;

  @IsOptional()
  @IsString()
  documentType?: string;

  @IsOptional()
  @IsString()
  documentNumber?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray({ message: 'Los ítems de compra deben ser una lista' })
  @ArrayMinSize(1, { message: 'Debes agregar al menos un producto a la compra' })
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseItemDto)
  items: CreatePurchaseItemDto[];
}
