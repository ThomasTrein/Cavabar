"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import type { FirebaseEvent, Order, OrderItem } from "@/lib/types";

interface ItemStat {
  name: string;
  aantal: number;
  omzet: number;
}

interface LidStat {
  naam: string;
  bestellingen: number;
  omzet: number;
}

export default function AdminStatistieken() {
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

  const totaalOmzet = bestellingen.reduce((s, o) => s + o.totaal, 0);

  const itemStats: ItemStat[] = Object.values(
    bestellingen.flatMap((o) => o.items).reduce<Record<string, ItemStat>>((acc, item: OrderItem) => {
      if (!acc[item.name]) acc[item.name] = { name: item.name, aantal: 0, omzet: 0 };
      acc[item.name].aantal += item.quantity;
      acc[item.name].omzet += item.price * item.quantity;
      return acc;
    }, {})
  ).sort((a, b) => b.aantal - a.aantal);

  const lidStats: LidStat[] = Object.values(
    bestellingen.reduce<Record<string, LidStat>>((acc, order) => {
      const naam = order.lidNaam;
      if (!acc[naam]) acc[naam] = { naam, bestellingen: 0, omzet: 0 };
      acc[naam].bestellingen++;
      acc[naam].omzet += order.totaal;
      return acc;
    }, {})
  ).sort((a, b) => b.omzet - a.omzet);

  if (laden) return <p className="text-gray-400">Laden...</p>;
  if (!event) return <p className="text-red-400">Geen actief evenement.</p>;

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <h2 className="text-white font-bold text-lg">Statistieken — {event.name}</h2>

      {/* Totalen */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-900 rounded-2xl p-4 text-center">
          <p className="text-gray-400 text-sm">Totale omzet</p>
          <p className="text-green-400 text-3xl font-black">€{totaalOmzet.toFixed(2)}</p>
        </div>
        <div className="bg-gray-900 rounded-2xl p-4 text-center">
          <p className="text-gray-400 text-sm">Bestellingen</p>
          <p className="text-white text-3xl font-black">{bestellingen.length}</p>
        </div>
      </div>

      {/* Populairste items */}
      <div className="bg-gray-900 rounded-2xl p-4">
        <p className="text-white font-semibold mb-3">🏆 Populairste items</p>
        {itemStats.slice(0, 10).map((item, i) => (
          <div key={item.name} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm w-5">{i + 1}.</span>
              <span className="text-white">{item.name}</span>
            </div>
            <div className="flex gap-3 text-sm">
              <span className="text-gray-400">{item.aantal}×</span>
              <span className="text-green-400 font-medium">€{item.omzet.toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Per lid */}
      <div className="bg-gray-900 rounded-2xl p-4">
        <p className="text-white font-semibold mb-3">👤 Per lid</p>
        {lidStats.map((lid) => (
          <div key={lid.naam} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
            <span className="text-white">{lid.naam}</span>
            <div className="flex gap-3 text-sm">
              <span className="text-gray-400">{lid.bestellingen} bestellingen</span>
              <span className="text-green-400 font-medium">€{lid.omzet.toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
