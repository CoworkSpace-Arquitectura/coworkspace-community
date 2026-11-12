import { createParamDecorator, UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Lee la identidad que el API Gateway agregó después de validar el token
export const CurrentMember = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<Request>();
  const memberId = request.headers['x-member-id'];
  if (typeof memberId !== 'string' || !UUID.test(memberId)) {
    throw new UnauthorizedException('Falta la identidad del miembro');
  }
  return memberId;
});