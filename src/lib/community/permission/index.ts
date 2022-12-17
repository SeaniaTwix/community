import {Board} from '$lib/community/board/server';
import {Article} from '$lib/community/article/server';
import {Comment} from '$lib/community/comment/server';
import {User} from '$lib/auth/user/server';
import {EUserRanks} from '$lib/types/user-ranks';
import {BitField, type BitFieldResolvable, BitFlag} from '$lib/bitfield';

export class Permission extends BitField {
  private user: User;
  constructor(bits: BitFieldResolvable = 0, private context: Board | Article | Comment, user: string | User) {
    super(bits);
    if (user instanceof User) {
      this.user = user;
    } else {
      this.user = new User(user);
    }
  }

  static FLAGS = {
    READ_POST: BitFlag(0),
    WRITE_POST: BitFlag(1),
    EDIT_POST: BitFlag(2),
    DELETE_POST: BitFlag(3),
    MANAGE_POST: BitFlag(4),
    VIEW_LIST: BitFlag(5),
    READ_COMMENT: BitFlag(6),
    VIEW_BOARDLIST: BitFlag(7),
    WRITE_COMMENT: BitFlag(8),
    EDIT_COMMENT: BitFlag(9),
    DELETE_COMMENT: BitFlag(10),
    MANAGE_COMMENT: BitFlag(11),
    NEW_BOARD: BitFlag(12),
    DELETE_BOARD: BitFlag(13),
    RENAME_BOARD: BitFlag(14),
    LOCK_BOARD: BitFlag(15),
    BAN_USER_PERMANENTLY: BitFlag(16),
    BAN_USER_TEMPORARY: BitFlag(17),
    REORDER_BOARD: BitFlag(18),
    ADULT: BitFlag(19),
    CHANGE_PUB_BOARD: BitFlag(20),
    CHANGE_USER_GRANT: BitFlag(21),
    CHANGE_USER_PERMISSION: BitFlag(22),
    CHANGE_USERNAME: BitFlag(23),
    ADD_TAG: BitFlag(24),
    REMOVE_TAG: BitFlag(25),
    REMOVE_OWN_TAG: BitFlag(26),
    VIEW_TAG_OWNER: BitFlag(27),
  };

  async own(permission: Permissions): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      if (await this.user.rank <= EUserRanks.Banned) {
        return false;
      }

      if (this.context instanceof Board) {

      } else if (this.context instanceof Article) {

      } else if (this.context instanceof Comment) {

      }
      return false;
    });
  }

  get isReadable(): Promise<boolean> {
    return new Promise(() => {

    });
  }
}

export type Permissions = 'read' | 'write' | 'delete' | 'edit';
export type UserPermissions = boolean | AdultCertification | [boolean, AdultCertification];
enum AdultCertification {
  None,
  Minors,
  Adults,
}