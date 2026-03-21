# Desktop App Evaluation — Tauri / Electron

This document evaluates packaging the MF Intelligence Dashboard as a standalone desktop executable.

---

## Current Architecture

```
Browser (React + Plotly)
    ↓ HTTP (localhost)
Express.js (port 3001)
    ↓ Synchronous API
better-sqlite3 (native C++ addon)
    ↓
SQLite database file (mf-data.db)
    ↓ HTTP (external)
Anthropic API (for AI features)
```

**Key constraint:** The backend uses `better-sqlite3`, a native Node.js C++ addon. This is the primary factor that determines which desktop framework is feasible.

---

## Option 1: Electron (Easiest Path)

**Effort: 1-2 weeks | Binary: 150-300MB**

Electron bundles Chromium + Node.js, so the entire existing codebase works unchanged.

### What Changes

```diff
+ package.json: add electron, electron-builder
+ main.js: Electron main process (create BrowserWindow, start Express)
+ preload.js: bridge for IPC (optional)
~ server/index.js: minor tweak to find db path relative to app resources
~ vite.config.js: adjust build output for Electron
```

### Steps

1. `npm install electron electron-builder --save-dev`
2. Create `electron/main.js`:
   - Start Express server on a random port
   - Create BrowserWindow pointing to `http://localhost:{port}`
   - Handle app lifecycle (quit on window close)
3. Move `server/db/mf-data.db` to Electron's `userData` directory on first run
4. Store API keys via Electron's `safeStorage` API or a settings UI
5. Build: `electron-builder --win --mac --linux`

### Pros
- Zero backend code changes — Express + better-sqlite3 work as-is
- Fastest path to a working exe
- Mature ecosystem (auto-updater, code signing, installers)
- Full Node.js API available (file system, child processes)

### Cons
- Large binary (Chromium alone is ~120MB)
- Higher memory usage (~150-200MB idle)
- Slower startup (3-5 seconds)
- Frequent Chromium security updates needed

