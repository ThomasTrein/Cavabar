"use client";

export default function LoadingOverlay({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div
      className="fixed inset-0 z-50 bg-gray-950/55 backdrop-blur-sm flex items-center justify-center"
      role="status"
      aria-live="polite"
      aria-label="Laden"
    >
      <div className="bg-gray-900/90 border border-gray-700 rounded-2xl px-6 py-5 flex flex-col items-center gap-3 shadow-2xl">
        <div className="w-12 h-12 rounded-full border-4 border-green-500 border-t-transparent animate-spin" />
        <p className="text-sm font-medium text-gray-200">Even laden...</p>
      </div>
    </div>
  );
}
