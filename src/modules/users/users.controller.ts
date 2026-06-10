import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserProfileDto, UpdateSkillLevelDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch(':id/profile')
  @ApiOperation({ summary: 'Update user profile' })
  updateProfile(@Param('id') id: string, @Body() dto: UpdateUserProfileDto) {
    return this.usersService.updateProfile(id, dto);
  }

  @Patch(':id/skills')
  @ApiOperation({ summary: 'Update skill level' })
  updateSkill(@Param('id') id: string, @Body() dto: UpdateSkillLevelDto) {
    return this.usersService.updateSkillLevel(id, dto);
  }
}
