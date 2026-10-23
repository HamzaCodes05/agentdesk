import {
  Body,
  CanActivate,
  ConflictException,
  Controller,
  ExecutionContext,
  Global,
  Injectable,
  Module,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { Repository } from 'typeorm';
import { User } from '../entities';

const hash = (pw: string) => {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(pw, salt, 64).toString('hex')}`;
};
const verify = (pw: string, stored: string) => {
  const [salt, key] = stored.split(':');
  return timingSafeEqual(scryptSync(pw, salt, 64), Buffer.from(key, 'hex'));
};

class LoginDto {
  @IsEmail() email: string;
  @IsString() password: string;
}

class RegisterDto {
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
}

@Controller('auth')
class AuthController {
  constructor(
    private readonly jwt: JwtService,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const email = dto.email.toLowerCase();
    if (await this.users.findOneBy({ email })) throw new ConflictException('Account already exists');
    await this.users.save({ email, passwordHash: hash(dto.password) });
    return { accessToken: await this.jwt.signAsync({ sub: email, email }) };
  }

  /** Single demo staff account from env. Swap for a users table in production. */
  @Post('login')
  async login(@Body() dto: LoginDto) {
    const email = dto.email.toLowerCase();
    const user = await this.users.findOneBy({ email });
    const ok =
      (email === (process.env.ADMIN_EMAIL ?? 'admin@agentdesk.dev') &&
        dto.password === (process.env.ADMIN_PASSWORD ?? 'admin1234')) ||
      (!!user && verify(dto.password, user.passwordHash));
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    return { accessToken: await this.jwt.signAsync({ sub: 'admin', email: dto.email }) };
  }
}

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const [type, token] = (req.headers.authorization ?? '').split(' ');
    if (type !== 'Bearer' || !token) throw new UnauthorizedException();
    try {
      req.user = await this.jwt.verifyAsync(token);
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'dev-secret',
      signOptions: { expiresIn: '12h' },
    }),
  ],
  controllers: [AuthController],
  providers: [JwtGuard],
  exports: [JwtModule, JwtGuard],
})
export class AuthModule {}
