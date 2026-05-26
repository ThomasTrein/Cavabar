"use client";

export default function LoadingOverlay({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center">
      <div className="w-14 h-14 rounded-full border-4 border-green-600 border-t-transparent animate-spin" />
    </div>
  );
}
