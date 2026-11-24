import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ClaimStatus } from '../entities/claim.entity';

export class RespondClaimDto {
  @IsEnum(ClaimStatus, {
    message: 'Estado inválido. Valores permitidos: pending, in_review, resolved.',
  })
  status: ClaimStatus;

  @IsString()
  @IsNotEmpty({ message: 'La respuesta oficial es obligatoria.' })
  adminResponse: string;
}
