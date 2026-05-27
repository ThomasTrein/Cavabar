"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useToast } from "@/components/ToastProvider";
import LoadingOverlay from "@/components/LoadingOverlay";

const ADMIN_KEY = "cavabar_admin_auth";
const ADMIN_DATUM_KEY = "cavabar_admin_datum";

export default function AdminInstellingen() {
  const { toast } = useToast();
  const [huidigWw, setHuidigWw] = useState("");
  const [nieuwWw, setNieuwWw] = useState("");
  const [bevestigWw, setBevestigWw] = useState("");

  const [lichtThema, setLichtThema] = useState(false);
  const [themaLaden, setThemaLaden] = useState(true);
  const [themaBezig, setThemaBezig] = useState(false);
  const [wachtwoordBezig, setWachtwoordBezig] = useState(false);

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
      toast(nieuw ? "Licht thema ingeschakeld" : "Donker thema ingeschakeld", "success");
    } catch {
      toast("Fout bij opslaan van thema", "error");
    } finally {
      setThemaBezig(false);
    }
  }

  async function wijzigWachtwoord() {
    if (!huidigWw.trim()) { toast("Vul je huidige wachtwoord in.", "error"); return; }
    if (!nieuwWw.trim()) { toast("Nieuw wachtwoord mag niet leeg zijn.", "error"); return; }
    if (nieuwWw !== bevestigWw) { toast("Wachtwoorden komen niet overeen.", "error"); return; }

    setWachtwoordBezig(true);
    try {
      const ref = doc(db, "settings", "global");
      const snap = await getDoc(ref);
      const opgeslagenWachtwoord = snap.exists() ? snap.data()?.adminPassword : null;

      if (typeof opgeslagenWachtwoord !== "string" || opgeslagenWachtwoord.length === 0) {
        toast("Geen admin wachtwoord ingesteld in Firebase.", "error");
        return;
      }

      if (huidigWw !== opgeslagenWachtwoord) {
        toast("Huidig wachtwoord is fout.", "error");
        return;
      }

      await setDoc(ref, { adminPassword: nieuwWw }, { merge: true });
    } catch {
      toast("Netwerkfout. Probeer opnieuw.", "error");
      return;
    } finally {
      setWachtwoordBezig(false);
    }

    toast("Admin wachtwoord opgeslagen in Firebase.", "success");
    setHuidigWw(""); setNieuwWw(""); setBevestigWw("");
  }

  return (
    <div className="flex flex-col gap-5 max-w-md">
      <LoadingOverlay visible={themaBezig} />
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
          onChange={(e) => setHuidigWw(e.target.value)}
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
        <button
          onClick={() => { void wijzigWachtwoord(); }}
          disabled={wachtwoordBezig}
          className="bg-green-600 hover:bg-green-500 disabled:opacity-60 text-white font-bold py-2 rounded-xl transition"
        >
          {wachtwoordBezig ? "Bezig..." : "Wachtwoord wijzigen"}
        </button>
      </div>
    </div>
  );
}
