import { MaterialIcon } from "@/components/MaterialIcon";
import type { ResolvedValueProps } from "@/lib/home-content-resolve";

export function HomeValuePropsSection({ items }: ResolvedValueProps) {
  return (
    <section className="border-y border-brand-black/10 bg-brand-ivory">
      <ul className="mx-auto grid max-w-[1440px] grid-cols-1 sm:grid-cols-3">
        {items.map((item, i) => (
          <li
            key={i}
            className="flex items-center gap-4 px-6 py-8 md:px-10 md:py-9 sm:border-l sm:border-brand-black/10 sm:first:border-l-0"
          >
            <MaterialIcon name={item.icon} className="!text-[26px] text-on-surface" />
            <div>
              <h3 className="text-sm font-medium text-on-surface">{item.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">{item.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
