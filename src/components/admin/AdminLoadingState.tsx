"use client";

export function AdminLoadingState() {
  return (
    <div className="admin-root min-h-screen p-6 lg:p-10">
      <div className="mb-10 flex gap-4">
        <div className="admin-skeleton h-12 w-48 rounded-xl" />
        <div className="admin-skeleton ml-auto h-10 w-10 rounded-xl" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="admin-skeleton h-28 rounded-2xl" />
        ))}
      </div>
      <div className="admin-skeleton mt-8 h-80 rounded-2xl" />
      <div className="admin-skeleton mt-8 h-64 rounded-2xl" />
    </div>
  );
}
