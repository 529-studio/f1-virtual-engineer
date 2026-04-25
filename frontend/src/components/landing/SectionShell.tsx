import { ReactNode } from "react";

interface SectionShellProps {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function SectionShell({
  eyebrow,
  title,
  description,
  children,
  className = "",
  contentClassName = "",
}: SectionShellProps) {
  return (
    <section className={`relative px-4 sm:px-6 lg:px-8 ${className}`}>
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          {eyebrow ? (
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.35em] text-red-400/80">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="max-w-4xl text-3xl font-black uppercase tracking-[-0.04em] text-white sm:text-4xl lg:text-5xl">
            {title}
          </h2>
          {description ? (
            <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              {description}
            </p>
          ) : null}
        </div>
        <div className={`mt-10 ${contentClassName}`}>{children}</div>
      </div>
    </section>
  );
}
