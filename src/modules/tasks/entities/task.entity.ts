import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TaskEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  skill: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  content: object;

  @ApiProperty()
  level: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  passScore: number;
}

export class TaskAttemptEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  attemptNum: number;

  @ApiPropertyOptional()
  score?: number | null;

  @ApiProperty()
  passed: boolean;

  @ApiPropertyOptional()
  errors?: object;

  @ApiProperty()
  createdAt: Date;
}
