import styles from './ux-components.module.css';
import Image from 'next/image';

export default function ImageBlock({ image, caption, ...props }) {
  return (
    <figure className={styles.imageBlock} {...props}>
      <img src={image} alt={caption || ''} className={styles.imageBlockImg} />
      {caption && <figcaption className={styles.imageCaption}>{caption}</figcaption>}
    </figure>
  );
}

