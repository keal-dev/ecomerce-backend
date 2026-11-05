import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCategoryDto {
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  href?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  badge?: string;
}
