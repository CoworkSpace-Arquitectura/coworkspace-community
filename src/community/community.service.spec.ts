import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommunityService } from './community.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { MembershipClient } from './membership.client.js';

describe('CommunityService', () => {
  const tx = {
    event: { findUnique: vi.fn() },
    eventRegistration: { findUnique: vi.fn(), create: vi.fn() },
  };
  const prisma = {
    $transaction: vi.fn((fn: (client: typeof tx) => Promise<unknown>) => fn(tx)),
    memberProfile: { findMany: vi.fn(), findUnique: vi.fn(), upsert: vi.fn() },
    event: { create: vi.fn() },
    message: { create: vi.fn() },
  };
  const membership = { assertActiveMember: vi.fn() };
  let service: CommunityService;

  const futureEvent = (registrations: number) => ({
    id: 'event-1',
    capacity: 1,
    scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    _count: { registrations },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CommunityService(prisma as unknown as PrismaService, membership as unknown as MembershipClient);
    membership.assertActiveMember.mockResolvedValue(undefined);
  });

  it('no muestra el directorio a quien no tiene membresía activa', async () => {
    membership.assertActiveMember.mockRejectedValue(new ForbiddenException());

    await expect(service.directory('member-1')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.memberProfile.findMany).not.toHaveBeenCalled();
  });

  it('inscribe a un miembro si hay cupo', async () => {
    tx.event.findUnique.mockResolvedValue(futureEvent(0));
    tx.eventRegistration.findUnique.mockResolvedValue(null);
    tx.eventRegistration.create.mockResolvedValue({ id: 'reg-1' });

    await service.register('member-1', 'event-1');

    expect(tx.eventRegistration.create).toHaveBeenCalledWith({ data: { eventId: 'event-1', memberId: 'member-1' } });
  });

  it('rechaza la inscripción si no hay cupos', async () => {
    tx.event.findUnique.mockResolvedValue(futureEvent(1));
    tx.eventRegistration.findUnique.mockResolvedValue(null);

    await expect(service.register('member-2', 'event-1')).rejects.toBeInstanceOf(ConflictException);
    expect(tx.eventRegistration.create).not.toHaveBeenCalled();
  });

  it('rechaza una inscripción repetida', async () => {
    tx.event.findUnique.mockResolvedValue(futureEvent(0));
    tx.eventRegistration.findUnique.mockResolvedValue({ id: 'reg-1' });

    await expect(service.register('member-1', 'event-1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('no permite crear eventos en el pasado', async () => {
    const dto = {
      locationId: '11111111-1111-4111-8111-111111111111',
      title: 'Evento viejo',
      scheduledAt: '2020-01-01T00:00:00.000Z',
      capacity: 10,
    };

    await expect(service.createEvent('member-1', dto)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.event.create).not.toHaveBeenCalled();
  });

  it('no permite enviarse mensajes a uno mismo', async () => {
    await expect(
      service.sendMessage('member-1', { recipientId: 'member-1', body: 'Hola' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(membership.assertActiveMember).not.toHaveBeenCalled();
  });

  it('no envía mensajes a quien no está visible en el directorio', async () => {
    prisma.memberProfile.findUnique.mockResolvedValue({ memberId: 'member-2', visible: false });

    await expect(
      service.sendMessage('member-1', { recipientId: 'member-2', body: 'Hola' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.message.create).not.toHaveBeenCalled();
  });
});