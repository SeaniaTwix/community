import type {Permissions} from '$lib/community/permission/server';

type permissions = typeof Permissions.FLAGS;
export type PermissionsFlags = keyof permissions;

export const names: Record<PermissionsFlags, string> = {
  ADD_TAG: '태그 추가',
  ADULT: '성인',
  ALL: '모두 (관리자)',
  BAN_USER_PERMANENTLY: '사용자 영구밴',
  BAN_USER_TEMPORARY: '사용자 임시밴',
  CHANGE_PUB_BOARD: '게시판 가시성 변경',
  CHANGE_USERNAME: '사용자 이름 변경',
  CHANGE_USER_GRANT: '사용자 등급 변경',
  CHANGE_USER_PERMISSION: '사용자 권한 변경',
  DELETE_ARTICLE: '게시글 삭제',
  DELETE_BOARD: '게시판 삭제',
  DELETE_COMMENT: '댓글 삭제',
  EDIT_ARTICLE: '게시글 편집',
  EDIT_COMMENT: '댓글 편집',
  LOCK_BOARD: '게시판 잠금',
  MANAGE_ARTICLE: '게시글 관리',
  MANAGE_BOARD: '게시판 관리',
  MANAGE_COMMENT: '댓글 관리',
  NEW_BOARD: '새 게시판 생성',
  READ_ARTICLE: '게시글 읽기',
  READ_COMMENT: '댓글 읽기',
  REMOVE_OWN_TAG: '소유한 태그 지우기',
  REMOVE_TAG: '태그 지우기',
  RENAME_BOARD: '게시판 이름 변경',
  REORDER_BOARD: '게시판 순서 변경',
  VIEW_BOARDLIST: '게시판 목록 보기',
  VIEW_ARTICLELIST: '게시글 목록 보기',
  VIEW_TAG_OWNER: '태그 작성자 목록 보기',
  WRITE_ARTICLE: '게시글 쓰기',
  WRITE_COMMENT: '댓글 쓰기',
};

export default names;