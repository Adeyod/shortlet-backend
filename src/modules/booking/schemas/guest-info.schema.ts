import { Prop, Schema } from '@nestjs/mongoose';

@Schema({ _id: false })
export class GuestInfo {
  @Prop({ required: true })
  firstName!: string;

  @Prop({ required: true })
  lastName!: string;

  @Prop({ required: true })
  email!: string;

  @Prop({ required: true })
  phoneNumber!: string;
}
