import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center mb-4">
        <span className="text-2xl font-bold text-neutral-400">404</span>
      </div>
      <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
        Page Not Found
      </h2>
      <p className="text-sm text-neutral-500 mt-1 max-w-sm">
        The requested resource or page could not be located on the platform.
      </p>
      <Link
        href="/dashboard"
        className="mt-6 px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-full shadow-sm transition-all"
      >
        Return to Dashboard
      </Link>
    </div>
  );
}
