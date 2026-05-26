"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import type { FirebaseEvent } from "@/lib/types";

export default function AdminEvenementen() {
  const [evenementen, setEvenementen] = useState<FirebaseEvent[]>([]);
  const [laden, setLaden] = useState(true);
  const [naam, setNaam] = useState("");
  const [datum, setDatum] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  useEffect(() => { laad(); }, []);

  async function laad() {
    setLaden(true);
    try {
      const snap = await getDocs(query(collection(db, "events"), orderBy("date", "desc")));
      setEvenementen(snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirebaseEvent)));
    } catch (e) {
      console.error("Fout bij laden evenementen:", e);
      setFout("Kon evenementen niet laden. Controleer je Firebase configuratie.");
    } finally {
      setLaden(false);
    }
  }

  async function maakAan() {
    if (!naam.trim() || !datum) { setFout("Vul naam en datum in."); return; }
    setBezig(true);
    try {
      await addDoc(collection(db, "events"), {
        name: naam.trim(),
        date: datum,
        active: false,
        createdAt: Timestamp.now(),
      });
      setNaam(""); setDatum(""); setFout("");
      await laad();
    } finally { setBezig(false); }
  }

  async function activeer(id: string) {
    setBezig(true);
    try {
      const batch = writeBatch(db);
      evenementen.forEach((e) => {
        batch.update(doc(db, "events", e.id), { active: e.id === id });
      });
      await batch.commit();
      await laad();
    } finally { setBezig(false); }
  }

  async function verwijder(id: string) {
    if (!confirm("Evenement verwijderen?")) return;
    await deleteDoc(doc(db, "events", id));
    await laad();
  }

  if (laden) return <p className="text-gray-400">Laden...</p>;
  if (fout) return (
    <div className="flex flex-col gap-3 max-w-2xl">
      <p className="text-red-400">{fout}</p>
      <button onClick={laad} className="text-green-400 underline text-sm">Opnieuw proberen</button>
    </div>
  );

  return (
    <div className="flex flex-col gap-5 max-w-2xl">
      <h2 className="text-white font-bold text-lg">Evenementen</h2>

      {/* Nieuw evenement */}
      <div className="bg-gray-900 rounded-2xl p-4 flex flex-col gap-3">
        <p className="text-gray-400 text-sm">Nieuw evenement</p>
        <input
          value={naam}
          onChange={(e) => setNaam(e.target.value)}
          placeholder="Naam (bv. Rommelmarkt 2026)"
          className="bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded-xl focus:outline-none focus:border-green-500"
        />
        <input
          type="date"
          value={datum}
          onChange={(e) => setDatum(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded-xl focus:outline-none focus:border-green-500"
        />
        {fout && <p className="text-red-400 text-sm">{fout}</p>}
        <button
          onClick={maakAan}
          disabled={bezig}
          className="bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white font-bold py-2 rounded-xl transition"
        >
          Aanmaken
        </button>
      </div>

      {/* Lijst */}
      <div className="flex flex-col gap-2">
        {evenementen.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-4">Nog geen evenementen. Maak er één aan hierboven.</p>
        )}
        {evenementen.map((e) => (
          <div key={e.id} className="bg-gray-900 rounded-2xl p-4 flex items-center gap-3">
            <div className="flex-1">
              <p className="text-white font-semibold">{e.name}</p>
              <p className="text-gray-500 text-sm">{e.date}</p>
            </div>
            {e.active
              ? <span className="bg-green-900 text-green-400 text-xs px-2 py-1 rounded-full">Actief</span>
              : <button onClick={() => activeer(e.id)} disabled={bezig} className="text-xs text-gray-400 hover:text-green-400 border border-gray-700 px-2 py-1 rounded-full transition">Activeer</button>
            }
            <button onClick={() => verwijder(e.id)} className="text-gray-600 hover:text-red-400 text-sm transition">🗑</button>
          </div>
        ))}
      </div>
    </div>
  );
}
