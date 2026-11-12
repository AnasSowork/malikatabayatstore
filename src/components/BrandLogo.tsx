import Image from "next/image";

/** Intrinsic pixel size of the Nira logo assets. */
const LOGO_WIDTH = 2017;
const LOGO_HEIGHT = 1298;

const LOGO_SRC = {
  /** Black wordmark — use on light / white surfaces. */
  light: "/nira-logo-black.png",
  /** White wordmark — use on black / dark surfaces. */
  dark: "/nira-logo-white.png",
} as const;

type Props = {
  height?: number;
  priority?: boolean;
  className?: string;
  alt: string;
  /** Use `dark` on black backgrounds. Default `light` for cream/white surfaces. */
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
