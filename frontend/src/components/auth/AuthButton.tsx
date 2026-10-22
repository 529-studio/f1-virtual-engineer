"use client";

import { useState } from "react";
import { useSupabase } from "./SupabaseProvider";
import { getSupabaseEnv } from "@/lib/supabase/client";

const buttonClass =
  "shrink-0 rounded-sm border border-border-strong px-2 py-0.5 text-[length:var(--text-readout)] uppercase tracking-wide text-foreground-dim transition-colors duration-[var(--dur-fast)] hover:text-foreground hover:border-foreground disabled:opacity-40 disabled:cursor-not-allowed";

export function AuthButton() {
  const { supabase, session, configured } = useSupabase();
  const [busy, setBusy] = useState(false);



  if (!configured) {
    const env = getSupabaseEnv();
    const urlOk = Boolean(env.url);
    const keyOk = Boolean(env.anonKey);
    return (
      <button
        type="button"
        className={buttonClass}
        disabled
        title={`Build-time env missing — URL: ${urlOk ? "ok" : "MISSING"}, KEY: ${keyOk ? "ok" : "MISSING"}. NEXT_PUBLIC_* must be set at \`next build\` time, not just at runtime.`}
      >
        Sign in unavailable · URL {urlOk ? "✓" : "✗"} KEY {keyOk ? "✓" : "✗"}
      </button>
    );
  }

  if (session) {
    const email = session.user.email ?? "";
    // Extract name from Google metadata, fall back to the part before @ in email
    const displayName =
      session.user.user_metadata?.full_name ||
      session.user.user_metadata?.name ||
      (email ? email.split("@")[0] : session.user.id);
    const initial = (displayName.trim().charAt(0) || "U").toUpperCase();

    return (
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Mobile: compact circular user initial avatar */}
        <span
          className="md:hidden flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-surface-elevated text-[0.6rem] font-bold text-foreground"
          title={displayName}
        >
          {initial}
        </span>

        {/* Desktop: full user name */}
        <span
          className="hidden md:inline readout shrink-0 text-[length:var(--text-readout)] text-foreground-dim truncate max-w-[120px]"
          title={displayName}
        >
          {displayName}
        </span>

        <button
          type="button"
          className={`${buttonClass} px-1.5 py-0.5 sm:px-2 text-[0.6rem] sm:text-[length:var(--text-readout)]`}
          disabled={busy}
          title={`Sign out (${displayName})`}
          onClick={async () => {
            setBusy(true);
            try {
              await supabase!.auth.signOut();
            } finally {
              setBusy(false);
            }
          }}
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      aria-label="Sign in with Google"
      title="Sign in with Google"
      className="shrink-0 rounded-sm p-1 opacity-80 transition-opacity duration-[var(--dur-fast)] hover:opacity-100 disabled:opacity-40 disabled:cursor-not-allowed"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await supabase!.auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo: `${window.location.origin}/auth/callback` },
          });
        } finally {
          setBusy(false);
        }
      }}
    >
      {/* Plain <img> keeps the bundle small; the SVG is in /public. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icons/google/google-icon-logo-svgrepo-com.svg"
        alt=""
        width={20}
        height={20}
        className="block"
      />
    </button>
  );
}
