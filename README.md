# 🎅 Vánoční koulovačka

Koulovačka Santů pro mobily (i PC). Jeden hráč proti počítači, nebo multiplayer až 8 Santů v jedné aréně.

Repozitář obsahuje:

| soubor | k čemu |
|---|---|
| `index.html` | celá hra – tohle hostuje **GitHub Pages** |
| `server.js` | multiplayer server (Node.js, žádné balíčky) – tohle běží na **Renderu** nebo u tebe na PC |
| `package.json` | aby Render věděl, jak server spustit |
| `start.bat` / `start.sh` | spuštění serveru u tebe na počítači |

---

## 1. Stránka na GitHub Pages (hra pro hráče)

1. Na GitHubu vytvoř nový repozitář (např. `koulovacka`) a nahraj do něj všechny soubory z téhle složky.
2. V repozitáři: **Settings → Pages → Build and deployment → Source: Deploy from a branch**,
   branch **main**, složka **/ (root)** → **Save**.
3. Za minutu je hra na adrese `https://TVOJE-JMENO.github.io/koulovacka/`.

Hra pro jednoho hráče tam funguje hned. Pro multiplayer potřebuješ ještě server (krok 2).

## 2. Multiplayer server na Renderu (zdarma, stálá adresa)

GitHub Pages umí jen stránky, server tam běžet nemůže. Render ho umí spustit přímo z tohohle repozitáře:

1. Zaregistruj se na https://render.com (přihlášení přes GitHub).
2. **New → Web Service** → vyber repozitář `koulovacka`.
3. Nastav:
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Instance Type:** Free
4. **Deploy**. Render ti dá adresu typu `https://koulovacka.onrender.com`.
5. Tu adresu zapiš do `index.html` na řádek

   ```js
   const SERVER_URL='';
   ```

   takto: `const SERVER_URL='https://koulovacka.onrender.com';` a soubor znovu nahraj na GitHub.
   Hráči pak na `github.io` stránce dají jen **MULTIPLAYER → HRÁT HNED**, nic dalšího nezadávají.

**Free verze Renderu usíná** po 15 minutách bez hráčů. První hráč pak čeká asi minutu, než se server probudí –
hra to v lobby ukáže („Server se probouzí…“) a připojí se sama. Placená verze (Starter) neusíná.

Mimochodem: server na Renderu hru sám i zobrazuje, takže `https://koulovacka.onrender.com` funguje taky jako adresa hry.

## 3. Server u tebe na PC (místo Renderu)

1. Nainstaluj Node.js (LTS) z https://nodejs.org.
2. Spusť `start.bat` (Windows) nebo `./start.sh` (Mac/Linux). Okno nech otevřené.
3. Stejná WiFi: telefony otevřou adresu, kterou server vypíše (např. `http://192.168.1.25:3000`).
4. Přes internet: `cloudflared tunnel --url http://localhost:3000` → dostaneš `https://….trycloudflare.com`.
   Na GitHub Pages stránce ji hráči zadají do pole **Server**, nebo jim pošli odkaz:
   `https://TVOJE-JMENO.github.io/koulovacka/?server=https://….trycloudflare.com`
   (adresa tunelu se mění při každém spuštění).

## Ovládání

- **Mobil:** levý joystick = pohyb, pravý = míření; potáhni = nápřah, pusť = hod. Tlačítka R (nalepit koule) a » (úskok).
- **PC:** WASD pohyb, Shift sprint, mezerník úskok, myš míření, levé tlačítko drž = nápřah, pusť = hod, R koule, F celá obrazovka, J joysticky.

## Poznámky k multiplayeru

- Každé zařízení počítá svého Santu a posílá polohu 20× za vteřinu, server zprávy přeposílá a počítá body.
- Zásah vyhodnocuje zařízení toho, kdo byl trefen.
- Změna portu u lokálního serveru: `PORT=4000 node server.js`.
