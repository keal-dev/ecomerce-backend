import type { Request } from 'express';
import { User } from '../../users/entities/user.entity';

export interface AuthenticatedRequest extends Request {
  clerkUserId?: string;
  clerkPayload?: Record<string, unknown>;
  dbUser?: User | null;
}
