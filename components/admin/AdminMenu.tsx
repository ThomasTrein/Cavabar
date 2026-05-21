"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc,
  doc, query, orderBy, where, Timestamp, writeBatch,
} from "firebase/firestore";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { FirebaseEvent, Category, MenuItem } from "@/lib/types";

function SortableItem({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

export default function AdminMenu() {
  const [event, setEvent] = useState<FirebaseEvent | null>(null);
  const [categorieën, setCategorieën] = useState<Category[]>([]);
  const [items, setItems] = useState<Record<string, MenuItem[]>>({});
  const [laden, setLaden] = useState(true);
  const [actieveCat, setActieveCat] = useState<string | null>(null);

  const [nieuwCatNaam, setNieuwCatNaam] = useState("");
  const [nieuwItem, setNieuwItem] = useState({ naam: "", prijs: "" });
  const [bezig, setBezig] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor));

  useEffect(() => { laad(); }, []);

  async function laad() {
    setLaden(true);
    const snap = await getDocs(query(collection(db, "events"), where("active", "==", true)));
    if (snap.empty) { setLaden(false); return; }
    const ev = { id: snap.docs[0].id, ...snap.docs[0].data() } as FirebaseEvent;
    setEvent(ev);

    const catSnap = await getDocs(query(collection(db, `events/${ev.id}/categories`), orderBy("order")));
    const cats = catSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Category));
    setCategorieën(cats);

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
      name: nieuwCatNaam.trim(), order: categorieën.length,
    });
    setNieuwCatNaam("");
    await laad();
    setBezig(false);
  }

  async function verwijderCat(catId: string) {
    if (!event || !confirm("Categorie verwijderen (inclusief alle items)?")) return;
    await deleteDoc(doc(db, `events/${event.id}/categories/${catId}`));
    await laad();
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
  }

  async function toggleAvailable(catId: string, itemId: string, huidig: boolean) {
    if (!event) return;
    await updateDoc(doc(db, `events/${event.id}/categories/${catId}/items/${itemId}`), { available: !huidig });
    await laad();
  }

  async function verwijderItem(catId: string, itemId: string) {
    if (!event || !confirm("Item verwijderen?")) return;
    await deleteDoc(doc(db, `events/${event.id}/categories/${catId}/items/${itemId}`));
    await laad();
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

  if (laden) return <p className="text-gray-400">Laden...</p>;
  if (!event) return <p className="text-red-400">Geen actief evenement. Activeer eerst een evenement.</p>;

  return (
    <div className="flex flex-col gap-5 max-w-2xl">
      <h2 className="text-white font-bold text-lg">Menu — {event.name}</h2>

      {/* Nieuwe categorie */}
      <div className="bg-gray-900 rounded-2xl p-4 flex gap-2">
        <input
          value={nieuwCatNaam}
          onChange={(e) => setNieuwCatNaam(e.target.value)}
          placeholder="Nieuwe categorie..."
          className="flex-1 bg-gray-800 border border-gray-700 text-white px-3 py-2 rounded-xl focus:outline-none focus:border-green-500"
        />
        <button
          onClick={voegCatToe}
          disabled={bezig}
          className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-xl transition"
        >
          + Toevoegen
        </button>
      </div>

      {/* Categorieën */}
      {categorieën.map((cat) => (
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
              {/* Items met drag-and-drop */}
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => herorden(cat.id, e)}>
                <SortableContext items={(items[cat.id] ?? []).map((i) => i.id)} strategy={verticalListSortingStrategy}>
                  {(items[cat.id] ?? []).map((item) => (
                    <SortableItem key={item.id} id={item.id}>
                      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800 last:border-0 cursor-grab active:cursor-grabbing">
                        <span className="text-gray-600">⠿</span>
                        <div className="flex-1">
                          <span className={`font-medium ${item.available ? "text-white" : "text-gray-500 line-through"}`}>
                            {item.name}
                          </span>
                          <span className="text-green-400 text-sm ml-2">€{item.price.toFixed(2)}</span>
                        </div>
                        <button
                          onClick={() => toggleAvailable(cat.id, item.id, item.available)}
                          className={`text-xs px-2 py-1 rounded-full transition ${item.available ? "bg-green-900 text-green-400" : "bg-gray-800 text-gray-500"}`}
                        >
                          {item.available ? "Beschikbaar" : "Uitgeschakeld"}
                        </button>
                        <button onClick={() => verwijderItem(cat.id, item.id)} className="text-gray-600 hover:text-red-400 transition">🗑</button>
                      </div>
                    </SortableItem>
                  ))}
                </SortableContext>
              </DndContext>

              {/* Nieuw item */}
              <div className="flex gap-2 p-4">
                <input
                  value={nieuwItem.naam}
                  onChange={(e) => setNieuwItem((p) => ({ ...p, naam: e.target.value }))}
                  placeholder="Item naam"
                  className="flex-1 bg-gray-800 border border-gray-700 text-white px-3 py-2 rounded-xl focus:outline-none focus:border-green-500 text-sm"
                />
                <input
                  value={nieuwItem.prijs}
                  onChange={(e) => setNieuwItem((p) => ({ ...p, prijs: e.target.value }))}
                  placeholder="Prijs"
                  className="w-20 bg-gray-800 border border-gray-700 text-white px-3 py-2 rounded-xl focus:outline-none focus:border-green-500 text-sm"
                />
                <button
                  onClick={() => voegItemToe(cat.id)}
                  disabled={bezig}
                  className="bg-green-700 hover:bg-green-600 text-white px-3 py-2 rounded-xl transition text-sm"
                >
                  +
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
