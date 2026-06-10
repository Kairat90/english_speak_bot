import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User, UserSkill, SkillType, CEFRLevel } from '@prisma/client';

export class UserEntity implements Partial<User> {
  @ApiProperty()
  id: string;

  @ApiProperty()
  telegramId: bigint;

  @ApiPropertyOptional()
  username?: string | null;

  @ApiPropertyOptional()
  displayName?: string | null;

  @ApiPropertyOptional()
  learningGoal?: string | null;

  @ApiProperty()
  dailyMinutes: number;

  @ApiProperty()
  isOnboarded: boolean;

  @ApiProperty()
  rating: number;

  @ApiProperty()
  createdAt: Date;
}

export class UserSkillEntity implements Partial<UserSkill> {
  @ApiProperty({ enum: SkillType })
  skill: SkillType;

  @ApiProperty({ enum: CEFRLevel })
  level: CEFRLevel;

  @ApiProperty()
  score: number;
}