### Recommended For
- Quick proof of concept
- Internal distribution (binary size doesn't matter)
- Teams with only JavaScript expertise

---

## Option 2: Tauri + Rust Backend (Best Long-Term)

**Effort: 4-6 weeks | Binary: 20-50MB**

Tauri uses the OS native webview (WebView2 on Windows, WebKit on Mac/Linux) and a Rust backend. The Express server and better-sqlite3 must be rewritten in Rust.

### What Changes

```
NEW  src-tauri/
     ├── Cargo.toml          # Rust dependencies
     ├── src/
     │   ├── main.rs          # Tauri entry point
     │   ├── db.rs            # SQLite via rusqlite
     │   ├── commands/        # One file per route group
     │   │   ├── schemes.rs
     │   │   ├── nav.rs
     │   │   ├── analytics.rs  # Port analyticsEngine.js to Rust
     │   │   ├── agent.rs      # Anthropic API call via reqwest
     │   │   └── admin.rs
     │   └── models.rs         # Structs for DB rows
     └── tauri.conf.json

MODIFIED  client/src/lib/api.js  →  Replace axios calls with Tauri invoke()
```

### Architecture

```
Tauri WebView (React + Plotly)
    ↓ IPC (tauri::invoke)
Rust Backend
    ↓ rusqlite
SQLite database
    ↓ reqwest
Anthropic API
```

### Key Rust Crates

| Crate | Replaces | Purpose |
|-------|----------|---------|
| `rusqlite` | better-sqlite3 | SQLite bindings |
| `reqwest` | fetch/axios | HTTP client for Anthropic API |
| `serde` / `serde_json` | — | JSON serialization |
| `tokio` | — | Async runtime (for API calls) |

### Migration Effort Breakdown

| Component | Effort | Complexity |
|-----------|--------|-----------|
| Tauri project setup | 2-3 days | Low |
| SQLite layer (rusqlite) | 3-4 days | Low — direct SQL, no ORM |
| Schemes/NAV/Holdings routes | 3-4 days | Low — simple CRUD |
| Analytics engine (CAGR, Sharpe, etc.) | 5-7 days | Medium — math in Rust |
| AI agent (streaming SSE) | 3-4 days | Medium — async streaming |
| Admin pipeline | 2-3 days | Medium — HTTP + progress |
| Frontend API layer migration | 2-3 days | Low — replace axios with invoke |
| Testing + platform builds | 3-5 days | Medium |

### Pros
- Tiny binary (10-50MB)
- Fast startup (<1 second)
- Low memory footprint (~30-50MB idle)
- Native SQLite performance (rusqlite is faster than better-sqlite3)
- Better security (Rust memory safety, no Node.js attack surface)

### Cons
- Full backend rewrite required (Rust, not JavaScript)
- Rust learning curve for JS teams
- Analytics engine math must be ported
- SSE streaming more complex in Tauri (use events system)
- Longer development time

### Recommended For
- Production distribution to end users
- Performance-critical deployments
- Teams with Rust expertise (or willingness to learn)

---

## Option 3: Tauri + Node.js Sidecar (Balanced)

**Effort: 2-4 weeks | Binary: 80-120MB**

Keep the Express backend as-is, but run it as a child process ("sidecar") inside a Tauri app.

### How It Works

1. Tauri app starts
2. Rust backend spawns `node server/index.js` as a child process
3. React frontend loads in Tauri webview
4. Frontend talks to Express via `http://localhost:3001` (same as dev mode)
5. On app quit, Tauri kills the Node process

### What Changes

```diff
+ src-tauri/src/main.rs: spawn Node sidecar, manage lifecycle
+ src-tauri/tauri.conf.json: configure sidecar
~ package.json: bundle Node.js runtime
~ server/index.js: resolve db path relative to app resources
```

### Bundling Node.js

You must ship a Node.js binary with the app:
- Download platform-specific Node.js binaries during build
- Place in `src-tauri/binaries/` as a Tauri sidecar
- Or use `pkg` to compile the Express server into a single executable

### Pros
- Minimal backend code changes
- Keeps familiar JavaScript/Node.js stack
- Smaller than Electron (no Chromium, but still ships Node)
- Tauri's native webview is lighter

### Cons
- Must bundle Node.js binary (~50-70MB)
- Process management complexity (start, monitor, kill Node)
- Two processes running (Tauri + Node)
- Platform-specific Node binaries needed
- Debugging is harder (separate process logs)

### Recommended For
- Teams that want Tauri benefits without learning Rust
- When backend changes are not acceptable
- Medium-term solution before full Rust migration

---

## Comparison Summary

| | Electron | Tauri + Rust | Tauri + Sidecar |
|---|---|---|---|
| **Effort** | 1-2 weeks | 4-6 weeks | 2-4 weeks |
| **Binary size** | 150-300MB | 20-50MB | 80-120MB |
| **Startup time** | 3-5s | <1s | 2-3s |
| **Memory (idle)** | 150-200MB | 30-50MB | 80-120MB |
| **Backend changes** | None | Full rewrite | Minimal |
| **Language** | JavaScript | Rust + JavaScript | JavaScript |
| **Auto-updater** | Built-in | Built-in | Built-in |
| **Code signing** | Yes | Yes | Yes |
| **Windows exe** | Yes | Yes | Yes |
| **macOS app** | Yes | Yes | Yes |
| **Linux AppImage** | Yes | Yes | Yes |

---

## Recommendation

### For immediate needs: Start with Electron

If you want a desktop exe quickly with zero backend changes, Electron is the pragmatic choice. You can have a working prototype in days.

### For production distribution: Migrate to Tauri + Rust

If you plan to distribute to end users and care about binary size, performance, and security, invest in the Tauri + Rust path. The Express backend is straightforward (SQL queries + HTTP calls), making the Rust port manageable.

### Suggested roadmap

```
Phase 1 (Week 1-2):    Electron prototype — validate desktop UX
Phase 2 (Week 3-4):    User testing and feedback
Phase 3 (Week 5-10):   Tauri + Rust migration (if distribution size matters)
Phase 4 (Week 11-12):  Platform testing, signing, auto-updater
```

---

## API Key Storage in Desktop Apps

In a desktop app, environment variables are less practical. Better options:

| Approach | Security | UX |
|----------|----------|----|
| Settings page in the app | Good — stored in OS keychain | Best — user configures once in UI |
| `.env` file in app data dir | Fair — plaintext on disk | OK — user edits a file |
| OS keychain (Electron `safeStorage` / Tauri `keyring`) | Best — encrypted by OS | Best — transparent to user |
| First-run setup wizard | Good | Good — guided experience |

Recommended: Add a Settings page where users paste their API keys, stored via the OS keychain API.
