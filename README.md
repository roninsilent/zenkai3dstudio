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
| `.nojekyll` | Perquè GitHub Pages no toqui res |

Pugeu els cinc al mateix repositori, tots al mateix nivell.

## Publicar a GitHub Pages

1. Repositori nou a GitHub.
2. Puja-hi els cinc fitxers.
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
