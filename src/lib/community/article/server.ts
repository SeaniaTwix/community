import db from '$lib/database/instance';
import {aql} from 'arangojs';
import type {CommentDto} from '$lib/types/dto/comment.dto';
import type {ITag} from '$lib/types/tag';
import type {IArticle} from '$lib/types/article';
import type {IComment} from '$lib/types/comment';
import {inRange, isEmpty} from 'lodash-es';
import {unified} from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeSanitize, {defaultSchema} from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import {load as loadHtml, load} from 'cheerio';
import type {Element as CheerioElement} from 'cheerio/lib'
import {uploadAllowedExtensions} from '$lib/file/image/shared';
import {env} from 'node:process';

export class Article {
  readonly type = 'article';
  title: string | undefined;
  content: string | undefined;

  constructor(readonly id: string) {
  }

  static async Sanitize(content?: string): Promise<string> {
    const sanitizedContent = await unified()
      .use(rehypeParse, {fragment: true})
      .use(rehypeSanitize, {
        ...defaultSchema,
        tagNames: [
          ...defaultSchema.tagNames ?? [],
          'video',
          'source',
          'iframe',
        ],
        attributes: {
          ...defaultSchema.attributes,
          video: ['preload', 'muted', 'controls'],
          source: ['src', 'type'],
          iframe: ['src', 'allow', 'allowfullscreen'],
        }
      })
      .use(rehypeStringify)
      .process(content ?? '');

    const sanitizedString = sanitizedContent.value.toString();

    const $ = load(sanitizedString);

    const iframes: CheerioElement[] = $('iframe').toArray() as any[];
    for (const iframe of iframes) {
      const src: string | undefined = iframe.attribs?.src;
      if (typeof src === 'string') {
        const {CLOUDFLARE_USER_ENDPOINT} = env;
        if (CLOUDFLARE_USER_ENDPOINT && src.startsWith(CLOUDFLARE_USER_ENDPOINT)) {
          const elem = $($.root()).find(iframe as any);
          const parent = $(elem.parent('div'));

          parent?.attr('style', 'position: relative; padding-top: 56.25%');
          elem.attr('style', 'border: none; position: absolute; top: 0; left: 0; height: 100%; width: 100%;');
          elem.attr('allow', 'accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;');
          elem.attr('allowfullscreen', 'true');
        } else {
          $($.root()).find(iframe as any).removeAttr('src');
        }
      }
    }

    return $('body').html() ?? '';
  }

  static async isContainsVideos(content?: string): Promise<boolean> {
    if (!content) {
      return false;
    }

    const $ = loadHtml(content);

    const iframePreviews = $('iframe')
      .toArray()
      .filter((v) => {
        const src = $(v).attr('src');
        const {CLOUDFLARE_USER_ENDPOINT} = env;
        if (!src || !CLOUDFLARE_USER_ENDPOINT) {
          return false;
        }
        const url = new URL(src);
        const endpoint = new URL(CLOUDFLARE_USER_ENDPOINT);
        return url.hostname === endpoint.hostname;
      });

    return iframePreviews.length > 0;
  }

  static async extractFirstImage(content?: string) {
    if (!content) {
      return '';
    }

    const $ = loadHtml(content);
    const images = $('img');

    if (!isEmpty(images)) {
      return $(images[0])?.attr('src')?.toString() ?? '';
    }

    const iframePreviews = $('iframe')
      .toArray()
      .filter((v) => {
        const src = $(v).attr('src');
        if (!src) {
          return false;
        }
        const url = new URL(src);
        return url.searchParams.has('poster');
      })
      .map((v) => {
        const src = $(v).attr('src')!;
        const url = new URL(src);
        const poster = url.searchParams.get('poster')!;
        const preview = new URL(poster.replace(`.jpg?`, `.gif?`));
        preview.searchParams.set('width', '260');
        preview.searchParams.set('height', '260');
        preview.searchParams.set('duration', '5s');
        return preview.toString();
      });

    return isEmpty(iframePreviews) ? '' : iframePreviews[0];
  }

