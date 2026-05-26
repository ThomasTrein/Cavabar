"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";

const NAAM_KEY = "cavabar_naam";
const NAAM_DATUM_KEY = "cavabar_naam_datum";

function getNaamVandaag(): string | null {
  if (typeof window === "undefined") return null;
  const opgeslagenDatum = localStorage.getItem(NAAM_DATUM_KEY);
  const vandaag = new Date().toDateString();
  if (opgeslagenDatum !== vandaag) {
    localStorage.removeItem(NAAM_KEY);
    localStorage.removeItem(NAAM_DATUM_KEY);
    return null;
  }
  return localStorage.getItem(NAAM_KEY);
}

export default function HomePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [naam, setNaam] = useState("");
  const [huidigNaam, setHuidigNaam] = useState<string | null>(null);

  useEffect(() => {
    const n = getNaamVandaag();
    if (n) {
      setHuidigNaam(n);
    }
  }, []);

  function slaOp() {
    if (!naam.trim()) {
      toast("Voer je naam in.", "error");
      return;
    }
    localStorage.setItem(NAAM_KEY, naam.trim());
    localStorage.setItem(NAAM_DATUM_KEY, new Date().toDateString());
    router.push("/bestelling/nieuw");
  }

  function meldAf() {
    localStorage.removeItem(NAAM_KEY);
    localStorage.removeItem(NAAM_DATUM_KEY);
    setHuidigNaam(null);
    setNaam("");
  }

  if (huidigNaam) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen p-6 gap-6">
        <div className="text-center">
          <div className="text-5xl mb-4">🚴</div>
          <h1 className="text-3xl font-bold text-green-400 mb-1">Cavabar</h1>
          <p className="text-gray-400">Welkom, <span className="text-white font-semibold">{huidigNaam}</span>!</p>
        </div>

        <div className="w-full max-w-sm flex flex-col gap-3">
          <button
            onClick={() => router.push("/bestelling/nieuw")}
            className="w-full bg-green-600 hover:bg-green-500 text-white text-xl font-bold py-5 rounded-2xl transition"
          >
            ➕ Nieuwe bestelling
          </button>
          <button
            onClick={() => router.push("/geschiedenis")}
            className="w-full bg-gray-800 hover:bg-gray-700 text-white text-lg font-semibold py-4 rounded-2xl transition"
          >
            📋 Mijn bestellingen
          </button>
          <button
            onClick={() => router.push("/admin")}
            className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 text-base py-3 rounded-2xl transition"
          >
            ⚙️ Admin
          </button>
          <button
            onClick={meldAf}
            className="w-full bg-red-900/40 hover:bg-red-900/60 border border-red-800 text-red-300 hover:text-red-200 text-base font-semibold py-3 rounded-2xl transition"
          >
            🚪 Afmelden ({huidigNaam})
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-6 gap-6">
      <div className="text-center">
        <div className="text-5xl mb-4">🚴</div>
        <h1 className="text-3xl font-bold text-green-400 mb-1">Cavabar</h1>
        <p className="text-gray-400">Voer je naam in om te beginnen</p>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-4">
        <input
          type="text"
          placeholder="Jouw naam"
          value={naam}
          onChange={(e) => setNaam(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && slaOp()}
          className="w-full bg-gray-800 border border-gray-700 text-white text-xl px-5 py-4 rounded-2xl focus:outline-none focus:border-green-500"
          autoFocus
        />
        <button
          onClick={slaOp}
          className="w-full bg-green-600 hover:bg-green-500 text-white text-xl font-bold py-5 rounded-2xl transition"
        >
          Doorgaan →
        </button>
      </div>
    </main>
  );
}
