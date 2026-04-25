import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './jwt.strategy';
import { RolesModule } from '../roles/roles.module';
import { AuditLogModule } from '../audit-logs/audit-log.module';

@Module({
  imports: [
    // ✅ Utilisation de forwardRef pour éviter les erreurs de dépendance circulaire
    forwardRef(() => UsersModule), 
    PassportModule,
    RolesModule,
    AuditLogModule,
    JwtModule.register({
      secret: 'SMARTSITE_SECRET_KEY',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  // ✅ INDISPENSABLE : On exporte le AuthService pour que UsersController puisse l'utiliser
  exports: [AuthService], 
})
export class AuthModule {}