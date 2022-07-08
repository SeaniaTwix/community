import type {Article} from '$lib/community/article/server';
import type {User} from '$lib/auth/user/server';
import type {IComment} from '$lib/types/comment';

export class Comment {
  constructor(private readonly id: string) {
  }

  static async new(relative: Article, author: User, content: string): Promise<Comment> {
    const aid = relative.id;
    const uid = await author.uid;

    // todo

    return new Comment('');
  }

  edit(newContent: string) {
    //
  }

  del() {
    //
  }

}