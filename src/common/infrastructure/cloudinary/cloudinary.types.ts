import { MediaType } from '../enums/file-type.enum';

export type CloudinaryResponse = {
  url: string;
  publicUrl: string;
  type: MediaType;
};
