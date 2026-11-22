# RMS Titanic – begehbarer 3D-Rundgang

Die komplette RMS Titanic als begehbares 3D-Modell im Webbrowser: alle zehn Decks vom Bootsdeck bis zu den
Kesselräumen, rund 1 100 Räume, Tag und Nacht des 14. April 1912. Alles ist prozedural erzeugt (Three.js),
ohne externe Modelle oder Texturen.

**Live:** https://trapanotto.github.io/titanic/

## Steuerung

| Taste | Funktion |
|---|---|
| W A S D / Pfeiltasten | bewegen |
| Maus | umsehen |
| Shift | rennen |
| Leertaste | springen |
| F | Flugmodus |
| N | Tag / Nacht |
| M | Deckplan mit Schnellreise |
| J / K / + − | Minikarte ein/aus, Ausrichtung, Zoom |
| E | Info-Tafel lesen |
| G | Grafikqualität (niedrig / mittel / hoch) |
| H | Hilfe |

## Lokal starten

```
npm install
npm run dev
```

Danach http://localhost:5173 öffnen. `npm run build` erzeugt die statische Seite in `dist/`.

## Hinweise

- Benötigt einen aktuellen Desktop-Browser mit WebGL 2 und eine dedizierte Grafikkarte; das Laden dauert
  je nach Rechner 20–40 Sekunden und braucht viel Arbeitsspeicher.
- Grundrisse, Kabinennummern und Rumpfform sind vereinfacht und nicht zentimetergenau historisch.
- Aufbau des Codes: `docs/CONTRACT.md` (Modulvertrag) und `docs/KIT.md` (Innenraum-Baukasten).
