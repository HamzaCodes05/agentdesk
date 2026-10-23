import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateTicketDto {
  @IsEmail() customerEmail: string;
  @IsString() @MinLength(3) @MaxLength(200) subject: string;
  @IsString() @MinLength(5) @MaxLength(5000) body: string;
}

export class ApproveDto {
  /** Optional edited reply; falls back to the AI draft. */
  @IsOptional() @IsString() @MaxLength(5000) reply?: string;
}

export class RejectDto {
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}
