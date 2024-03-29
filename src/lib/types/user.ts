import type {IArangoDocumentIdentifier} from '$lib/database';
import type {EUserRanks} from './user-ranks';

export interface IUser extends IArangoDocumentIdentifier {
  id: string;
  rank: EUserRanks;
  profile?: IUserProfile;
  avatar?: string;
  adult?: IAdult;
  // remainTags: number;
}

interface IAdult {
  approved: boolean;
  assignedAt: Date;
  bbaton: string;
}

interface IUserProfile {
  name: string;
  ext: string[];
}

export interface JwtUser {
  iss: 'https://ru.hn';
  sub: string;
  scope: 'user' | 'refresh';
  jti: string;
  iat: number;
  exp: number;
  uid: string;
  rank: EUserRanks;
}