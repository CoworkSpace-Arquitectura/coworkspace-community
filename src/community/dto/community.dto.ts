import { IsBoolean, IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class UpsertProfileDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  displayName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  profession?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @IsBoolean()
  visible?: boolean;
}

export class CreateEventDto {
  @IsUUID()
  locationId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsDateString()
  scheduledAt!: string;

  @IsInt()
  @Min(1)
  @Max(500)
  capacity!: number;
}

export class SendMessageDto {
  @IsUUID()
  recipientId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  body!: string;
}