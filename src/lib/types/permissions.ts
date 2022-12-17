import type {EUserRanks} from '$lib/types/user-ranks';

/**
 * `boolean` - true일 경우 언제나 허가, false일 경우 언제나 불허
 * `IPermissionDetail.min` - 해당 권한이거나 보다 높으면 허가
 * `IPermissionDetail.UserID` - 해당 uid를 가진 유저가 `.min` 값에 따라 권한을 가짐
 *                            만약 유저가 `.User` 권한이고 `.min`이 `.Admin`이면 해당 유저만 사용 불가능
 */
export type PermissionType = boolean | IPermissionDetail;

export interface IPermissions {
  read: PermissionType;
  write: PermissionType;
  edit: PermissionType;
  delete: PermissionType;
  manage: PermissionType;
}

type UserID = string;

interface IPermissionDetail {
  min?: EUserRanks;
  user?: UserID;
}