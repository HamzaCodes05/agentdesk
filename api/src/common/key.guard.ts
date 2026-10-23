import { CanActivate, ExecutionContext, Injectable, Type, UnauthorizedException } from '@nestjs/common';

/** Builds a guard that requires `header` to equal the value of env var `env`. */
export function KeyGuard(header: string, env: string): Type<CanActivate> {
  @Injectable()
  class HeaderKeyGuard implements CanActivate {
    canActivate(ctx: ExecutionContext): boolean {
      const expected = process.env[env];
      const got = ctx.switchToHttp().getRequest().headers[header];
      if (!expected || got !== expected) throw new UnauthorizedException();
      return true;
    }
  }
  return HeaderKeyGuard;
}

export const InternalKeyGuard = KeyGuard('x-internal-key', 'INTERNAL_API_KEY');
export const WebhookGuard = KeyGuard('x-webhook-key', 'WEBHOOK_KEY');
