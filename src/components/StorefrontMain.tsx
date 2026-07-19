"use client";

type Props = {
  children: React.ReactNode;
};

export function StorefrontMain({ children }: Props) {
  return <div className="flex-1">{children}</div>;
}
