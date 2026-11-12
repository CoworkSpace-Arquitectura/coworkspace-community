import { Module } from '@nestjs/common';
import { CommunityService } from './community.service.js';
import { MembershipClient } from './membership.client.js';
import { DirectoryController, EventsController, MessagesController } from './community.controller.js';

@Module({
  controllers: [DirectoryController, EventsController, MessagesController],
  providers: [CommunityService, MembershipClient],
})
export class CommunityModule {}