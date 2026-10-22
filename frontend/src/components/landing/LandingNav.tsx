"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

type NavItem = { label: string; href: string };

// Items whose href is "#section" participate in scroll-spy. External
// hrefs (e.g. /mission-control) are excluded — they navigate away.
export function LandingNav({ items }: { items: readonly NavItem[] }) {
  const [active, setActive] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  useEffect(() => {
    const sectionIds = items
      .filter((i) => i.href.startsWith("#"))
      .map((i) => i.href.slice(1));
    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) {
          setActive(`#${(visible[0].target as HTMLElement).id}`);
        }
      },
      {
        rootMargin: "-20% 0px -50% 0px",
        threshold: [0, 0.25, 0.5, 1],
      },
    );

    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [items]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden items-center gap-8 md:flex">
        {items.map((item) => {
          const isActive = active === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "true" : undefined}
              className={`text-[0.7rem] uppercase tracking-[var(--track-wide)] transition-colors ${
                isActive
                  ? "font-semibold text-foreground"
                  : "text-foreground-dim hover:text-foreground"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Mobile Hamburger Toggle Button (min 48px touch target) */}
      <button
        type="button"
        onClick={() => setMobileOpen((prev) => !prev)}
        aria-label={mobileOpen ? "Close menu" : "Open navigation menu"}
        aria-expanded={mobileOpen}
        className="flex h-12 w-12 items-center justify-center rounded-sm text-foreground hover:bg-surface-elevated md:hidden cursor-pointer"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {mobileOpen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      </button>

      {/* Mobile Drawer Teleported to document.body to avoid header backdrop-filter clip */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {mobileOpen && (
              <div className="fixed inset-0 z-[999] md:hidden">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setMobileOpen(false)}
                  className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                />
                <motion.div
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ type: "spring", damping: 28, stiffness: 300 }}
                  style={{ backgroundColor: "#111113" }}
                  className="absolute right-0 top-0 bottom-0 w-72 border-l border-border p-6 shadow-2xl flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between pb-6 border-b border-border/50">
                      <span className="text-[0.7rem] font-bold uppercase tracking-widest text-foreground">
                        Navigation
                      </span>
                      <button
                        type="button"
                        onClick={() => setMobileOpen(false)}
                        aria-label="Close menu"
                        className="flex h-10 w-10 items-center justify-center rounded-sm text-foreground-dim hover:text-foreground cursor-pointer"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <div className="mt-6 flex flex-col gap-2">
                      {items.map((item) => {
                        const isActive = active === item.href;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileOpen(false)}
                            className={`flex min-h-[48px] items-center px-3 rounded-sm text-sm uppercase tracking-wider transition-colors ${
                              isActive
                                ? "bg-surface-elevated font-semibold text-foreground"
                                : "text-foreground-dim hover:bg-surface-elevated/50 hover:text-foreground"
                            }`}
                          >
                            {item.label}
                          </Link>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-border/50">
                    <Link
                      href="/mission-control"
                      onClick={() => setMobileOpen(false)}
                      className="btn btn--accent flex min-h-[48px] w-full items-center justify-center text-center uppercase tracking-widest font-bold"
                    >
                      Launch Mission Control
                    </Link>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
