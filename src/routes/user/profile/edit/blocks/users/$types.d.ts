import {IUser} from '$lib/types/user';

interface PageDataInternal {
  blocked: Array<{key: string, reason: string}>;
  // url search param에서 id가 넘어왔을 때 서버사이드 렌더링 용
  user?: IUser;
  // blocked.key based user data records...
  users: Record<string, IUser>;
  userId: string;
}

export type PageData = PageDataInternal;