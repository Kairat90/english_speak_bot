import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min } from 'class-validator';

export class SubmitTaskAnswerDto {
  @ApiProperty()
  @IsString()
  taskId: string;

  @ApiProperty()
  @IsString()
  userAnswer: string;

  @ApiPropertyOptional({ default: 'text' })
  @IsOptional()
  @IsString()
  answerType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  durationSec?: number;
}

export class CreateTaskDto {
  @ApiProperty()
  @IsString()
  type: string;

  @ApiProperty()
  @IsString()
  skill: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  content: object;

  @ApiProperty()
  @IsString()
  level: string;
}
