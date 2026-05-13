# smartapky-booking

Next.js (App Router) app pro **rezervaci konzultací**: dostupné sloty z Google Calendar, rezervace s Google Meet, rate limiting přes **Upstash Redis**.

Marketingový web v repu [smartapky-modern-web](https://github.com/Adam-Krenc/smartapky-modern-web) na booking jen **odkazuje** (např. `https://…vercel.app/book` nebo později `https://book.smartapky.cz/book`).

## Požadavky

- Node.js 20+ (pro `node --env-file=…`)
- Google Cloud projekt s **Google Calendar API** a OAuth klientem typu **Web application**
- Upstash Redis (REST URL + token)
- Volitelně Resend účet s ověřenou doménou `smartapky.cz` pro potvrzovací e-mail z `obchod@smartapky.cz`

## Lokální vývoj

1. Zkopíruj `.env.example` → `.env.local` a doplň hodnoty (bez commitování).

2. **Refresh token** (jednorázově na svém počítači):

   - V Google Cloud Console u OAuth klienta přidej redirect URI  
     `http://127.0.0.1:3456/oauth/callback`  
     (nebo vlastní port přes `OAUTH_LOCAL_PORT`).
   - Spusť:

     ```bash
     npm run get-token
     ```

   - Výsledný `GOOGLE_REFRESH_TOKEN` vlož do `.env.local` a na Vercelu do Environment Variables.

3. Dev server:

   ```bash
   npm run dev
   ```

   Úvodní stránka přesměruje na `/book`.

## API

| Metoda | Cesta | Popis |
|--------|--------|--------|
| `GET` | `/api/slots` | Volné sloty v JSON (`slots: string[]` ISO časy). |
| `POST` | `/api/book` | Tělo: `name`, `email`, `notes?`, `slotStart` (ISO), `gdprAccepted: true`. |

## Env proměnné

Viz `.env.example`. Povinné: `GOOGLE_*`, `UPSTASH_REDIS_*`. Volitelné: `WORK_HOURS`, `OFFICE_EMAIL`, `RESEND_API_KEY`, `BOOKING_FROM_EMAIL`, `BOOKING_FROM_NAME`, limity rezervací, `NEXT_PUBLIC_GDPR_PDF_URL`.

`OFFICE_EMAIL` je interní účastník kalendářové události, defaultně `obchod@smartapky.cz`.

Pokud nastavíš `RESEND_API_KEY`, aplikace po úspěšném vytvoření Google Meet události pošle zájemci samostatný potvrzovací e-mail přes Resend. Odesílatel je defaultně `Smartapky <obchod@smartapky.cz>`:

```bash
RESEND_API_KEY=re_...
BOOKING_FROM_EMAIL=obchod@smartapky.cz
BOOKING_FROM_NAME=Smartapky
```

Před produkcí musí být v Resendu ověřená doména `smartapky.cz` a povolený odesílatel `obchod@smartapky.cz`. Kalendářová pozvánka od Google může přijít zvlášť z účtu, který vlastní `GOOGLE_REFRESH_TOKEN`; Resend e-mail řeší vlastní potvrzení z obchodní adresy.

`WORK_HOURS` je JSON mapy **ISO weekday 1–7** (pondělí = 1) na pracovní okno:

- **Legacy:** `[9,17]` = 09:00–17:00 (jako dřív; poslední hodinový slot začíná v 16:00).
- **S minutami:** `{"from":"15:30","to":"23:00"}` — první slot v 15:30, poslední 60min slot končí v 23:00 (poslední začátek 22:00).
- **Kompaktně:** `[15,30,23,0]` totéž co `from`/`to`.

Bez nastavení platí Po–Pá 9–17 v `TIMEZONE` (default `Europe/Prague`). Na Vercelu vlož JSON na **jeden řádek** bez mezer kolem klíčů (nebo escapuj podle dokumentace env).

## Deploy (Vercel)

1. Importuj tento repozitář do Vercelu.
2. Nastav stejné env proměnné jako lokálně (`GOOGLE_REFRESH_TOKEN` jen ve Vercelu).
3. Po prvním deployi přidej produkční URL do OAuth redirectů, např.  
   `https://<projekt>.vercel.app/api/...` — **pozn:** samotné rezervace refresh token nepotřebují měnit redirect; redirect je potřeba hlavně pro lokální skript `get-token`. Pro produkční OAuth rozšíření později doplníš `https://book.smartapky.cz/...` pokud přidáš přihlášení uživatelů apod.
4. Doména `book.smartapky.cz`: DNS CNAME na Vercel + nastavení domény v projektu.

## Fáze 7 (volitelně)

- Rozšířit potvrzovací e-mail o ICS přílohu, pokud nebude stačit Google kalendářová pozvánka.
