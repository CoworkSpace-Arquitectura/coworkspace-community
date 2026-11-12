import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { CommunityModule } from './community/community.module.js';

@Module({
  imports: [PrismaModule, CommunityModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}