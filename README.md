# HobbyFlow

HobbyFlow is a local-first Windows desktop app for tracking hobbies, limiting effortless activities, and allocating effort across learning or skill-building queues.

It is built with Tauri, React, TypeScript, and Vite. The app runs as a normal desktop window and stores its main data as a local JSON file in the Windows app data directory.

## Features

- One-at-a-time queue for high-effort hobbies like physics, Japanese, or piano.
- Per-hobby target hours with automatic queue rotation when a block is complete.
- Timer sessions with notes, mental load, and energy ratings.
- Dashboard totals for today and the current week.
- Hobby management, queue reordering, history, dark/light mode, and JSON backup import/export.

## Development

Install dependencies:

```powershell
npm install
```

Run the desktop app in development:

```powershell
npm run tauri dev
```

Run frontend checks:

```powershell
npm run lint
npm run build
```

Build the Windows app and installers:

```powershell
npm run tauri build
```

Build outputs are generated under `src-tauri/target/release/bundle`.
