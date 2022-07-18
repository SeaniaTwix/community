import type {INotify} from '$lib/notifications/server';
import type {IArangoDocumentIdentifier} from '$lib/database';

export interface IPublicNotify extends INotify, IArangoDocumentIdentifier {
  instigator?: string;
  receiver: string;
}