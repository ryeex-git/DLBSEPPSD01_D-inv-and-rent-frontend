# Inventar- & Ausleihverwaltung – Frontend (Angular 18)

Single-Page-App für eine kleine Inventar- und Ausleihverwaltung.  
UI basiert auf **Angular 18** und **Angular Material**. Backend ist eine NestJS-API (siehe separates Backend-Repo).

## Features

- Inventarliste mit Suche, Filter (Kategorie, Status), Sortierung & Pagination
- Item-Detail mit:
  - Basisdaten (Name, Kategorie, Zustand, Tags)
  - **Verfügbarkeitstimeline** (Reservierungen/Ausleihen)
  - Historie (Ereignisse)
- **Reservierungen**-Übersicht (filterbar, stornieren, genehmigen)
- **Adminbereich**: Kategorien pflegen (und optional Standorte)
- **Admin-PIN**: Leichtgewichtige Rollenumschaltung (nur UI; echte Prüfung via Header im Backend)

## Tech-Stack

- Angular 18
- Angular Material
- RxJS
- HTTP Interceptors:
  - `AdminPinInterceptor` (setzt `x-admin-pin` Header, wenn Adminmodus aktiv)

## Voraussetzungen

- Node.js **≥ 20**
- npm **≥ 9**
- Laufendes Backend (Default: `http://localhost:3000`)

## Setup

```bash
# Pakete installieren
npm install

# API-URL einstellen
# Datei: src/environments/environments.ts
# export const environment = { production: false, apiUrl: 'http://localhost:3000' };
```

## Entwicklung starten

```bash
npm start
# oder
ng serve
```

> Falls SSR in deinem Setup aktiv war und Probleme machte: dieses Projekt ist als klassische SPA gedacht. Für Dev reicht `ng serve`/`npm start`.

## Adminmodus / PIN

- Adminmodus wird im Frontend per PIN aktiviert (Dialog/Prompt).
- Der PIN wird **nicht persistent gespeichert** (nur im RAM).
- Alle Admin-Requests senden den Header `x-admin-pin: <PIN>`.
- Das Backend validiert den PIN (siehe Backend-README).
