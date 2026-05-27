# Netlify Deploy Gids (Cavabar)

Deze stappen zijn afgestemd op deze Next.js-app.

## 1. Project koppelen in Netlify

1. Push je code naar GitHub.
2. Ga in Netlify naar **Add new site** -> **Import an existing project**.
3. Kies je GitHub repo.

## 2. Build instellingen

Gebruik deze waarden:

- **Build command:** `npm run build`
- **Publish directory:** `.next`

> Netlify gebruikt voor dit project de Next.js runtime/plugin automatisch.

## 3. Environment variables instellen

Ga in Netlify naar **Site settings** -> **Environment variables** en voeg toe:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

Belangrijk:

- Het admin wachtwoord komt uit Firestore (`settings/global.adminPassword`), niet uit env vars.
- Gebruik sterke, unieke waarden.
- Zet echte waarden alleen in Netlify env vars, niet hardcoded in code of docs.

## 4. Deploy uitvoeren

1. Klik **Deploy site**.
2. Wacht tot de build klaar is.
3. Open de site URL en test:
   - `/` (home)
   - `/admin` (admin login met wachtwoord uit Firestore)

## 5. Veelvoorkomende fout: secrets scanning

Als deploy faalt op secret scanning:

1. Controleer of geheime waarden niet letterlijk in bestanden staan.
2. Gebruik placeholders in markdown/documentatie.
3. Laat secrets alleen via Netlify environment variables binnenkomen.

## 6. Herdeploy na wijzigingen

Na een codepush naar de gekoppelde branch start Netlify automatisch een nieuwe deploy.
