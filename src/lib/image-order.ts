import Cookies from 'js-cookie';
import type {AllowedExtensions} from '@root/app';

export default function get(): AllowedExtensions[] {
  const order = Cookies.get('image_order') ?? 'jxl,avif,webp,png';
  return order.split(',') as AllowedExtensions[];
}