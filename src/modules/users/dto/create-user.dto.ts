import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min, Max, IsEnum } from 'class-validator';
import { OnboardingStep } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({ example: '123456789' })
  @IsString()
  telegramId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastName?: string;
}

export class UpdateUserProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  learningGoal?: string;

  @ApiPropertyOptional({ minimum: 5, maximum: 180 })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(180)
  dailyMinutes?: number;
}

export class UpdateSkillLevelDto {
  @ApiProperty({ enum: ['SPEAKING', 'LISTENING', 'VOCABULARY', 'GRAMMAR', 'READING', 'WRITING'] })
  @IsString()
  skill: string;

  @ApiProperty({ enum: ['BEGINNER', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'] })
  @IsString()
  level: string;
}

export class OnboardingAnswerDto {
  @ApiProperty({ enum: OnboardingStep })
  @IsEnum(OnboardingStep)
  step: OnboardingStep;

  @ApiProperty()
  @IsString()
  answer: string;
}
