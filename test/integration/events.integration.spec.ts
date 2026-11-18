import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/setup-app.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { MembershipClient } from '../../src/community/membership.client.js';

/**
 * Integración: crear un evento e inscribirse respetando el cupo, con PostgreSQL real.
 * Membership (otro microservicio) se sustituye por un doble que confirma la membresía activa.
 */
describe('Eventos de la comunidad (integración con la base de datos)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const organizer = randomUUID();
  const ana = randomUUID();
  const luis = randomUUID();
  let eventId = '';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MembershipClient)
      .useValue({ assertActiveMember: () => Promise.resolve() })
      .compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    if (eventId) {
      await prisma.eventRegistration.deleteMany({ where: { eventId } });
      await prisma.event.deleteMany({ where: { id: eventId } });
    }
    await app.close();
  });

  it('crea un evento con un solo cupo y lo lista', async () => {
    const created = await request(app.getHttpServer())
      .post('/events')
      .set('x-member-id', organizer)
      .send({ locationId: randomUUID(), title: 'Taller de prueba', scheduledAt: new Date(Date.now() + 86_400_000).toISOString(), capacity: 1 })
      .expect(201);
    eventId = created.body.id as string;

    const found = await request(app.getHttpServer()).get(`/events/${eventId}`).expect(200);
    expect(found.body.title).toBe('Taller de prueba');
  });

  it('inscribe al primero y rechaza al segundo porque no quedan cupos', async () => {
    await request(app.getHttpServer()).post(`/events/${eventId}/register`).set('x-member-id', ana).expect(201);
    await request(app.getHttpServer()).post(`/events/${eventId}/register`).set('x-member-id', luis).expect(409);

    expect(await prisma.eventRegistration.count({ where: { eventId } })).toBe(1);
  });

  it('sin la identidad que pone el Gateway responde 401', async () => {
    await request(app.getHttpServer()).post(`/events/${eventId}/register`).expect(401);
  });
});
