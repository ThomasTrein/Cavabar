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
  doc,
  addDoc,
  Timestamp,
} from "firebase/firestore";
import type { FirebaseEvent, Category, MenuItem, OrderItem } from "@/lib/types";

const NAAM_KEY = "cavabar_naam";
const NAAM_DATUM_KEY = "cavabar_naam_datum";
const LID_ID_KEY = "cavabar_lid_id";

function getLidNaam(): string | null {
  const datum = localStorage.getItem(NAAM_DATUM_KEY);
  if (datum !== new Date().toDateString()) return null;
  return localStorage.getItem(NAAM_KEY);
}

function getLidId(): string {
  let id = localStorage.getItem(LID_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(LID_ID_KEY, id);
  }
  return id;
}

interface CategorieMetItems {
  cat: Category;
  items: MenuItem[];
}

export default function NieuweBestellingPage() {
  const router = useRouter();
  const [laden, setLaden] = useState(true);
  const [fout, setFout] = useState("");
  const [activeEvent, setActiveEvent] = useState<FirebaseEvent | null>(null);
  const [categorieën, setCategorieën] = useState<CategorieMetItems[]>([]);
  const [aantallen, setAantallen] = useState<Record<string, number>>({});
  const [uitgeklapt, setUitgeklapt] = useState<Record<string, boolean>>({});
  const [bestelFout, setBestelFout] = useState("");

  useEffect(() => {
    const naam = getLidNaam();
    if (!naam) { router.replace("/"); return; }
    laadMenu();
  }, []);

  async function laadMenu() {
    try {
      const eventsQ = query(collection(db, "events"), where("active", "==", true));
      const eventsSnap = await getDocs(eventsQ);
      if (eventsSnap.empty) { setFout("Geen actief evenement gevonden."); setLaden(false); return; }
      const eventDoc = eventsSnap.docs[0];
      const event = { id: eventDoc.id, ...eventDoc.data() } as FirebaseEvent;
      setActiveEvent(event);

      const catsSnap = await getDocs(
        query(collection(db, `events/${event.id}/categories`), orderBy("order"))
      );
      const cats: CategorieMetItems[] = [];
      for (const catDoc of catsSnap.docs) {
        const cat = { id: catDoc.id, ...catDoc.data() } as Category;
        const itemsSnap = await getDocs(
          query(collection(db, `events/${event.id}/categories/${cat.id}/items`), orderBy("order"))
        );
        const items = itemsSnap.docs
          .map((d) => ({ id: d.id, ...d.data() } as MenuItem))
          .filter((i) => i.available);
        cats.push({ cat, items });
      }
      setCategorieën(cats);
      const init: Record<string, boolean> = {};
      cats.forEach((c) => (init[c.cat.id] = true));
      setUitgeklapt(init);
    } catch (e) {
      console.error(e);
      setFout("Fout bij laden van menu.");
    } finally {
      setLaden(false);
    }
  }

  function wijzigAantal(itemId: string, delta: number) {
    setAantallen((prev) => {
      const huidig = prev[itemId] ?? 0;
      const nieuw = Math.max(0, huidig + delta);
      if (nieuw === 0) {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [itemId]: nieuw };
    });
  }

  function toggleCat(catId: string) {
    setUitgeklapt((prev) => ({ ...prev, [catId]: !prev[catId] }));
  }

  const geselecteerd: OrderItem[] = categorieën.flatMap(({ items }) =>
    items
      .filter((item) => (aantallen[item.id] ?? 0) > 0)
      .map((item) => ({
        itemId: item.id,
        name: item.name,
        quantity: aantallen[item.id],
        price: item.price,
      }))
  );

  const totaal = geselecteerd.reduce((s, i) => s + i.price * i.quantity, 0);

  async function bevestig() {
    if (geselecteerd.length === 0) { setBestelFout("Selecteer minstens één item."); return; }
    if (!activeEvent) return;
    const naam = getLidNaam()!;
    const lidId = getLidId();
    try {
      const ref = await addDoc(collection(db, `events/${activeEvent.id}/orders`), {
        lidNaam: naam,
        lidId,
        eventId: activeEvent.id,
        items: geselecteerd,
        totaal,
        cashGegeven: null,
        wisselgeld: null,
        createdAt: Timestamp.now(),
      });
      router.push(`/bestelling/${ref.id}/betalen?eventId=${activeEvent.id}`);
    } catch (e) {
      console.error(e);
      setBestelFout("Fout bij opslaan van bestelling.");
    }
  }

  if (laden) return <div className="flex items-center justify-center min-h-screen text-gray-400">Laden...</div>;
  if (fout) return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 gap-4">
      <p className="text-red-400 text-lg">{fout}</p>
      <button onClick={() => router.push("/")} className="text-gray-400 underline">Terug</button>
    </div>
  );

  return (
    <main className="flex flex-col min-h-screen pb-40">
      <header className="sticky top-0 z-10 bg-gray-950 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.push("/")} className="text-gray-400 hover:text-white text-xl">←</button>
        <h1 className="text-lg font-bold text-green-400 flex-1">Nieuwe bestelling</h1>
        {totaal > 0 && <span className="text-green-400 font-bold">€{totaal.toFixed(2)}</span>}
      </header>

      <div className="flex-1 px-4 py-3 flex flex-col gap-3">
        {categorieën.map(({ cat, items }) => (
          <div key={cat.id} className="bg-gray-900 rounded-2xl overflow-hidden">
            <button
              onClick={() => toggleCat(cat.id)}
              className="w-full flex items-center justify-between px-4 py-4 text-left font-semibold text-white text-lg"
            >
              <span>{cat.name}</span>
              <span className="text-gray-500">{uitgeklapt[cat.id] ? "▲" : "▼"}</span>
            </button>
            {uitgeklapt[cat.id] && (
              <div className="border-t border-gray-800">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between px-4 py-3 border-b border-gray-800 last:border-0">
                    <div>
                      <p className="text-white font-medium">{item.name}</p>
                      <p className="text-green-400 text-sm">€{item.price.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => wijzigAantal(item.id, -1)}
                        disabled={!aantallen[item.id]}
                        className="w-9 h-9 rounded-full bg-gray-700 hover:bg-gray-600 disabled:opacity-30 text-white text-xl flex items-center justify-center"
                      >−</button>
                      <span className="text-white font-bold w-5 text-center">{aantallen[item.id] ?? 0}</span>
                      <button
                        onClick={() => wijzigAantal(item.id, 1)}
                        className="w-9 h-9 rounded-full bg-green-700 hover:bg-green-600 text-white text-xl flex items-center justify-center"
                      >+</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-gray-950 border-t border-gray-800 p-4 flex flex-col gap-2">
        {bestelFout && <p className="text-red-400 text-sm text-center">{bestelFout}</p>}
        {geselecteerd.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1">
            {geselecteerd.map((i) => (
              <span key={i.itemId} className="bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded-full">
                {i.quantity}× {i.name}
              </span>
            ))}
          </div>
        )}
        <button
          onClick={bevestig}
          disabled={geselecteerd.length === 0}
          className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white text-xl font-bold py-5 rounded-2xl transition"
        >
          Bestelling plaatsen · €{totaal.toFixed(2)}
        </button>
      </div>
    </main>
  );
}
