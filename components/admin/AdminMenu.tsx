"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc,
  doc, query, orderBy, where, writeBatch,
} from "firebase/firestore";
import {
  DndContext, closestCenter, MouseSensor, TouchSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { FirebaseEvent, Category, MenuItem, OptionGroup } from "@/lib/types";
import { useModal } from "@/components/ModalProvider";
import { useToast } from "@/components/ToastProvider";
import LoadingOverlay from "@/components/LoadingOverlay";

function SortableItem({
  id,
  children,
}: {
  id: string;
  children: (dragHandle: {
    attributes: Record<string, unknown>;
    listeners: Record<string, unknown>;
    setActivatorNodeRef: (element: HTMLElement | null) => void;
  }) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style}>
      {children({
        attributes: attributes as unknown as Record<string, unknown>,
        listeners: listeners as unknown as Record<string, unknown>,
        setActivatorNodeRef,
      })}
    </div>
  );
}

export default function AdminMenu() {
  const { confirm } = useModal();
  const { toast } = useToast();

  const [event, setEvent] = useState<FirebaseEvent | null>(null);
  const [categorieen, setCategorieen] = useState<Category[]>([]);
  const [items, setItems] = useState<Record<string, MenuItem[]>>({});
  const [laden, setLaden] = useState(true);
  const [bezig, setBezig] = useState(false);
  const [actieveCat, setActieveCat] = useState<string | null>(null);
  const [bewerkItemOpties, setBewerkItemOpties] = useState<string | null>(null);

  const [nieuwCatNaam, setNieuwCatNaam] = useState("");
  const [nieuwItem, setNieuwItem] = useState({ naam: "", prijs: "" });
  const [nieuwGroep, setNieuwGroep] = useState({ naam: "", type: "radio" as "radio" | "checkbox", verplicht: false });
  const [nieuwKeuze, setNieuwKeuze] = useState<Record<string, { naam: string; meerprijs: string }>>({});

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 80, tolerance: 12 } })
  );

  useEffect(() => { laad(); }, []);

  async function laad() {
    setLaden(true);
    const snap = await getDocs(query(collection(db, "events"), where("active", "==", true)));
    if (snap.empty) { setLaden(false); return; }
    const ev = { id: snap.docs[0].id, ...snap.docs[0].data() } as FirebaseEvent;
    setEvent(ev);

    const catSnap = await getDocs(query(collection(db, `events/${ev.id}/categories`), orderBy("order")));
    const cats = catSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Category));
    setCategorieen(cats);

    const allItems: Record<string, MenuItem[]> = {};
    for (const cat of cats) {
      const iSnap = await getDocs(query(collection(db, `events/${ev.id}/categories/${cat.id}/items`), orderBy("order")));
      allItems[cat.id] = iSnap.docs.map((d) => ({ id: d.id, ...d.data() } as MenuItem));
    }
    setItems(allItems);
    setLaden(false);
  }

  async function voegCatToe() {
    if (!nieuwCatNaam.trim() || !event) return;
    setBezig(true);
    await addDoc(collection(db, `events/${event.id}/categories`), {
      name: nieuwCatNaam.trim(), order: categorieen.length,
    });
    setNieuwCatNaam("");
    await laad();
    setBezig(false);
    toast("Categorie toegevoegd", "success");
  }

  async function verwijderCat(catId: string) {
    if (!event) return;
    const ok = await confirm({
      title: "Categorie verwijderen",
      message: "Ben je zeker? Alle items in deze categorie worden ook verwijderd.",
      confirmLabel: "Verwijderen",
      danger: true,
    });
    if (!ok) return;
    setBezig(true);
    await deleteDoc(doc(db, `events/${event.id}/categories/${catId}`));
    await laad();
    setBezig(false);
    toast("Categorie verwijderd", "success");
  }

  async function voegItemToe(catId: string) {
    if (!nieuwItem.naam.trim() || !event) return;
    const prijs = parseFloat(nieuwItem.prijs.replace(",", "."));
    setBezig(true);
    await addDoc(collection(db, `events/${event.id}/categories/${catId}/items`), {
      name: nieuwItem.naam.trim(),
      price: isNaN(prijs) ? 0 : prijs,
      available: true,
      order: (items[catId] ?? []).length,
    });
    setNieuwItem({ naam: "", prijs: "" });
    await laad();
    setBezig(false);
    toast("Item toegevoegd", "success");
  }

  async function toggleAvailable(catId: string, itemId: string, huidig: boolean) {
    if (!event) return;
    await updateDoc(doc(db, `events/${event.id}/categories/${catId}/items/${itemId}`), { available: !huidig });
    await laad();
  }

  async function verwijderItem(catId: string, itemId: string, itemNaam: string) {
    if (!event) return;
    const ok = await confirm({
      title: "Item verwijderen",
      message: `"${itemNaam}" verwijderen uit het menu?`,
      confirmLabel: "Verwijderen",
      danger: true,
    });
    if (!ok) return;
    setBezig(true);
    await deleteDoc(doc(db, `events/${event.id}/categories/${catId}/items/${itemId}`));
    if (bewerkItemOpties === itemId) setBewerkItemOpties(null);
    await laad();
    setBezig(false);
    toast("Item verwijderd", "success");
  }

  async function herorden(catId: string, event2: DragEndEvent) {
    const { active, over } = event2;
    if (!over || active.id === over.id || !event) return;
    const oudeLijst = items[catId] ?? [];
    const oudIndex = oudeLijst.findIndex((i) => i.id === active.id);
    const nieuwIndex = oudeLijst.findIndex((i) => i.id === over.id);
    const nieuw = arrayMove(oudeLijst, oudIndex, nieuwIndex);
    setItems((prev) => ({ ...prev, [catId]: nieuw }));
    const batch = writeBatch(db);
    nieuw.forEach((item, idx) => {
      batch.update(doc(db, `events/${event.id}/categories/${catId}/items/${item.id}`), { order: idx });
    });
    await batch.commit();
  }

  function getItem(catId: string, itemId: string): MenuItem | undefined {
    return (items[catId] ?? []).find((i) => i.id === itemId);
  }

  async function slaOptiegroependOp(catId: string, itemId: string, groepen: OptionGroup[]) {
    if (!event) return;
    await updateDoc(doc(db, `events/${event.id}/categories/${catId}/items/${itemId}`), { optionGroups: groepen });
    await laad();
  }

  async function voegGroepToe(catId: string, itemId: string) {
    if (!nieuwGroep.naam.trim()) return;
    const item = getItem(catId, itemId);
    if (!item) return;
    const groepen = [...(item.optionGroups ?? [])];
    groepen.push({
      id: crypto.randomUUID(),
      name: nieuwGroep.naam.trim(),
      type: nieuwGroep.type,
      required: nieuwGroep.verplicht,
      choices: [],
    });
    setBezig(true);
    await slaOptiegroependOp(catId, itemId, groepen);
    setNieuwGroep({ naam: "", type: "radio", verplicht: false });
    setBezig(false);
    toast("Optiegroep toegevoegd", "success");
  }

  async function verwijderGroep(catId: string, itemId: string, groupId: string) {
    const ok = await confirm({
      title: "Optiegroep verwijderen",
      message: "Deze optiegroep en alle keuzes worden verwijderd.",
      confirmLabel: "Verwijderen",
      danger: true,
    });
    if (!ok) return;
    const item = getItem(catId, itemId);
    if (!item) return;
    const groepen = (item.optionGroups ?? []).filter((g) => g.id !== groupId);
    setBezig(true);
    await slaOptiegroependOp(catId, itemId, groepen);
    setBezig(false);
    toast("Optiegroep verwijderd", "success");
  }

  async function voegKeuzeToeToe(catId: string, itemId: string, groupId: string) {
    const k = nieuwKeuze[groupId];
    if (!k?.naam.trim()) return;
    const item = getItem(catId, itemId);
    if (!item) return;
    const meerprijs = parseFloat((k.meerprijs ?? "").replace(",", "."));
    const groepen = (item.optionGroups ?? []).map((g) => {
      if (g.id !== groupId) return g;
      return {
        ...g,
        choices: [...g.choices, {
          id: crypto.randomUUID(),
          name: k.naam.trim(),
          priceAdjustment: isNaN(meerprijs) ? 0 : meerprijs,
        }],
      };
    });
    setBezig(true);
    await slaOptiegroependOp(catId, itemId, groepen);
    setNieuwKeuze((prev) => ({ ...prev, [groupId]: { naam: "", meerprijs: "" } }));
    setBezig(false);
  }

  async function verwijderKeuze(catId: string, itemId: string, groupId: string, choiceId: string) {
    const item = getItem(catId, itemId);
    if (!item) return;
    const groepen = (item.optionGroups ?? []).map((g) => {
      if (g.id !== groupId) return g;
      return { ...g, choices: g.choices.filter((c) => c.id !== choiceId) };
    });
    setBezig(true);
    await slaOptiegroependOp(catId, itemId, groepen);
    setBezig(false);
  }

  if (laden) return (
    <div className="min-h-[200px] relative flex items-center justify-center">
      <LoadingOverlay visible />
    </div>
  );
  if (!event) return <p className="text-red-400">Geen actief evenement. Activeer eerst een evenement.</p>;

  return (
    <div className="flex flex-col gap-5 w-full max-w-3xl mx-auto">
      <LoadingOverlay visible={bezig} />
      <h2 className="text-white font-bold text-lg sm:text-xl">Menu &mdash; {event.name}</h2>

      <div className="bg-gray-900 rounded-2xl p-4 flex flex-col sm:flex-row gap-2">
        <input
          value={nieuwCatNaam}
          onChange={(e) => setNieuwCatNaam(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && voegCatToe()}
          placeholder="Nieuwe categorie..."
          className="flex-1 bg-gray-800 border border-gray-700 text-white px-3 py-3 rounded-xl focus:outline-none focus:border-green-500"
        />
        <button
          onClick={voegCatToe}
          disabled={bezig}
          className="bg-green-600 hover:bg-green-500 text-white px-4 py-3 rounded-xl transition sm:whitespace-nowrap"
        >
          + Toevoegen
        </button>
      </div>

      {categorieen.map((cat) => (
        <div key={cat.id} className="bg-gray-900 rounded-2xl overflow-hidden">
          <div
            className="flex items-center justify-between px-4 py-3 cursor-pointer"
            onClick={() => setActieveCat(actieveCat === cat.id ? null : cat.id)}
          >
            <span className="text-white font-semibold">{cat.name}</span>
            <div className="flex gap-2 items-center">
              <span className="text-gray-500 text-sm">{items[cat.id]?.length ?? 0} items</span>
              <button onClick={(e) => { e.stopPropagation(); verwijderCat(cat.id); }} className="text-gray-600 hover:text-red-400 transition">🗑</button>
              <span className="text-gray-500">{actieveCat === cat.id ? "▲" : "▼"}</span>
            </div>
          </div>

          {actieveCat === cat.id && (
            <div className="border-t border-gray-800">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => herorden(cat.id, e)}>
                <SortableContext items={(items[cat.id] ?? []).map((i) => i.id)} strategy={verticalListSortingStrategy}>
                  {(items[cat.id] ?? []).map((item) => (
                    <SortableItem key={item.id} id={item.id}>
                      {({ attributes, listeners, setActivatorNodeRef }) => (
                        <div className="border-b border-gray-800 last:border-0">
                          <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3.5">
                            <button
                              ref={setActivatorNodeRef}
                              {...attributes}
                              {...listeners}
                              className="shrink-0 w-11 h-11 rounded-xl bg-gray-800 border border-gray-700 text-gray-300 text-xl flex items-center justify-center touch-none active:scale-95 transition"
                              aria-label={`Versleep ${item.name}`}
                            >
                              ⠿
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className={`font-medium truncate ${item.available ? "text-white" : "text-gray-500 line-through"}`}>
                                {item.name}
                              </p>
                              <div className="flex items-center gap-2">
                                <p className="text-green-400 text-sm">€{item.price.toFixed(2)}</p>
                                {(item.optionGroups ?? []).length > 0 && (
                                  <span className="text-gray-500 text-xs">{item.optionGroups!.length} optiegroep{item.optionGroups!.length !== 1 ? "en" : ""}</span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => setBewerkItemOpties(bewerkItemOpties === item.id ? null : item.id)}
                              className={`text-xs px-3 py-2 rounded-full transition min-h-10 ${bewerkItemOpties === item.id ? "bg-blue-900 text-blue-300" : "bg-gray-800 text-gray-400 hover:text-gray-200"}`}
                            >
                              ⚙ Opties
                            </button>
                            <button
                              onClick={() => toggleAvailable(cat.id, item.id, item.available)}
                              className={`text-xs px-3 py-2 rounded-full transition min-h-10 ${item.available ? "bg-green-900 text-green-400" : "bg-gray-800 text-gray-500"}`}
                            >
                              {item.available ? "Beschikbaar" : "Uitgeschakeld"}
                            </button>
                            <button
                              onClick={() => verwijderItem(cat.id, item.id, item.name)}
                              className="text-gray-600 hover:text-red-400 transition text-lg min-h-10 min-w-10"
                              aria-label={`Verwijder ${item.name}`}
                            >
                              🗑
                            </button>
                          </div>

                          {bewerkItemOpties === item.id && (
                            <div className="bg-gray-800/50 border-t border-gray-700 px-4 py-4 flex flex-col gap-4">
                              <p className="text-gray-300 text-sm font-semibold">Optiegroepen voor {item.name}</p>

                              {(item.optionGroups ?? []).length === 0 && (
                                <p className="text-gray-500 text-sm">Nog geen optiegroepen.</p>
                              )}

                              {(item.optionGroups ?? []).map((groep) => (
                                <div key={groep.id} className="bg-gray-900 rounded-xl p-3 flex flex-col gap-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-white text-sm font-medium">{groep.name}</span>
                                      <span className={`text-xs px-2 py-0.5 rounded-full ${groep.type === "radio" ? "bg-purple-900 text-purple-300" : "bg-blue-900 text-blue-300"}`}>
                                        {groep.type === "radio" ? "Één keuze" : "Meerdere"}
                                      </span>
                                      {groep.required && <span className="text-xs px-2 py-0.5 rounded-full bg-orange-900 text-orange-300">Verplicht</span>}
                                    </div>
                                    <button onClick={() => verwijderGroep(cat.id, item.id, groep.id)} className="text-gray-600 hover:text-red-400 text-sm transition">🗑</button>
                                  </div>

                                  <div className="flex flex-col gap-1 pl-2">
                                    {groep.choices.map((keuze) => (
                                      <div key={keuze.id} className="flex items-center justify-between text-sm">
                                        <span className="text-gray-300">
                                          {keuze.name}
                                          {keuze.priceAdjustment > 0 && <span className="text-green-400 ml-1">+€{keuze.priceAdjustment.toFixed(2)}</span>}
                                          {keuze.priceAdjustment < 0 && <span className="text-red-400 ml-1">€{keuze.priceAdjustment.toFixed(2)}</span>}
                                        </span>
                                        <button onClick={() => verwijderKeuze(cat.id, item.id, groep.id, keuze.id)} className="text-gray-600 hover:text-red-400 transition">✕</button>
                                      </div>
                                    ))}
                                  </div>

                                  <div className="flex gap-2 mt-1">
                                    <input
                                      value={nieuwKeuze[groep.id]?.naam ?? ""}
                                      onChange={(e) => setNieuwKeuze((prev) => ({ ...prev, [groep.id]: { ...prev[groep.id], naam: e.target.value } }))}
                                      placeholder="Keuze naam"
                                      className="flex-1 bg-gray-800 border border-gray-700 text-white px-2 py-1.5 rounded-lg text-sm focus:outline-none focus:border-green-500"
                                    />
                                    <input
                                      value={nieuwKeuze[groep.id]?.meerprijs ?? ""}
                                      onChange={(e) => setNieuwKeuze((prev) => ({ ...prev, [groep.id]: { ...prev[groep.id], meerprijs: e.target.value } }))}
                                      placeholder="+0.00"
                                      className="w-20 bg-gray-800 border border-gray-700 text-white px-2 py-1.5 rounded-lg text-sm focus:outline-none focus:border-green-500"
                                    />
                                    <button
                                      onClick={() => voegKeuzeToeToe(cat.id, item.id, groep.id)}
                                      className="bg-green-700 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm transition"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              ))}

                              <div className="bg-gray-900 rounded-xl p-3 flex flex-col gap-2 border border-dashed border-gray-700">
                                <p className="text-gray-400 text-xs font-medium uppercase tracking-wide">Nieuwe optiegroep</p>
                                <input
                                  value={nieuwGroep.naam}
                                  onChange={(e) => setNieuwGroep((p) => ({ ...p, naam: e.target.value }))}
                                  placeholder="Naam (bijv. Grootte)"
                                  className="bg-gray-800 border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-green-500"
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => setNieuwGroep((p) => ({ ...p, type: "radio" }))}
                                    className={`flex-1 py-2 rounded-lg text-sm transition ${nieuwGroep.type === "radio" ? "bg-purple-700 text-white" : "bg-gray-800 text-gray-400"}`}
                                  >
                                    Één keuze
                                  </button>
                                  <button
                                    onClick={() => setNieuwGroep((p) => ({ ...p, type: "checkbox" }))}
                                    className={`flex-1 py-2 rounded-lg text-sm transition ${nieuwGroep.type === "checkbox" ? "bg-blue-700 text-white" : "bg-gray-800 text-gray-400"}`}
                                  >
                                    Meerdere
                                  </button>
                                  <button
                                    onClick={() => setNieuwGroep((p) => ({ ...p, verplicht: !p.verplicht }))}
                                    className={`flex-1 py-2 rounded-lg text-sm transition ${nieuwGroep.verplicht ? "bg-orange-700 text-white" : "bg-gray-800 text-gray-400"}`}
                                  >
                                    {nieuwGroep.verplicht ? "Verplicht" : "Optioneel"}
                                  </button>
                                </div>
                                <button
                                  onClick={() => voegGroepToe(cat.id, item.id)}
                                  disabled={!nieuwGroep.naam.trim()}
                                  className="bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white py-2 rounded-lg text-sm transition"
                                >
                                  + Optiegroep toevoegen
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </SortableItem>
                  ))}
                </SortableContext>
              </DndContext>

              <div className="flex flex-col sm:flex-row gap-2 p-4">
                <input
                  value={nieuwItem.naam}
                  onChange={(e) => setNieuwItem((p) => ({ ...p, naam: e.target.value }))}
                  placeholder="Item naam"
                  className="flex-1 bg-gray-800 border border-gray-700 text-white px-3 py-3 rounded-xl focus:outline-none focus:border-green-500 text-sm"
                />
                <input
                  value={nieuwItem.prijs}
                  onChange={(e) => setNieuwItem((p) => ({ ...p, prijs: e.target.value }))}
                  placeholder="Prijs"
                  className="w-full sm:w-24 bg-gray-800 border border-gray-700 text-white px-3 py-3 rounded-xl focus:outline-none focus:border-green-500 text-sm"
                />
                <button
                  onClick={() => voegItemToe(cat.id)}
                  disabled={bezig}
                  className="bg-green-700 hover:bg-green-600 text-white px-4 py-3 rounded-xl transition text-sm sm:whitespace-nowrap"
                >
                  + Item
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}