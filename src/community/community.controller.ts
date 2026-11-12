import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { CommunityService } from './community.service.js';
import { CurrentMember } from './current-member.decorator.js';
import { CreateEventDto, SendMessageDto, UpsertProfileDto } from './dto/community.dto.js';

@Controller('directory')
export class DirectoryController {
  constructor(private readonly community: CommunityService) {}

  @Put('me')
  upsertProfile(@CurrentMember() memberId: string, @Body() dto: UpsertProfileDto) {
    return this.community.upsertProfile(memberId, dto);
  }

  @Get('me')
  getProfile(@CurrentMember() memberId: string) {
    return this.community.getProfile(memberId);
  }

  @Get()
  directory(@CurrentMember() memberId: string, @Query('search') search?: string) {
    return this.community.directory(memberId, search);
  }
}

@Controller('events')
export class EventsController {
  constructor(private readonly community: CommunityService) {}

  @Get()
  listEvents(@Query('locationId') locationId?: string) {
    return this.community.listEvents(locationId);
  }

  @Get(':id')
  findEvent(@Param('id', ParseUUIDPipe) id: string) {
    return this.community.findEvent(id);
  }

  @Post()
  createEvent(@CurrentMember() memberId: string, @Body() dto: CreateEventDto) {
    return this.community.createEvent(memberId, dto);
  }

  @Post(':id/register')
  register(@CurrentMember() memberId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.community.register(memberId, id);
  }
}

@Controller('messages')
export class MessagesController {
  constructor(private readonly community: CommunityService) {}

  @Post()
  send(@CurrentMember() memberId: string, @Body() dto: SendMessageDto) {
    return this.community.sendMessage(memberId, dto);
  }

  @Get()
  inbox(@CurrentMember() memberId: string) {
    return this.community.inbox(memberId);
  }

  @Patch(':id/read')
  markRead(@CurrentMember() memberId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.community.markRead(memberId, id);
  }
}