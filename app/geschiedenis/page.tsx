"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from "firebase/firestore";
import type { FirebaseEvent, Order } from "@/lib/types";

const NAAM_KEY = "cavabar_naam";
const NAAM_DATUM_KEY = "cavabar_naam_datum";
const LID_ID_KEY = "cavabar_lid_id";

function getLidNaam(): string | null {
  const datum = localStorage.getItem(NAAM_DATUM_KEY);
  if (datum !== new Date().toDateString()) return null;
  return localStorage.getItem(NAAM_KEY);
}

export default function GeschiedenisPage() {
  const router = useRouter();
  const [laden, setLaden] = useState(true);
  const [fout, setFout] = useState("");
  const [bestellingen, setBestellingen] = useState<Order[]>([]);
  const [lidNaam, setLidNaam] = useState("");

  useEffect(() => {
    const naam = getLidNaam();
    if (!naam) { router.replace("/"); return; }
    setLidNaam(naam);
    laadGeschiedenis();
  }, []);

  async function laadGeschiedenis() {
    try {
      const lidId = localStorage.getItem(LID_ID_KEY) ?? "";
      const eventsSnap = await getDocs(
        query(collection(db, "events"), where("active", "==", true))
      );
      if (eventsSnap.empty) { setFout("Geen actief evenement."); setLaden(false); return; }
      const event = { id: eventsSnap.docs[0].id, ...eventsSnap.docs[0].data() } as FirebaseEvent;

      const ordersSnap = await getDocs(
        query(
          collection(db, `events/${event.id}/orders`),
          where("lidId", "==", lidId),
          orderBy("createdAt", "desc")
        )
      );
      setBestellingen(ordersSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Order)));
    } catch (e) {
      console.error(e);
      setFout("Fout bij laden van geschiedenis.");
    } finally {
      setLaden(false);
    }
  }

  function formatTijd(order: Order): string {
    const ts = order.createdAt as unknown as { seconds: number };
    if (!ts?.seconds) return "";
    return new Date(ts.seconds * 1000).toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit" });
  }

  if (laden) return <div className="flex items-center justify-center min-h-screen text-gray-400">Laden...</div>;

  return (
    <main className="flex flex-col min-h-screen pb-6">
      <header className="sticky top-0 z-10 bg-gray-950 border-b border-gray-800 px-3 sm:px-4 py-3">
        <div className="w-full max-w-3xl mx-auto flex items-center gap-3">
          <button onClick={() => router.push("/")} className="text-gray-400 hover:text-white text-xl min-h-10 min-w-10">←</button>
          <h1 className="text-lg font-bold text-green-400 flex-1">Mijn bestellingen</h1>
          <span className="text-gray-500 text-xs sm:text-sm truncate max-w-28 sm:max-w-none">{lidNaam}</span>
        </div>
      </header>

      <div className="w-full max-w-3xl mx-auto px-3 sm:px-4 py-4 flex flex-col gap-3">
        {fout && <p className="text-red-400">{fout}</p>}
        {!fout && bestellingen.length === 0 && (
          <div className="text-center text-gray-500 mt-12">
            <div className="text-4xl mb-3">📋</div>
            <p>Nog geen bestellingen vandaag.</p>
          </div>
        )}
        {bestellingen.map((order) => (
          <div key={order.id} className="bg-gray-900 rounded-2xl p-4">
            <div className="flex justify-between items-start mb-2">
              <p className="text-white font-semibold">
                {order.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}
              </p>
              <span className="text-gray-500 text-xs ml-3 shrink-0">{formatTijd(order)}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
              <span className="text-green-400 font-bold">€{order.totaal.toFixed(2)}</span>
              {order.cashGegeven != null && (
                <span className="text-gray-400 text-xs sm:text-sm break-words">
                  Cash: €{(order.cashGegeven as number).toFixed(2)} · Wisselgeld: €{((order.wisselgeld as number) ?? 0).toFixed(2)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
