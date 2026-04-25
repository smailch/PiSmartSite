import { Transporter } from './../../node_modules/@types/nodemailer/index.d';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, } from './users.schema';
import { UserDocument } from '../users/users.schema';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';
console.log("MAIL_USER =", process.env.MAIL_USER);
console.log("MAIL_PASS =", process.env.MAIL_PASS);

@Injectable()
export class UsersService {
  

  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {}

  // CREATE
  async create(data: any): Promise<User> {

    // 🔐 Hash password
    const salt = await bcrypt.genSalt(10);
    data.password = await bcrypt.hash(data.password, salt);

    if (data.roleId != null && typeof data.roleId === 'string') {
      data.roleId = new Types.ObjectId(data.roleId);
    }

    const user = new this.userModel(data);
    return user.save();
  }

  // READ ALL (sans password)
 async findAll(): Promise<User[]> {
  return this.userModel.find().populate('roleId').select('-password');
}

  // READ ONE (sans password)
  async findOne(id: string): Promise<User> {
    const user = await this.userModel
      .findById(id)
      .select('-password')
      .populate('roleId');

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // UPDATE
  async update(id: string, data: any): Promise<User> {

    if (data.password) {
      const salt = await bcrypt.genSalt(10);
      data.password = await bcrypt.hash(data.password, salt);
    }

    const user = await this.userModel
      .findByIdAndUpdate(id, data, { new: true })
      .select('-password');

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // DELETE
  async remove(id: string) {
    const user = await this.userModel.findByIdAndDelete(id);
    if (!user) throw new NotFoundException('User not found');
    return { message: 'User deleted successfully' };
  }



async forgotPassword(email: string) {

  const user = await this.userModel.findOne({ email });

  if (!user) {
    throw new NotFoundException("Ce mail n'est pas valide");
  }

  const resetToken = crypto.randomBytes(32).toString('hex');

  user.resetToken = resetToken;
  user.resetTokenExpiration = new Date(Date.now() + 3600000);

  await user.save();

  try {

    const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: "ahmedallaya@gmail.com",      
    pass: "geoxxnbjwubxpmbu",    
  },
});

    const resetLink = `http://localhost:3000/reset-password/${resetToken}`;

    await transporter.sendMail({
      from: `"Smartsite" <${process.env.MAIL_USER}>`,
      to: user.email,
      subject: 'Smartsite – Réinitialisation de votre mot de passe',
      html: `
        <!DOCTYPE html><html><head><meta charset="UTF-8"/>
        <style>
          body{font-family:'Segoe UI',sans-serif;background:#f4f6fb;margin:0;padding:0}
          .wrapper{max-width:520px;margin:40px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)}
          .header{background:#132849;padding:32px;text-align:center}
          .header h1{color:#FACC15;margin:0;font-size:28px;letter-spacing:1px}
          .body{padding:40px 36px}
          .body p{color:#444;font-size:15px;line-height:1.7;margin:0 0 16px}
          .btn{display:inline-block;margin:24px 0;padding:14px 32px;background:#FACC15;color:#000;font-weight:700;font-size:15px;border-radius:8px;text-decoration:none}
          .footer{background:#f4f6fb;text-align:center;padding:20px;color:#aaa;font-size:12px}
        </style></head>
        <body><div class="wrapper">
          <div class="header"><h1>Smartsite</h1></div>
          <div class="body">
            <p>Bonjour,</p>
            <p>Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous :</p>
            <a href="${resetLink}" class="btn">Réinitialiser mon mot de passe</a>
            <p>Ce lien est valable pendant <strong>1 heure</strong>. Si vous n'avez pas fait cette demande, ignorez cet email.</p>
          </div>
          <div class="footer">© 2025 Smartsite – Tous droits réservés</div>
        </div></body></html>
      `,
    });

  } catch (error) {
    console.error("Erreur SMTP:", error);
    throw new Error("EMAIL_SEND_FAILED");
  }

  return { message: 'EMAIL_SENT' };
}




async resetPassword(token: string, newPassword: string) {

  const user = await this.userModel.findOne({
    resetToken: token,
    resetTokenExpiration: { $gt: new Date() },
  });

  if (!user) {
    throw new Error('TOKEN_INVALID');
  }

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(newPassword, salt);

  user.resetToken = null;
  user.resetTokenExpiration = null;

  await user.save();

  return { message: 'PASSWORD_UPDATED' };
}

async findByEmail(email: string) {
  return this.userModel.findOne({ email });
}

async saveFaceDescriptor(userId: string, descriptor: number[]): Promise<void> {
  console.log('saveFaceDescriptor userId:', userId, 'descriptor length:', descriptor?.length);
  const result = await this.userModel.findByIdAndUpdate(
    userId,
    { faceDescriptor: descriptor },
    { new: true }
  );
  console.log('Updated user faceDescriptor length:', result?.faceDescriptor?.length);
}

async getAllUsersWithFace() {
  return this.userModel.find({
    faceDescriptor: { $exists: true, $ne: [] }
  });
}


}