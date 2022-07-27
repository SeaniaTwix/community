import type {RequestEvent, RequestHandlerOutput} from '@sveltejs/kit';
import db from '$lib/database/instance';
import {aql} from 'arangojs';
import {isEmpty, toInteger} from 'lodash-es';
import {Article} from '$lib/community/article/server';
import HttpStatus from 'http-status-codes';
import {CommentDto} from '$lib/types/dto/comment.dto';
import type {PublicVoteType} from '$lib/types/dto/comment.dto';
import {Pusher} from '$lib/pusher/server';
import {isStringInteger} from '$lib/util';
import type {IArangoDocumentIdentifier} from '$lib/database';
import {UrlRegexSafe} from '$lib/url-regex-safe';
import {unified} from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import {Notifications} from '$lib/notifications/server';
import {User} from '$lib/auth/user/server';
import type {IComment} from '$lib/types/comment';
import {Comment} from '$lib/community/comment/server';

export async function GET({params, url, locals}: RequestEvent): Promise<RequestHandlerOutput> {
  const {article} = params;
  const comment = new CommentRequest(article);
  if (!await comment.article.exists) {
    return {
      status: HttpStatus.BAD_GATEWAY,
      body: {
        reason: 'article is not exists',
      },
    };
  }
  const paramPage = url.searchParams.get('page') ?? '1';
  const page = isStringInteger(paramPage) ? toInteger(paramPage) : 1;
  const paramAmount = url.searchParams.get('amount') ?? '50';
  const amount = Math.max(
    isStringInteger(paramAmount) ? toInteger(paramAmount) : 50, 50);
  const comments: (CommentDto & IArangoDocumentIdentifier)[] = await comment.list(amount, page) ?? [];

  return {
    status: HttpStatus.OK,
    body: {
      comments: await Promise.all(comments.map(async (comment) => {
        if (!Object.hasOwn(comment, 'votes')) {
          comment.myVote = {like: false, dislike: false};
          return comment;
        }
        const pubVoteResult = {like: 0, dislike: 0};
        for (const vote of Object.values(comment.votes)) {
          if (vote) {
            pubVoteResult[vote.type] += 1;
          }
        }
        (<CommentDto<PublicVoteType>>comment).votes = pubVoteResult;
        try {
          if (locals.user?.uid) {
            const cursor = await db.query(aql`
            for comment in comments
              filter comment._key == ${comment._key}
                return comment.votes[${locals.user.uid}].type`);
            const type = await cursor.next() as 'like' | 'dislike';
            if (type) {
              comment.myVote = {like: false, dislike: false};
              comment.myVote[type] = true;
            }
          }
        } catch (e) {
          console.log('comment.ts:', e);
        }

        return comment;
      }) as any[]),
    },
  };
}

export async function POST({params, request, locals}: RequestEvent): Promise<RequestHandlerOutput> {
  const {id, article} = params;

  const comment = new CommentRequest(article);

  try {
    const articleData = await comment.article.get();

    if (!articleData || articleData.board !== id) {
      return {
        status: HttpStatus.BAD_GATEWAY,
        body: {
          reason: 'article is not exists',
        },
      };
    }
  } catch (e: any) {
    return {
      status: HttpStatus.BAD_GATEWAY,
      body: {
        reason: e.toString(),
      },
    };
  }

  const data = await request.json();


  let commentData: CommentDto;
  try {
    commentData = new CommentDto(data);

    if (isEmpty(commentData.content) && isEmpty(commentData.image)) {
      return {
        status: HttpStatus.NOT_ACCEPTABLE,
        body: {
          reason: 'content is require'
        }
      }
    }

  } catch (e) {
    return {
      status: HttpStatus.BAD_GATEWAY,
      body: {
        reason: e as any,
      },
    };
  }
  // console.log(commentData);

  let cd: CommentDto;
  let savedComment: IComment;

  try {
    if (!locals.user) {
      // noinspection ExceptionCaughtLocallyJS
      throw new Error('user invalid');
    }

    let content = commentData.content ?? '';

    const sanitized = await unified()
      .use(rehypeParse, {fragment: true})
      .use(rehypeSanitize, {
        tagNames: [],
      })
      .use(rehypeStringify)
      .process(content ?? '');

    const urlFound = sanitized.value.toString().match(UrlRegexSafe());

    if (urlFound) {
      content = content
        .split('\n')
        .map((line) => {
          return line.split(' ')
            .map((text) => {
              if (urlFound.includes(text)) {
                const protocolExists = /^https?:\/\//.test(text);
                const full = protocolExists ? text : `https://${text}`;
                return `<a class="text-sky-300 hover:text-sky-400 transition-colors select-text" href="${full}">${full}</a>`;
              } else {
                return `<span>${text}</span>`;
              }
            })
            .join(' ');
        }).join('\n');
    }

    cd = {
      votes: {},
      article: commentData.article,
      content,
      pub: true,
      // relative: commentData.relative,
    };

    if (commentData.image) {
      cd.image = commentData.image;
    }

    if (isEmpty(content) && !cd.image) {
      return {
        status: HttpStatus.BAD_REQUEST,
        body: {
          reason: 'you have to write more than one character or upload image',
        },
      };
    }

    if (commentData.relative) {
      const replyTarget = new Comment(commentData.relative);
      if (!await replyTarget.exists()) {
        return {
          status: HttpStatus.NOT_FOUND,
          body: {
            reason: 'relative target not found',
          }
        }
      }

      cd.relative = commentData.relative;
    }

    savedComment = await comment.add(locals.user.uid, cd);

  } catch (e: any) {
    return {
      status: HttpStatus.BAD_GATEWAY,
      body: {
        reason: e.toString(),
      },
    };
  }

  try {
    if (savedComment) {
      await Pusher.notify('comments', `${article}@${id}`, locals.user.uid, {...cd, _key: savedComment._key});
    }
  } catch (e) {
    console.error(e);
  }

  try {
    if (cd) {
      const {author} = await comment.article.get();
      const user = await User.findByUniqueId(author);
      if (user) {
        const noti = new Notifications(user);
        noti.send('articles', 'comments', {
          value: savedComment._key,
          target: article,
        }, locals.user.uid).then().catch();
      }
    }
  } catch (e) {
    // todo: error handling when notification failed
  }

  return {
    status: HttpStatus.CREATED,
    body: {
      author: locals.user.uid,
      added: cd as any,
    },
  };
}


class CommentRequest {
  article: Article;

  constructor(articleId: string) {
    this.article = new Article(articleId);
  }

  list(amount: number, page = 1) {
    // console.log('list:', this.article.id)
    return this.article.getComments(page, amount);
  }

  add(userId: string, comment: CommentDto) {
    return this.article.addComment(userId, comment);
  }

}