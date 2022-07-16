import type {IUser} from '$lib/types/user';
import {Entity, SafeType} from 'dto-mapping';

/**
 * 게시판을 볼 때 목록으로 전송되는 게시글 목록의 요소입니다.
 */
@Entity()
export class ArticleItemDto {

  // 자동 태그 (페이지 전용)
  autoTag?: string;

  @SafeType({type: String})
  title?: string;

  author?: IUser;

  @SafeType({type: Object})
  tags: Rec<number> = {};

  @SafeType({type: Number})
  view = 0;

  @SafeType({type: Date})
  createAt = new Date(); //

}