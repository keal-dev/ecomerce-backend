import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateClaimDto {
  @IsOptional()
  @IsBoolean()
  isMinor?: boolean;

  @IsOptional()
  @IsString()
  tutorName?: string;

  @IsOptional()
  @IsString()
  tutorDocType?: string;

  @IsOptional()
  @IsString()
  tutorDocNumber?: string;

  @IsOptional()
  @IsString()
  tutorPhone?: string;

  @IsString()
  @IsNotEmpty({ message: 'El tipo de documento es obligatorio.' })
  docType: string;

  @IsString()
  @IsNotEmpty({ message: 'El número de documento es obligatorio.' })
  docNumber: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre completo del consumidor es obligatorio.' })
  fullName: string;

  @IsEmail({}, { message: 'El correo electrónico no es válido.' })
  @IsNotEmpty({ message: 'El correo electrónico es obligatorio.' })
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @IsNotEmpty({ message: 'El departamento es obligatorio.' })
  department: string;

  @IsString()
  @IsNotEmpty({ message: 'La provincia es obligatoria.' })
  province: string;

  @IsString()
  @IsNotEmpty({ message: 'El distrito es obligatorio.' })
  district: string;

  @IsString()
  @IsNotEmpty({ message: 'La dirección domiciliaria es obligatoria.' })
  address: string;

  @IsString()
  @IsIn(['producto', 'servicio'], {
    message: 'El tipo de bien debe ser producto o servicio.',
  })
  contractType: 'producto' | 'servicio';

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'El monto reclamado debe ser numérico.' })
  @Min(0, { message: 'El monto reclamado no puede ser negativo.' })
  claimedAmount?: number;

  @IsOptional()
  @IsString()
  orderNumber?: string;

  @IsString()
  @IsNotEmpty({
    message: 'La descripción del producto o servicio es obligatoria.',
  })
  contractDescription: string;

  @IsString()
  @IsIn(['reclamo', 'queja'], {
    message: 'El tipo debe ser reclamo o queja.',
  })
  claimType: 'reclamo' | 'queja';

  @IsString()
  @IsNotEmpty({ message: 'El detalle de los hechos es obligatorio.' })
  claimDetail: string;

  @IsString()
  @IsNotEmpty({ message: 'El pedido concreto es obligatorio.' })
  claimRequest: string;
}
