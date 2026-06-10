import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { LessonsService } from './lessons.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('lessons')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('lessons')
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get user lessons' })
  getUserLessons(@Param('userId') userId: string) {
    return this.lessonsService.getUserLessons(userId);
  }

  @Get('user/:userId/next')
  @ApiOperation({ summary: 'Get next lesson' })
  getNext(@Param('userId') userId: string) {
    return this.lessonsService.getNextLesson(userId);
  }
}
