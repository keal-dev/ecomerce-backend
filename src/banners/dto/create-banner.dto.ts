import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsNumber,
} from 'class-validator';

export class CreateBannerDto {
  @IsString({ message: 'El título debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El título es obligatorio' })
  title: string;

  @IsString({ message: 'La URL de la imagen debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La URL de la imagen es obligatoria' })
  imageUrl: string;

  @IsOptional()
  @IsString({ message: 'El enlace o slug debe ser una cadena de texto' })
  linkUrl?: string;

  @IsOptional()
  @IsString({ message: 'El tipo debe ser una cadena de texto' })
  type?: string;

  @IsOptional()
  @IsNumber({}, { message: 'El orden debe ser un número entero' })
  order?: number;

  @IsOptional()
  @IsBoolean({ message: 'isActive debe ser un valor booleano' })
  isActive?: boolean;
}
