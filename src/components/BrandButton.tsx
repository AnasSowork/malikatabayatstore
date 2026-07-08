import { Link } from "@/i18n/navigation";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "outline" | "ghost";

const variantClass: Record<Variant, string> = {
  primary: "btn-brand",
  outline: "btn-brand-outline",
  ghost: "btn-brand-ghost",
};

type BaseProps = {
  variant?: Variant;
  children: ReactNode;
  className?: string;
};

type ButtonProps = BaseProps &
  ComponentProps<"button"> & {
    href?: never;
  };

type LinkProps = BaseProps &
  Omit<ComponentProps<typeof Link>, "children"> & {
    href: string;
  };

export function BrandButton({
  variant = "primary",
  children,
  className = "",
  ...props
}: ButtonProps | LinkProps) {
  const cls = `${variantClass[variant]} ${className}`.trim();

  if ("href" in props && props.href) {
    const { href, ...linkProps } = props;
    return (
      <Link href={href} className={cls} {...linkProps}>
        {children}
      </Link>
    );
  }

  const buttonProps = props as ButtonProps;
  const { type = "button", ...rest } = buttonProps;
  return (
    <button type={type} className={cls} {...rest}>
      {children}
    </button>
  );
}
