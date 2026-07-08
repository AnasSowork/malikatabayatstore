import { normalizeProductImageSrc } from "@/lib/normalize-product-image-src";

export { normalizeProductImageSrc };

type Props = {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
};

/** Same-origin product art: native img avoids next/image edge cases with runtime `public/` files. */
export function ProductImage({ src, alt, width, height, className, priority }: Props) {
  const resolved = normalizeProductImageSrc(src);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolved}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
    />
  );
}
