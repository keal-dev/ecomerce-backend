import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsIn,
  MaxLength,
} from 'class-validator';

export class UpdateBannerDto {
  @IsOptional()
  @IsString({ message: 'El título debe ser una cadena de texto' })
  title?: string;

  @IsOptional()
  @IsString({ message: 'La URL de la imagen debe ser una cadena de texto' })
  imageUrl?: string;

  @IsOptional()
  @IsString({ message: 'El enlace o slug debe ser una cadena de texto' })
  linkUrl?: string | null;

  @IsOptional()
  @IsIn(['image', 'button'], { message: 'linkMode debe ser "image" o "button"' })
  linkMode?: 'image' | 'button';

  @IsOptional()
  @IsString({ message: 'El texto del botón debe ser una cadena de texto' })
  @MaxLength(60, { message: 'El texto del botón no debe superar 60 caracteres' })
  buttonText?: string | null;

  @IsOptional()
  @IsIn(['bottom-left', 'bottom-center', 'bottom-right', 'center'], {
    message: 'buttonPosition no es válido',
  })
  buttonPosition?: 'bottom-left' | 'bottom-center' | 'bottom-right' | 'center';

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
