import { Types } from 'mongoose';

export interface JwtUser {
  sub: Types.ObjectId;
  email: string;
  role: string;
}
