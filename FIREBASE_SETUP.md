# 🔥 Firebase Setup — Cavabar

Deze gids legt stap voor stap uit hoe je Firebase instelt voor het Cavabar bestelsysteem.

---

## Stap 1 — Firebase project aanmaken

1. Ga naar [https://console.firebase.google.com](https://console.firebase.google.com)
2. Klik op **"Project toevoegen"** (of "Add project")
3. Geef het project de naam: **`cavabar-bestelapp`**
4. Google Analytics: **uitschakelen** (niet nodig)
5. Klik op **"Project aanmaken"**

---

## Stap 2 — Firestore database inschakelen

1. Klik in het linkermenu op **"Firestore Database"** (onder "Build")
2. Klik op **"Database aanmaken"**
3. Kies **"Start in production mode"**
4. Kies als locatie: **`europe-west1`** (België/Nederland)
5. Klik op **"Gereed"**

### Beveiligingsregels instellen

Na het aanmaken, klik op het tabblad **"Rules"** en vervang de inhoud door:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

> ⚠️ Dit staat alles toe — geschikt voor intern gebruik op de rommelmarkt. Klik op **"Publiceren"**.

---

## Stap 3 — Web-app registreren

1. Klik op het **tandwielpictogram** naast "Project Overview" → **"Projectinstellingen"**
2. Scroll naar beneden naar **"Jouw apps"**
3. Klik op het **`</>`** icoon (Web)
4. Geef de app een naam: **`Cavabar Web`**
5. **Geen** Firebase Hosting aanvinken
6. Klik op **"App registreren"**
7. Je krijgt nu een configuratieblok te zien dat er zo uitziet:

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "cavabar-bestelapp.firebaseapp.com",
  projectId: "cavabar-bestelapp",
  storageBucket: "cavabar-bestelapp.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

8. Klik op **"Doorgaan naar console"**

---

## Stap 4 — `.env.local` invullen

Open het bestand **`C:\Users\ThomasLisabeth\Documents\Cavabar\.env.local`** en vul de waarden in uit de configuratie van stap 3:

```env
# Firebase - Cavabar project
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=cavabar-bestelapp.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=cavabar-bestelapp
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=cavabar-bestelapp.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

# Admin wachtwoord (verander dit naar iets veiliger!)
NEXT_PUBLIC_ADMIN_PASSWORD=admin123
```

> 💡 Vervang alle waarden na `=` door jouw eigen waarden uit de Firebase console.

---

## Stap 5 — Firestore indexen aanmaken

De app doet queries die een samengestelde index vereisen. Firebase zal dit automatisch melden als je de app voor het eerst gebruikt (foutmelding in de browser console met een link). Je kan ook nu al handmatig de index aanmaken:

1. Ga naar **Firestore → Indexen → Samengesteld**
2. Klik op **"Index toevoegen"**
3. Vul in:
   - **Collection:** `orders`
   - **Veld 1:** `lidId` — Oplopend
   - **Veld 2:** `createdAt` — Aflopend
4. Klik op **"Index aanmaken"**

> ⏳ Het aanmaken duurt 1-2 minuten.

---

## Stap 6 — De app starten

Open een terminal in de Cavabar map en voer uit:

```bash
npm run dev
```

Ga naar [http://localhost:3000](http://localhost:3000)

---

## Stap 7 — Eerste keer instellen in de app

1. Ga naar [http://localhost:3000/admin](http://localhost:3000/admin)
2. Log in met het wachtwoord: **`admin123`** (of wat je ingesteld hebt in `.env.local`)
3. Maak een **evenement** aan (bv. "Rommelmarkt 2026") en activeer het
4. Ga naar het tabblad **🍺 Menu** en voeg categorieën en dranken toe
5. Klaar! De leden kunnen nu bestellingen plaatsen via de startpagina

---

## Samenvatting

| Stap | Wat |
|------|-----|
| 1 | Firebase project aanmaken op console.firebase.google.com |
| 2 | Firestore database inschakelen (europe-west1) |
| 3 | Web-app registreren en config kopiëren |
| 4 | `.env.local` invullen met jouw Firebase config |
| 5 | Firestore index aanmaken voor bestellingen |
| 6 | `npm run dev` starten |
| 7 | Evenement + menu aanmaken in admin |

---

> 📁 Dit project staat op: `C:\Users\ThomasLisabeth\Documents\Cavabar`
