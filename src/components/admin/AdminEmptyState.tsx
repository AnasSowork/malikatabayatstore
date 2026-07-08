"use client";

import { MaterialIcon } from "@/components/MaterialIcon";

type Props = {
  icon: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export function AdminEmptyState({ icon, title, description, action }: Props) {
  return (
    <div className="admin-empty">
      <div className="admin-empty-icon">
        <MaterialIcon name={icon} className="!text-3xl brand-gold-text" />
      </div>
      <p className="font-headline text-xl text-on-surface">{title}</p>
      {description ? <p className="mt-2 max-w-sm text-sm text-on-surface-variant">{description}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
