export interface ITag {
  // article id
  target: string;
  user: string;
  name: string;
  createdAt: Date | string;
  pub: boolean;
}