  async get(): Promise<IArticle> {
    const cursor = await db.query(aql`
      for article in articles
        filter article._key == ${this.id}
          return article`);
    return await cursor.next();
  }

  get exists(): Promise<boolean> {
    return new Promise<boolean>(async (resolve, reject) => {
      db.query(aql`
      for article in articles
        filter article._key == ${this.id}
          return article`)
        .then((result: { hasNext: boolean | PromiseLike<boolean>; }) => {
          resolve(result.hasNext);
        })
        .catch(reject);
    });
  }

  async getComments(page: number, amount: number, reader: string | null) {
    const cursor = await db.query(aql`
      for comment in comments
        sort comment.createdAt asc
        let isPub = comment.pub == null || comment.pub
        let replyExists = length(
          for c in comments
            filter c.relative == comment._key && c.pub
             return c) > 0
        let reader = ${reader}
        let blockedUsers = is_string(reader) ? flatten(
          for user in users
            filter user._key == reader && has(user, "blockedUsers")
              return (for blockedUser in user.blockedUsers return blockedUser.key)
        ) : []
        let imageSrcKey = regex_matches(comment.image, ${'https:\\/\\/s3\\.ru\\.hn(.+)' + `(${uploadAllowedExtensions})$`}, true)
        let images = first(
          for image in images
            filter image.src == imageSrcKey[1]
              return image.converted)
        filter comment.article == ${this.id} && (isPub || replyExists)
        filter comment.author not in blockedUsers
          limit ${(page - 1) * amount}, ${amount}
          let publicComment = unset(comment, "_rev", "_id", "pub")
          let authorData = first(
            for user in users
              filter user._key == comment.author
               return user)
          let authorDataSafe = keep(authorData, "_key", "id", "rank", "avatar")
          return isPub ? merge(publicComment, {images: images, author: authorDataSafe}) : merge(keep(publicComment, "_key", "author", "createdAt"), {deleted: true, images: images, author: authorDataSafe})`);
    return await cursor.all();
  }

  async isAlreadyRead(reader: string) {
    const cursor = await db.query(aql`
      for view in views
        filter view.article._key == ${this.id} && view.reader == ${reader}
          return view`);
    return cursor.hasNext;
  }

  /**
   *
   * @param reader user의 _key 혹은 uuid 값입니다.
   */
  async addViewCount(reader: string) {
    const key = `articles/${this.id}`;
    return db.query(aql`
      let article = document(${key})
      insert {
        reader: ${reader},
        article: keep(article, "_key", "_rev", "_id"),
        createdAt: date_now()
      } into views`);
  }

  async updateViewInfo(reader: string) {
    const key = `articles/${this.id}`;
    return db.query(aql`
      let article = document(${key})
      for view in views
        filter view.article._key == article._key && view.reader == ${reader}
          update view with { article: keep(article, "_key", "_rev", "_id") } in views`);
  }

  async getViewCount(): Promise<number> {
    const key = `articles/${this.id}`;
    const cursor = await db.query(aql`
      let article = document(${key})
      return length(
        for view in views
          filter view.article._key == article._key
            return view)`);
    return await cursor.next();
  }

  /**
   * pub 태그만 가져옵니다.
   */
  async getAllTags(): Promise<ITag[]> {
    const cursor = await db.query(aql`
      for tag in tags
        filter tag.target == ${this.id} && tag.pub
          return tag`);
    return await cursor.all();
  }

  async getAllTagsCounted(): Promise<Record<string, number>> {
    const tags = await this.getAllTags();
    const result: Record<string, number> = {};
    for (const tag of tags) {
      if (!Object.hasOwn(result, tag.name)) {
        result[tag.name] = 1;
      } else {
        result[tag.name] += 1;
      }
    }
    return result;
  }

  async getAllMyTags(user: string): Promise<ITag[]> {
    const cursor = await db.query(aql`
      for tag in tags
        filter tag.target == ${this.id} && tag.pub && tag.user == ${user}
          return tag`);
    return await cursor.all();
  }

