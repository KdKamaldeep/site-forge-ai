import styles from './ux-components.module.css';
import Image from 'next/image';
import { normalizeImageUrl } from '@/lib/imageUtils';

export default function ImageBlock({ image, caption, ...props }) {
  const normalizedImage = normalizeImageUrl(image);
  if (!normalizedImage) return null;
  
  return (
    <figure className={styles.imageBlock} {...props}>
      <img src={normalizedImage} alt={caption || ''} className={styles.imageBlockImg} />
      {caption && <figcaption className={styles.imageCaption}>{caption}</figcaption>}
    </figure>
  );
}

