"use client";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      <div className="text-center space-y-6">
        <h1 className="text-3xl tracking-wider uppercase font-bold text-red-600">
          SESSION INTERRUPTED
        </h1>
        <p className="text-neutral-400">
          {error.message || "An unexpected error occurred."}
        </p>
        <button
          onClick={() => reset()}
          className="tracking-wider uppercase border border-white/20 px-6 py-3 hover:bg-white hover:text-black transition-colors"
        >
          RESTART SESSION
        </button>
      </div>
    </div>
  );
}
