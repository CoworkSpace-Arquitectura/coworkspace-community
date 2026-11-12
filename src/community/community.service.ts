import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { MembershipClient } from './membership.client.js';
import { CreateEventDto, SendMessageDto, UpsertProfileDto } from './dto/community.dto.js';

@Injectable()
export class CommunityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipClient,
  ) {}

  // ---------- Directorio ----------

  async upsertProfile(memberId: string, dto: UpsertProfileDto) {
    await this.membership.assertActiveMember(memberId);
    const { displayName, profession, bio, visible } = dto;
    return this.prisma.memberProfile.upsert({
      where: { memberId },
      create: { memberId, displayName, profession, bio: bio ?? '', visible: visible ?? true },
      update: { displayName, profession, bio, visible },
    });
  }

  async getProfile(memberId: string) {
    const profile = await this.prisma.memberProfile.findUnique({ where: { memberId } });
    if (!profile) {
      throw new NotFoundException('Aún no has creado tu perfil en el directorio');
    }
    return profile;
  }

  async directory(memberId: string, search?: string) {
    await this.membership.assertActiveMember(memberId);
    return this.prisma.memberProfile.findMany({
      where: {
        visible: true,
        OR: search
          ? [
              { displayName: { contains: search, mode: 'insensitive' } },
              { profession: { contains: search, mode: 'insensitive' } },
            ]
          : undefined,
      },
      select: { memberId: true, displayName: true, profession: true, bio: true },
      orderBy: { displayName: 'asc' },
    });
  }

  // ---------- Eventos de networking ----------

  async createEvent(memberId: string, dto: CreateEventDto) {
    await this.membership.assertActiveMember(memberId);
    const scheduledAt = new Date(dto.scheduledAt);
    if (scheduledAt <= new Date()) {
      throw new BadRequestException('El evento debe programarse en el futuro');
    }
    const { locationId, title, description, capacity } = dto;
    return this.prisma.event.create({
      data: { locationId, title, description: description ?? '', capacity, scheduledAt, createdBy: memberId },
    });
  }

  listEvents(locationId?: string) {
    return this.prisma.event.findMany({
      where: { locationId, scheduledAt: { gte: new Date() } },
      include: { _count: { select: { registrations: true } } },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async findEvent(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: { _count: { select: { registrations: true } } },
    });
    if (!event) {
      throw new NotFoundException(`Evento ${id} no encontrado`);
    }
    return event;
  }

  async register(memberId: string, eventId: string) {
    await this.membership.assertActiveMember(memberId);
    return this.prisma.$transaction(async (tx) => {
      const event = await tx.event.findUnique({
        where: { id: eventId },
        include: { _count: { select: { registrations: true } } },
      });
      if (!event) {
        throw new NotFoundException(`Evento ${eventId} no encontrado`);
      }
      if (event.scheduledAt <= new Date()) {
        throw new BadRequestException('El evento ya ocurrió');
      }
      const existing = await tx.eventRegistration.findUnique({
        where: { eventId_memberId: { eventId, memberId } },
      });
      if (existing) {
        throw new ConflictException('Ya estás inscrito en este evento');
      }
      if (event._count.registrations >= event.capacity) {
        throw new ConflictException('El evento no tiene cupos disponibles');
      }
      return tx.eventRegistration.create({ data: { eventId, memberId } });
    });
  }

  // ---------- Mensajes ----------

  async sendMessage(senderId: string, dto: SendMessageDto) {
    if (dto.recipientId === senderId) {
      throw new BadRequestException('No puedes enviarte mensajes a ti mismo');
    }
    await this.membership.assertActiveMember(senderId);
    const recipient = await this.prisma.memberProfile.findUnique({ where: { memberId: dto.recipientId } });
    if (!recipient?.visible) {
      throw new NotFoundException('El destinatario no está en el directorio');
    }
    return this.prisma.message.create({
      data: { senderId, recipientId: dto.recipientId, body: dto.body },
    });
  }

  inbox(memberId: string) {
    return this.prisma.message.findMany({
      where: { OR: [{ recipientId: memberId }, { senderId: memberId }] },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markRead(memberId: string, messageId: string) {
    const { count } = await this.prisma.message.updateMany({
      where: { id: messageId, recipientId: memberId, readAt: null },
      data: { readAt: new Date() },
    });
    if (count === 0) {
      const message = await this.prisma.message.findFirst({ where: { id: messageId, recipientId: memberId } });
      if (!message) {
        throw new NotFoundException(`Mensaje ${messageId} no encontrado`);
      }
    }
    return { messageId, read: true };
  }
}