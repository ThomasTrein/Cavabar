"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import type { Order } from "@/lib/types";

export default function BetalenPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const orderId = params.id as string;
  const eventId = searchParams.get("eventId") ?? "";

  const [order, setOrder] = useState<Order | null>(null);
  const [laden, setLaden] = useState(true);
  const [cash, setCash] = useState("");
  const [wisselgeld, setWisselgeld] = useState<number | null>(null);
  const [bezig, setBezig] = useState(false);

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

  function berekenWisselgeld(cashStr: string) {
    const cashBedrag = parseFloat(cashStr.replace(",", "."));
    if (!isNaN(cashBedrag) && order) {
      setWisselgeld(Math.max(0, cashBedrag - order.totaal));
    } else {
      setWisselgeld(null);
    }
  }

  async function bevestigBetaling(metCash: boolean) {
    if (!order || !eventId) return;
    setBezig(true);
    try {
      const cashBedrag = metCash ? parseFloat(cash.replace(",", ".")) : null;
      const wg = metCash && cashBedrag !== null ? Math.max(0, cashBedrag - order.totaal) : null;
      await updateDoc(doc(db, `events/${eventId}/orders/${orderId}`), {
        cashGegeven: cashBedrag ?? null,
        wisselgeld: wg,
      });
      router.push(`/bestelling/${orderId}/bar?eventId=${eventId}`);
    } finally {
      setBezig(false);
    }
  }

  if (laden) return <div className="flex items-center justify-center min-h-screen text-gray-400">Laden...</div>;
  if (!order) return <div className="flex items-center justify-center min-h-screen text-red-400">Bestelling niet gevonden.</div>;

  const cashBedrag = parseFloat(cash.replace(",", "."));
  const cashGeldig = !isNaN(cashBedrag) && cashBedrag >= order.totaal;

  return (
    <main className="flex flex-col min-h-screen w-full max-w-lg mx-auto px-3 sm:px-5 py-4 sm:py-5 gap-5 sm:gap-6 pb-safe">
      <header className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-white text-xl min-h-10 min-w-10">←</button>
        <h1 className="text-lg sm:text-xl font-bold text-green-400">Betaling</h1>
      </header>

      {/* Overzicht */}
      <div className="bg-gray-900 rounded-2xl p-5">
        <p className="text-gray-400 text-sm mb-3">Bestelling overzicht</p>
        {order.items.map((item, i) => (
          <div key={i} className="flex justify-between py-1 text-white">
            <span>{item.quantity}× {item.name}</span>
            <span>€{(item.price * item.quantity).toFixed(2)}</span>
          </div>
        ))}
        <div className="border-t border-gray-700 mt-3 pt-3 flex justify-between font-bold text-lg">
          <span>Totaal</span>
          <span className="text-green-400">€{order.totaal.toFixed(2)}</span>
        </div>
      </div>

      {/* Cash invoer */}
      <div className="bg-gray-900 rounded-2xl p-5 flex flex-col gap-4">
        <p className="text-white font-semibold">Cash ontvangen</p>
        <input
          type="number"
          inputMode="decimal"
          placeholder="0.00"
          value={cash}
          onChange={(e) => {
            setCash(e.target.value);
            berekenWisselgeld(e.target.value);
          }}
          className="bg-gray-800 border border-gray-700 text-white text-2xl px-4 py-3.5 rounded-xl focus:outline-none focus:border-green-500 text-center"
        />

        {wisselgeld !== null && (
          <div className="flex justify-between items-center bg-green-900/30 border border-green-700 rounded-xl px-4 py-3">
            <span className="text-green-300 font-medium">Wisselgeld</span>
            <span className="text-green-300 text-2xl font-bold">€{wisselgeld.toFixed(2)}</span>
          </div>
        )}

        <button
          onClick={() => bevestigBetaling(true)}
          disabled={!cashGeldig || bezig}
          className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white text-lg font-bold py-4 rounded-2xl transition"
        >
          {bezig ? "Bezig..." : "Bevestigen →"}
        </button>
      </div>

      <button
        onClick={() => bevestigBetaling(false)}
        disabled={bezig}
        className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 text-base py-4 rounded-2xl transition"
      >
        Stap overslaan → Ga naar bar
      </button>
    </main>
  );
}
