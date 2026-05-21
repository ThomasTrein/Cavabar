"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection, getDocs, query, where, orderBy, deleteDoc, doc,
} from "firebase/firestore";
import type { FirebaseEvent, Order } from "@/lib/types";

export default function AdminBestellingen() {
  const [event, setEvent] = useState<FirebaseEvent | null>(null);
  const [bestellingen, setBestellingen] = useState<Order[]>([]);
  const [laden, setLaden] = useState(true);

  useEffect(() => { laad(); }, []);

  async function laad() {
    setLaden(true);
    const snap = await getDocs(query(collection(db, "events"), where("active", "==", true)));
    if (snap.empty) { setLaden(false); return; }
    const ev = { id: snap.docs[0].id, ...snap.docs[0].data() } as FirebaseEvent;
    setEvent(ev);
    const oSnap = await getDocs(query(collection(db, `events/${ev.id}/orders`), orderBy("createdAt", "desc")));
    setBestellingen(oSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Order)));
    setLaden(false);
  }

  async function verwijder(orderId: string) {
    if (!event || !confirm("Bestelling verwijderen?")) return;
    await deleteDoc(doc(db, `events/${event.id}/orders/${orderId}`));
    await laad();
  }

  function formatTijd(order: Order): string {
    const ts = order.createdAt as unknown as { seconds: number };
    if (!ts?.seconds) return "";
    return new Date(ts.seconds * 1000).toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit" });
  }

  const totaalOmzet = bestellingen.reduce((s, o) => s + o.totaal, 0);

  if (laden) return <p className="text-gray-400">Laden...</p>;
  if (!event) return <p className="text-red-400">Geen actief evenement.</p>;

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-lg">Bestellingen — {event.name}</h2>
        <span className="text-green-400 font-bold">€{totaalOmzet.toFixed(2)}</span>
      </div>
      <p className="text-gray-500 text-sm">{bestellingen.length} bestellingen</p>

      {bestellingen.map((order) => (
        <div key={order.id} className="bg-gray-900 rounded-2xl p-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-white font-semibold">{order.lidNaam}</p>
              <p className="text-gray-500 text-xs">{formatTijd(order)}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-400 font-bold">€{order.totaal.toFixed(2)}</span>
              <button onClick={() => verwijder(order.id)} className="text-gray-600 hover:text-red-400 transition">🗑</button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            {order.items.map((item, i) => (
              <span key={i} className="bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded-full">
                {item.quantity}× {item.name}
              </span>
            ))}
          </div>
          {order.cashGegeven != null && (
            <p className="text-gray-500 text-xs mt-2">
              Cash: €{(order.cashGegeven as number).toFixed(2)} · Wisselgeld: €{((order.wisselgeld as number) ?? 0).toFixed(2)}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
