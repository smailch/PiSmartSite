import React from "react"
interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export default function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="mb-12">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-1">
          <h1 className="bg-gradient-to-br from-white via-slate-100 to-slate-400 bg-clip-text text-3xl font-semibold tracking-tight text-transparent md:text-4xl md:leading-tight">
            {title}
          </h1>
          {description && (
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-400 md:text-[1.05rem]">
              {description}
            </p>
          )}
        </div>
        {children && (
          <div className="flex flex-shrink-0 flex-wrap items-center gap-3">{children}</div>
        )}
      </div>
    </div>
  );
}
