import type {IUser} from '$lib/types/user';
import {Entity, SafeType} from 'dto-mapping';

/**
 * 게시판을 볼 때 목록으로 전송되는 게시글 목록의 요소입니다.
 */
@Entity()
export class ArticleItemDto {

  _key = '';

  // 자동 태그 (페이지 전용)
  autoTag?: string;

  @SafeType({type: String})
  title?: string;

  author?: IUser;

  @SafeType({type: Object})
  tags: Rec<number> = {};

  @SafeType({type: Number})
  views = 0;

  @SafeType({type: Date})
  createdAt = new Date(); //

  editedAt?: Date;

  images = false;

  locked = false;
}