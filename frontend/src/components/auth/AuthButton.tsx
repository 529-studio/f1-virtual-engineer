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
    return (
      <div className="flex items-center gap-2">
        <span className="readout shrink-0 text-[length:var(--text-readout)] text-foreground-dim">
          {displayName}
        </span>
        <button
          type="button"
          className={buttonClass}
          disabled={busy}
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
