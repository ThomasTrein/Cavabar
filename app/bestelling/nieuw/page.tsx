"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  addDoc,
  Timestamp,
} from "firebase/firestore";
import type { FirebaseEvent, Category, MenuItem, OrderItem, SelectedOption } from "@/lib/types";
import LoadingOverlay from "@/components/LoadingOverlay";
import { useToast } from "@/components/ToastProvider";

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
  const { toast } = useToast();
  const [laden, setLaden] = useState(true);
  const [fout, setFout] = useState("");
  const [activeEvent, setActiveEvent] = useState<FirebaseEvent | null>(null);
  const [categorieen, setCategorieen] = useState<CategorieMetItems[]>([]);
  const [aantallen, setAantallen] = useState<Record<string, number>>({});
  const [uitgeklapt, setUitgeklapt] = useState<Record<string, boolean>>({});
  const [bezig, setBezig] = useState(false);
  // geselecteerdeOpties[itemId][groupId] = choiceIds[]
  const [geselecteerdeOpties, setGeselecteerdeOpties] = useState<Record<string, Record<string, string[]>>>({});

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
      const cats = await Promise.all(
        catsSnap.docs.map(async (catDoc) => {
          const cat = { id: catDoc.id, ...catDoc.data() } as Category;
          const itemsSnap = await getDocs(
            query(collection(db, `events/${event.id}/categories/${cat.id}/items`), orderBy("order"))
          );
          const items = itemsSnap.docs
            .map((d) => ({ id: d.id, ...d.data() } as MenuItem))
            .filter((i) => i.available);
          return { cat, items };
        })
      );
      setCategorieen(cats);
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

  function selecteerOptie(itemId: string, groupId: string, choiceId: string, type: "radio" | "checkbox") {
    setGeselecteerdeOpties((prev) => {
      const itemOpties = prev[itemId] ?? {};
      if (type === "radio") {
        return { ...prev, [itemId]: { ...itemOpties, [groupId]: [choiceId] } };
      } else {
        const huidig = itemOpties[groupId] ?? [];
        const geselecteerd = huidig.includes(choiceId)
          ? huidig.filter((id) => id !== choiceId)
          : [...huidig, choiceId];
        return { ...prev, [itemId]: { ...itemOpties, [groupId]: geselecteerd } };
      }
    });
  }

  const geselecteerd: OrderItem[] = useMemo(
    () => categorieen.flatMap(({ items }) =>
      items
        .filter((item) => (aantallen[item.id] ?? 0) > 0)
        .map((item) => {
          const itemOpties = geselecteerdeOpties[item.id] ?? {};
          const selectedOptions: SelectedOption[] = (item.optionGroups ?? [])
            .filter((g) => (itemOpties[g.id] ?? []).length > 0)
            .map((g) => {
              const choiceIds = itemOpties[g.id] ?? [];
              const choiceNames = g.choices
                .filter((c) => choiceIds.includes(c.id))
                .map((c) => c.name);
              return { groupId: g.id, groupName: g.name, choiceIds, choiceNames };
            });
          const optionPriceAdj = (item.optionGroups ?? []).reduce((sum, g) => {
            const choiceIds = itemOpties[g.id] ?? [];
            return sum + g.choices
              .filter((c) => choiceIds.includes(c.id))
              .reduce((s, c) => s + c.priceAdjustment, 0);
          }, 0);
          const basisItem: OrderItem = {
            itemId: item.id,
            name: item.name,
            quantity: aantallen[item.id],
            price: item.price + optionPriceAdj,
          };
          return {
            ...basisItem,
            ...(selectedOptions.length > 0 ? { selectedOptions } : {}),
          };
        })
    ),
    [categorieen, aantallen, geselecteerdeOpties]
  );

  const totaal = useMemo(
    () => geselecteerd.reduce((s, i) => s + i.price * i.quantity, 0),
    [geselecteerd]
  );

  async function bevestig() {
    if (geselecteerd.length === 0) { toast("Selecteer minstens één item.", "error"); return; }
    if (!activeEvent) return;

    // Validate required options
    for (const { items } of categorieen) {
      for (const item of items) {
        if ((aantallen[item.id] ?? 0) === 0) continue;
        const itemOpties = geselecteerdeOpties[item.id] ?? {};
        for (const groep of item.optionGroups ?? []) {
          if (groep.required && (itemOpties[groep.id] ?? []).length === 0) {
            toast(`Kies een optie voor "${groep.name}" bij ${item.name}`, "error");
            return;
          }
        }
      }
    }

    const naam = getLidNaam()!;
    const lidId = getLidId();
    setBezig(true);
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
      toast("Fout bij opslaan van bestelling.", "error");
    } finally {
      setBezig(false);
    }
  }

  if (laden) return <div className="min-h-screen"><LoadingOverlay visible /></div>;
  if (fout) return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 gap-4">
      <p className="text-red-400 text-lg">{fout}</p>
      <button onClick={() => router.push("/")} className="text-gray-400 underline">Terug</button>
    </div>
  );

  return (
    <main className="flex flex-col min-h-screen pb-44">
      <LoadingOverlay visible={bezig} />
      <header className="sticky top-0 z-10 bg-gray-950 border-b border-gray-800 px-3 sm:px-4 py-3">
        <div className="w-full max-w-3xl mx-auto flex items-center gap-3">
          <button onClick={() => router.push("/")} className="text-gray-400 hover:text-white text-xl min-h-10 min-w-10">←</button>
          <h1 className="text-lg font-bold text-green-400 flex-1">Nieuwe bestelling</h1>
          {totaal > 0 && <span className="text-green-400 font-bold text-sm sm:text-base">€{totaal.toFixed(2)}</span>}
        </div>
      </header>

      <div className="flex-1 w-full max-w-3xl mx-auto px-3 sm:px-4 py-3 flex flex-col gap-3">
        {categorieen.map(({ cat, items }) => (
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
                {items.map((item) => {
                  const itemOpties = geselecteerdeOpties[item.id] ?? {};
                  const heeftGroepen = (item.optionGroups ?? []).length > 0;
                  return (
                    <div key={item.id} className="px-4 py-3 border-b border-gray-800 last:border-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium">{item.name}</p>
                          <p className="text-green-400 text-sm">€{item.price.toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3">
                          <button
                            onClick={() => wijzigAantal(item.id, -1)}
                            disabled={!aantallen[item.id]}
                            className="w-11 h-11 rounded-full bg-gray-700 hover:bg-gray-600 disabled:opacity-30 text-white text-2xl flex items-center justify-center"
                          >−</button>
                          <span className="text-white font-bold w-6 text-center">{aantallen[item.id] ?? 0}</span>
                          <button
                            onClick={() => wijzigAantal(item.id, 1)}
                            className="w-11 h-11 rounded-full bg-green-700 hover:bg-green-600 text-white text-2xl flex items-center justify-center"
                          >+</button>
                        </div>
                      </div>

                      {heeftGroepen && (
                        <div className="flex flex-col gap-3 mt-3 pt-3 border-t border-gray-800">
                          {(item.optionGroups ?? []).map((groep) => (
                            <div key={groep.id}>
                              <p className="text-gray-400 text-xs mb-1.5">
                                {groep.name}
                                {groep.required && <span className="text-orange-400 ml-1">*</span>}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {groep.choices.map((keuze) => {
                                  const geselecteerdIds = itemOpties[groep.id] ?? [];
                                  const isGeselecteerd = geselecteerdIds.includes(keuze.id);
                                  return (
                                    <button
                                      key={keuze.id}
                                      onClick={() => selecteerOptie(item.id, groep.id, keuze.id, groep.type)}
                                      className={`px-3 py-1.5 rounded-full text-sm transition border ${
                                        isGeselecteerd
                                          ? "bg-green-700 border-green-600 text-white"
                                          : "bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500"
                                      }`}
                                    >
                                      {keuze.name}
                                      {keuze.priceAdjustment > 0 && (
                                        <span className={`ml-1 text-xs ${isGeselecteerd ? "text-green-200" : "text-green-400"}`}>
                                          +€{keuze.priceAdjustment.toFixed(2)}
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-gray-950/95 border-t border-gray-800 px-3 sm:px-4 pt-3 pb-safe flex flex-col gap-2 backdrop-blur-sm">
        <div className="w-full max-w-3xl mx-auto flex flex-col gap-2">
          {geselecteerd.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1 max-h-16 overflow-y-auto">
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
            className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white text-lg sm:text-xl font-bold py-4 sm:py-5 rounded-2xl transition"
          >
            Bestelling plaatsen · €{totaal.toFixed(2)}
          </button>
        </div>
      </div>
    </main>
  );
}
