"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminEvenementen from "@/components/admin/AdminEvenementen";
import AdminMenu from "@/components/admin/AdminMenu";
import AdminBestellingen from "@/components/admin/AdminBestellingen";
import AdminStatistieken from "@/components/admin/AdminStatistieken";
import AdminInstellingen from "@/components/admin/AdminInstellingen";

const ADMIN_KEY = "cavabar_admin_auth";
const ADMIN_DATUM_KEY = "cavabar_admin_datum";

type Tab = "evenementen" | "menu" | "bestellingen" | "statistieken" | "instellingen";

function isAdminIngelogd(): boolean {
  const datum = localStorage.getItem(ADMIN_DATUM_KEY);
  return datum === new Date().toDateString() && localStorage.getItem(ADMIN_KEY) === "1";
}

export default function AdminPage() {
  const router = useRouter();
  const [ingelogd, setIngelogd] = useState(false);
  const [ww, setWw] = useState("");
  const [fout, setFout] = useState("");
  const [actieveTab, setActieveTab] = useState<Tab>("evenementen");

  useEffect(() => {
    setIngelogd(isAdminIngelogd());
  }, []);

  function login() {
    const correct = process.env.NEXT_PUBLIC_ADMIN_PASSWORD ?? "admin123";
    if (ww === correct) {
      localStorage.setItem(ADMIN_KEY, "1");
      localStorage.setItem(ADMIN_DATUM_KEY, new Date().toDateString());
      setIngelogd(true);
    } else {
      setFout("Fout wachtwoord.");
    }
  }

  function logout() {
    localStorage.removeItem(ADMIN_KEY);
    localStorage.removeItem(ADMIN_DATUM_KEY);
    setIngelogd(false);
  }

  if (!ingelogd) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen p-6 gap-5">
        <div className="w-full max-w-xs">
          <button
            onClick={() => router.push("/")}
            className="text-gray-400 hover:text-white text-sm flex items-center gap-1 mb-6 transition"
          >
            ← Terug naar home
          </button>
        </div>
        <div className="text-center">
          <div className="text-4xl mb-3">⚙️</div>
          <h1 className="text-2xl font-bold text-white mb-1">Admin</h1>
          <p className="text-gray-400 text-sm">Cavabar beheer</p>
        </div>
        <div className="w-full max-w-xs flex flex-col gap-3">
          <input
            type="password"
            placeholder="Wachtwoord"
            value={ww}
            onChange={(e) => { setWw(e.target.value); setFout(""); }}
            onKeyDown={(e) => e.key === "Enter" && login()}
            className="bg-gray-800 border border-gray-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-green-500"
            autoFocus
          />
          {fout && <p className="text-red-400 text-sm">{fout}</p>}
          <button
            onClick={login}
            className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition"
          >
            Inloggen
          </button>
        </div>
      </main>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "evenementen", label: "📅 Evenementen" },
    { id: "menu", label: "🍺 Menu" },
    { id: "bestellingen", label: "📋 Bestellingen" },
    { id: "statistieken", label: "📊 Statistieken" },
    { id: "instellingen", label: "⚙️ Instellingen" },
  ];

  return (
    <main className="flex flex-col min-h-screen">
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/")} className="text-gray-400 hover:text-white text-sm transition">← Home</button>
          <h1 className="text-lg font-bold text-green-400">Admin — Cavabar</h1>
        </div>
        <button onClick={logout} className="text-gray-500 hover:text-red-400 text-sm transition">Afmelden</button>
      </header>

      {/* Tab navigatie */}
      <div className="bg-gray-900 border-b border-gray-800 flex overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActieveTab(tab.id)}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition border-b-2 ${
              actieveTab === tab.id
                ? "border-green-500 text-green-400"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 p-4">
        {actieveTab === "evenementen" && <AdminEvenementen />}
        {actieveTab === "menu" && <AdminMenu />}
        {actieveTab === "bestellingen" && <AdminBestellingen />}
        {actieveTab === "statistieken" && <AdminStatistieken />}
        {actieveTab === "instellingen" && <AdminInstellingen />}
      </div>
    </main>
  );
}
