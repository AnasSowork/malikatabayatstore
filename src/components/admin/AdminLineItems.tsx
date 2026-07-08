"use client";

import type { OrderLineItem } from "@/lib/bundle-offers";

export function AdminLineItems({ items }: { items: OrderLineItem[] }) {
  if (!items.length) return <span className="text-on-surface-variant">—</span>;

  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <span key={i} className="admin-chip">
          <span className="admin-chip-num">{i + 1}</span>
          {item.size}
          {item.color ? (
            <>
              <span className="admin-chip-dot" aria-hidden />
              {item.color}
            </>
          ) : null}
        </span>
      ))}
    </div>
  );
}