  /**
   * 태그를 추가합니다. (누적도 동일) 1~36 글자 외의 태그는 자동으로 제거 됩니다.
   * @param userId 태그 추가를 요청한 사용자 유니크 아이디입니다.
   * @param tags 추가할 태그 이름들입니다.
   */
  async addTags(userId: string, tags: string[]) {
    if (tags.find(tag => /\s/.test(tag))) {
      throw new Error('whitespace not allowed in tag');
    }

    const newTags = tags.filter(tag => inRange(tag.trim().length, 1, 36))
      .map((tag) => ({
        target: this.id,
        user: userId,
        name: tag,
        createdAt: new Date,
        pub: true,
      }));

    return await db.query(aql`
      for newTag in ${newTags}
        let sameTag = (
          for savedTag in tags
            filter newTag.target == savedTag.target && newTag.name == savedTag.name && newTag.user == savedTag.user
              return savedTag)
        let len = length(sameTag)
        filter len <= 0 || (len > 0 && sameTag[0].pub == false)
          upsert { _key: sameTag[0]._key } 
            insert newTag 
            update { _key: sameTag[0]._key, pub: true }
          in tags`);
  }

  /**
   * 해당 게시물에 지금까지 자신이 입력한 태그를 모두 지우고
   * 새 태그를 등록합니다.
   */
  async updateTags(userId: string, tags: string[]) {
    if (tags.find(tag => /\s/.test(tag))) {
      throw new Error('whitespace not allowed in tag');
    }

    await db.query(aql`
      for savedTag in tags
        filter savedTag.target == ${this.id} && savedTag.user == ${userId}
          update savedTag with {pub: false} in tags`);

    return this.addTags(userId, tags);
  }

  removeTags(userId: string, tags: string[]) {
    if (tags.find(tag => /\s/.test(tag))) {
      throw new Error('whitespace not allowed in tag');
    }

    // console.log(tags, this.id, userId);

    return db.query(aql`
      for savedTag in tags
        filter savedTag.name in ${tags} && savedTag.target == ${this.id} && savedTag.user == ${userId}
          update savedTag with {pub: false} in tags`);
  }

  async addComment(userId: string, comment: CommentDto): Promise<IComment> {
    const add = {
      article: comment.article,
      content: comment.content,
      author: userId,
      pub: true,
      image: comment.image,
      imageSize: comment.imageSize,
      votes: {},
      relative: comment.relative,
      createdAt: new Date,
    }
    const cursor = await db.query(aql`
      insert ${add} into comments return NEW`);
    const newData = await cursor.next() as IComment;
    if (comment.relative) {
      await db.query(aql`
        let target = first(for c in comments filter c._key == ${comment.relative} return c)
        insert {_from: ${newData._id} , _to: target._id} into reply`)
    }
    return newData;
  }

  /**
   * 작성자의 `연재:` 태그로 시작하는 같은 작품의 모든 글을 작성 순서대로 반환합니다.
   * @return 관련 회차 모든 게시글 ID (현재 글도 포함 되어있음)
   */
  async getSerialArticleIds(): Promise<string[]> {
    try {
      const cursor = await db.query(aql`
      for article in articles
        filter article._key == ${this.id}
        let serialTag = first(
          for tag in tags
            filter tag.target == article._key && regex_test(tag.name, "^연재:.+")
              return tag)
        let serialsIds = (
          for tag in tags
            filter tag.name == serialTag.name && tag.user == article.author
              return tag.target)
        return serialsIds`);
      return await cursor.next();
    } catch {
      return [];
    }
  }

  async delete(permanant: boolean) {
    if (permanant) {
      return await db.query(aql`
        remove {_key: ${this.id}} in articles`)
    }
    return await db.query(aql`
      update {_key: ${this.id}, pub: false} in articles`);
  }

  async isForAdult() {
    const tags = await this.getAllTagsCounted();
    return !!tags['성인'];
  }
}