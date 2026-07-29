"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

// Animation timing — no bare literals in render code
const ANIM_EASE = [0.22, 0.61, 0.36, 1] as const;
const ANIM_DUR = 0.55;

export function LandingCTA() {
  const prefersReduced = useReducedMotion();

  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: ANIM_DUR, ease: ANIM_EASE }}
          // F1 wedge clip on outer container
          className="f1-clip card relative overflow-hidden px-8 py-14 sm:px-14"
          style={{
            boxShadow: [
              "0 -1px 0 0 rgba(225,6,0,0.45) inset", // bottom inner red line
              "0 0 60px 0 rgba(225,6,0,0.06)",         // outer ambient
            ].join(", "),
          }}
        >
          {/* Center red radial glow — stronger than accent-glow */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 900px 400px at 50% 100%, rgba(225,6,0,0.12) 0%, transparent 70%)",
            }}
          />

          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              {/* Eyebrow */}
              <p className="label mb-4" style={{ color: "#E10600" }}>
                Pit wall awaits
              </p>
              {/* Headline */}
              <h2
                className="display mb-4 text-[length:var(--text-h1)] text-foreground"
                style={{ fontStyle: "italic", fontWeight: 800 }}
              >
                Step into the pit wall.
              </h2>
              {/* Sub-copy */}
              <p className="text-[length:var(--text-small)] leading-7 text-foreground-dim">
                One demo session loaded. Pick any race after that — every call is cited, every
                chart redraws from lap data.
              </p>
            </div>

            {/* Primary CTA — F1 red + wedge clip */}
            <Link
              href="/mission-control"
              className="f1-clip btn readout shrink-0 px-6 py-3.5 text-[length:var(--text-label)] text-white transition-opacity hover:opacity-90"
              style={{ background: "#E10600" }}
            >
              Launch Mission Control →
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
