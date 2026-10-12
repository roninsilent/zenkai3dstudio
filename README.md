# Zenkai3D Studio — eines web

Tres aplicacions d'una sola pàgina, amb un menú d'entrada. No necessiten
servidor: funcionen al navegador i desen les dades al Google Drive del
compte amb què inicies sessió.

## Fitxers

| Fitxer | Què és |
|---|---|
| `index.html` | El menú, amb els tres botons |
| `inventari.html` | Inventari de filament |
| `pressupost.html` | Pressupost d'impressió 3D |
| `collabs.html` | Col·laboracions amb marques |
| `instagram.html` | Instagram dia a dia: reels, abast i seguidors (només llegeix) |
| `factures.html` | Factures de casa: llum, aigua i telèfon (només llegeix) |
| `.nojekyll` | Perquè GitHub Pages no toqui res |

Pugeu-los tots al mateix repositori, al mateix nivell.

## Publicar a GitHub Pages

1. Repositori nou a GitHub.
2. Puja-hi tots els fitxers.
3. **Settings → Pages** → *Deploy from a branch* → `main` / `(root)` → Desa.
4. Al cap d'un minut: `https://elteuusuari.github.io/elrepositori/`

Des de l'iPhone: obre'l amb **Safari** → compartir → **Afegeix a l'inici**.
Afegeix el menú (`index.html`) i tens les tres a un toc.

## Accés i Drive

Cal el Client ID de Google (Google Cloud → Auth Platform → Clients →
Aplicació web; a "Orígens autoritzats de JavaScript" hi va només el domini,
`https://elteuusuari.github.io`, sense la part del repositori).

S'introdueix **un sol cop** i val per a les tres apps, perquè comparteixen
domini. Només `zenkai3dstudio@gmail.com` hi pot entrar; qualsevol altre
compte queda fora.

Cada app desa dos fitxers al Drive:

- `zenkai3d-inventari.json` / `.csv`
- `zenkai3d-pressupostos.json` / `.csv`
- `zenkai3d-collaboracions.json` / `.csv`

El `.json` és el que llegeixen les apps — no el toquis a mà. El `.csv` és
per a tu: s'obre amb Google Sheets o Excel. **És de sortida només**: si
l'edites, el canvi es perd al següent desat des de l'app.

Si no vols fer el pas de Google, cada app té un enllaç per fer-la servir
només en aquell dispositiu.

## Llegir fotos i captures

Tot passa dins del navegador, amb Tesseract.js (codi obert):

- **Inventari**: la foto de la bobina → intenta llegir marca, material i
  pes nominal de l'etiqueta. El color es mesura tocant el filament a la
  foto. El percentatge que queda es calcula amb 3 tocs (nucli, vora del
  filament, vora de la brida).
- **Col·laboracions**: captures del DM d'Instagram → el text llegit va a
  les notes de la fitxa, i intenta deduir el tipus i la compensació.

Amb text net funciona bé; amb lletra estilitzada, fosca o fotos de biaix
pot fallar. Sempre és revisable i editable a mà.

## Instagram

`instagram.html` no hi escriu res: només llegeix `zenkai3d-instagram.json` del
Drive de zenkai3dstudio@gmail.com. Cada matí una tasca programada de Claude
treu les dades d'Instagram (via Composio) i actualitza aquest fitxer. Si l'app
no el troba la primera vegada, el crea buit i l'actualització de l'endemà
l'omple.

## Factures de casa

`factures.html` tampoc no hi escriu res: llegeix `zenkai3d-factures.json` del
mateix Drive. Les dades no són al repositori (que és públic): l'adreça, els
imports i els enllaços als PDF només viuen en aquest fitxer.

Com que l'app només té permís `drive.file`, només veu el fitxer si l'ha creat
ella. El primer cop que l'obres en crea un de buit; qui actualitzi les factures
ha d'escriure a **totes** les còpies que es diguin `zenkai3d-factures.json`.
