import Image from "next/image";

const LOGO_WIDTH = 253;
const LOGO_HEIGHT = 150;

const LOGO_SRC = {
  light: "/logo.png",
  dark: "/logo-dark.png",
} as const;

type Props = {
  height?: number;
  priority?: boolean;
  className?: string;
  alt: string;
  /** Use `dark` on black backgrounds (gold + white wordmark). Default `light` for cream/white surfaces. */
  variant?: keyof typeof LOGO_SRC;
};

export function BrandLogo({
  height = 44,
  priority = false,
  className = "",
  alt,
  variant = "light",
}: Props) {
  const width = Math.round((LOGO_WIDTH / LOGO_HEIGHT) * height);

  return (
    <Image
      src={LOGO_SRC[variant]}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      className={`h-auto w-auto max-w-none object-contain ${className}`}
      style={{ height, width: "auto" }}
    />
  );
}
