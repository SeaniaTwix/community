interface PageDataInternal {
  readonly editorKey: string;
  readonly boardName: string;
  readonly usedTags: string[];
}

export type PageData = PageDataInternal;