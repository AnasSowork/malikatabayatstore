import { MaterialIcon } from "@/components/MaterialIcon";
import type { ResolvedValueProps } from "@/lib/home-content-resolve";

export function HomeValuePropsSection({ items }: ResolvedValueProps) {
  return (
    <section className="mx-auto max-w-[1400px] px-6 py-14 md:px-12">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-6">
        {items.map((item, i) => (
          <div key={i} className="value-chip reveal-up">
            <span className="value-chip-icon">
              <MaterialIcon name={item.icon} className="!text-xl" />
            </span>
            <div>
              <h3 className="font-sans text-sm font-semibold text-on-surface">{item.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">{item.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
