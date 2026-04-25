import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';



export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {

  @Prop({ required: true })
  fullName!: string;

  @Prop({ required: true, unique: true })
  email!: string;

  @Prop({ required: true })
  password!: string;

  @Prop()
  phone!: string;

  @Prop({ type: Types.ObjectId, ref: 'Role' })
  roleId!: Types.ObjectId;

  @Prop({ default: 'active' })
  status!: string;

  @Prop({ type: String, default: null })
  resetToken!: string | null;

  @Prop({ type: Date, default: null })
  resetTokenExpiration!: Date | null;

  @Prop({ type: [Number], default: null })
  faceDescriptor!: number[];
  
  @Prop({ type: String, default: null })
  profileImage!: string | null;

  /** Projet (rôle Client) : IDs liés, synchronisés depuis `Project.clientId`. */
  @Prop({ type: [Types.ObjectId], ref: 'Project', default: [] })
  projectIds!: Types.ObjectId[];
}

export const UserSchema = SchemaFactory.createForClass(User);