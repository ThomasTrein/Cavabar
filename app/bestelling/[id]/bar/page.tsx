"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import type { Order } from "@/lib/types";
import LoadingOverlay from "@/components/LoadingOverlay";

export default function BarPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const orderId = params.id as string;
  const eventId = searchParams.get("eventId") ?? "";

  const [order, setOrder] = useState<Order | null>(null);
  const [laden, setLaden] = useState(true);

  useEffect(() => {
    laadOrder();
  }, []);

  async function laadOrder() {
    try {
      const snap = await getDoc(doc(db, `events/${eventId}/orders/${orderId}`));
      if (snap.exists()) setOrder({ id: snap.id, ...snap.data() } as Order);
    } finally {
      setLaden(false);
    }
  }

  if (laden) return <div className="min-h-screen bg-white"><LoadingOverlay visible /></div>;
  if (!order) return <div className="flex items-center justify-center min-h-screen bg-white text-red-500 text-xl">Bestelling niet gevonden.</div>;

  return (
    <main className="flex flex-col min-h-screen bg-white text-gray-900 px-3 sm:px-6 py-4 sm:py-6 pb-safe">
      <div className="w-full max-w-3xl mx-auto flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-5 sm:mb-6 border-b-2 border-gray-200 pb-4">
          <div>
            <p className="text-gray-500 text-sm uppercase tracking-wide">Bestelling</p>
            <p className="text-2xl font-bold text-green-700">{order.lidNaam}</p>
          </div>
          <span className="text-4xl">🍺</span>
        </div>

        <div className="flex-1 flex flex-col gap-3 sm:gap-4">
          {order.items.map((item, i) => (
            <div
              key={i}
              className="bg-gray-100 rounded-2xl px-4 sm:px-6 py-4 sm:py-5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xl sm:text-2xl font-semibold text-gray-800">{item.name}</span>
                <span className="text-3xl sm:text-4xl font-black text-green-700">{item.quantity}</span>
              </div>
              {(item.selectedOptions ?? []).map((opt) => (
                <p key={opt.groupId} className="text-gray-500 text-sm mt-1">
                  {opt.groupName}: <span className="text-gray-700 font-medium">{opt.choiceNames.join(", ")}</span>
                </p>
              ))}
            </div>
          ))}
        </div>

        {order.wisselgeld !== null && order.wisselgeld !== undefined && (
          <div className="mt-6 bg-green-50 border border-green-300 rounded-2xl px-6 py-4 flex justify-between items-center">
            <span className="text-green-800 font-medium">Wisselgeld</span>
            <span className="text-green-800 text-2xl font-bold">€{(order.wisselgeld as number).toFixed(2)}</span>
          </div>
        )}

        <div className="mt-5 sm:mt-6 flex flex-col gap-3">
          <button
            onClick={() => router.push("/")}
            className="w-full bg-green-600 hover:bg-green-500 text-white text-xl font-bold py-5 rounded-2xl transition"
          >
            ✓ Klaar — Terug naar start
          </button>
          <button
            onClick={() => router.push("/bestelling/nieuw")}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-lg font-semibold py-4 rounded-2xl transition"
          >
            ➕ Nieuwe bestelling
          </button>
        </div>
      </div>
    </main>
  );
}
