import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { UserDocument } from '../users/users.schema';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLogService } from '../audit-logs/audit-log.service';

function euclideanDistance(a: number[], b: number[]): number {
  return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0));
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    @InjectModel('Role') private roleModel: Model<any>,
    private auditLogService: AuditLogService, // ✅ injection audit
  ) {}

  // ── Login classique ───────────────────────────────────────────
  async login(email: string, password: string, meta?: { ip?: string; userAgent?: string }) {
    const user = await this.usersService['userModel'].findOne({ email });

    if (!user) {
      await this.auditLogService.log({
        action: 'LOGIN_FAILED',
        email,
        ip: meta?.ip,
        userAgent: meta?.userAgent,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      await this.auditLogService.log({
        action: 'LOGIN_FAILED',
        email,
        ip: meta?.ip,
        userAgent: meta?.userAgent,
        userId: user._id.toString(),
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.auditLogService.log({
      action: 'LOGIN_SUCCESS',
      email,
      ip: meta?.ip,
      userAgent: meta?.userAgent,
      userId: user._id.toString(),
    });

    return this.generateToken(user);
  }

  // ── Register ──────────────────────────────────────────────────
  async register(userData: any) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const newUser = new this.usersService['userModel']({
      ...userData,
      password: hashedPassword,
    });
    return newUser.save();
  }

  // ── Face Login Auto ───────────────────────────────────────────
  async faceLoginAuto(incomingDescriptor: number[], meta?: { ip?: string; userAgent?: string }) {
    const users = await this.usersService.getAllUsersWithFace();

    if (!users || users.length === 0) {
      throw new NotFoundException('No user with Face ID registered');
    }

    let bestMatch: UserDocument | null = null;
    let bestDistance = Infinity;

    for (const user of users) {
      if (!user.faceDescriptor || user.faceDescriptor.length === 0) continue;
      const distance = euclideanDistance(Array.from(user.faceDescriptor), incomingDescriptor);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestMatch = user;
      }
    }

    if (!bestMatch || bestDistance > 0.6) {
      await this.auditLogService.log({
        action: 'LOGIN_FAILED',
        email: 'unknown (face-id)',
        ip: meta?.ip,
        userAgent: meta?.userAgent,
      });
      throw new UnauthorizedException('Face not recognized');
    }

    await this.auditLogService.log({
      action: 'LOGIN_FACE_ID',
      email: bestMatch.email,
      ip: meta?.ip,
      userAgent: meta?.userAgent,
      userId: bestMatch._id.toString(),
    });

    return this.generateToken(bestMatch);
  }

  // ── Génère le JWT ─────────────────────────────────────────────
  private async generateToken(user: any) {
    const role = await this.roleModel.findById(user.roleId);
    const roleIdStr =
      user.roleId != null && typeof user.roleId === 'object' && 'toString' in user.roleId
        ? user.roleId.toString()
        : String(user.roleId ?? '');
    const payload = {
      sub: user._id?.toString?.() ?? String(user._id),
      email: user.email,
      fullName: user.fullName,
      roleId: roleIdStr,
      roleName: role?.name ?? '',
    };
    return { access_token: this.jwtService.sign(payload) };
  }
}