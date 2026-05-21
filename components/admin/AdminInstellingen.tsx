"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

const ADMIN_KEY = "cavabar_admin_auth";
const ADMIN_DATUM_KEY = "cavabar_admin_datum";

export default function AdminInstellingen() {
  const [huidigWw, setHuidigWw] = useState("");
  const [nieuwWw, setNieuwWw] = useState("");
  const [bevestigWw, setBevestigWw] = useState("");
  const [bericht, setBericht] = useState("");
  const [fout, setFout] = useState("");

  const [lichtThema, setLichtThema] = useState(false);
  const [themaLaden, setThemaLaden] = useState(true);
  const [themaBezig, setThemaBezig] = useState(false);

  useEffect(() => { laadThema(); }, []);

  async function laadThema() {
    try {
      const snap = await getDoc(doc(db, "settings", "global"));
      if (snap.exists()) setLichtThema(snap.data()?.lightTheme === true);
    } catch (e) {
      console.error(e);
    } finally {
      setThemaLaden(false);
    }
  }

  async function toggleThema() {
    setThemaBezig(true);
    try {
      const nieuw = !lichtThema;
      await setDoc(doc(db, "settings", "global"), { lightTheme: nieuw }, { merge: true });
      setLichtThema(nieuw);
    } finally {
      setThemaBezig(false);
    }
  }

  function wijzigWachtwoord() {
    const correct = process.env.NEXT_PUBLIC_ADMIN_PASSWORD ?? "admin123";
    if (huidigWw !== correct) { setFout("Huidig wachtwoord is fout."); return; }
    if (!nieuwWw.trim()) { setFout("Nieuw wachtwoord mag niet leeg zijn."); return; }
    if (nieuwWw !== bevestigWw) { setFout("Wachtwoorden komen niet overeen."); return; }
    setFout("");
    setBericht(`✅ Sla dit op in je .env.local: NEXT_PUBLIC_ADMIN_PASSWORD=${nieuwWw}`);
    setHuidigWw(""); setNieuwWw(""); setBevestigWw("");
  }

  return (
    <div className="flex flex-col gap-5 max-w-md">
      <h2 className="text-white font-bold text-lg">Instellingen</h2>

      {/* Thema */}
      <div className="bg-gray-900 rounded-2xl p-5 flex items-center justify-between">
        <div>
          <p className="text-white font-medium">🌞 Licht thema</p>
          <p className="text-gray-400 text-sm mt-0.5">Geldt voor alle gebruikers</p>
        </div>
        {themaLaden ? (
          <span className="text-gray-500 text-sm">Laden...</span>
        ) : (
          <button
            onClick={toggleThema}
            disabled={themaBezig}
            className={`relative w-14 h-7 rounded-full transition-colors duration-200 ${
              lichtThema ? "bg-green-500" : "bg-gray-700"
            } disabled:opacity-50`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-200 ${
                lichtThema ? "translate-x-7" : "translate-x-0"
              }`}
            />
          </button>
        )}
      </div>

      {/* Wachtwoord wijzigen */}
      <div className="bg-gray-900 rounded-2xl p-5 flex flex-col gap-4">
        <p className="text-gray-300 font-medium">Admin wachtwoord wijzigen</p>
        <input
          type="password"
          placeholder="Huidig wachtwoord"
          value={huidigWw}
          onChange={(e) => { setHuidigWw(e.target.value); setFout(""); setBericht(""); }}
          className="bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded-xl focus:outline-none focus:border-green-500"
        />
        <input
          type="password"
          placeholder="Nieuw wachtwoord"
          value={nieuwWw}
          onChange={(e) => setNieuwWw(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded-xl focus:outline-none focus:border-green-500"
        />
        <input
          type="password"
          placeholder="Bevestig nieuw wachtwoord"
          value={bevestigWw}
          onChange={(e) => setBevestigWw(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded-xl focus:outline-none focus:border-green-500"
        />
        {fout && <p className="text-red-400 text-sm">{fout}</p>}
        {bericht && <p className="text-green-400 text-sm">{bericht}</p>}
        <button
          onClick={wijzigWachtwoord}
          className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded-xl transition"
        >
          Wachtwoord wijzigen
        </button>
      </div>

      <div className="bg-gray-900 rounded-2xl p-5">
        <p className="text-gray-300 font-medium mb-2">Firebase Project</p>
        <p className="text-gray-500 text-sm">Project ID: {process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "niet geconfigureerd"}</p>
        <p className="text-gray-500 text-sm mt-1">Configureer Firebase in <code className="text-green-400">.env.local</code></p>
      </div>
    </div>
  );
}
