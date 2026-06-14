# macOS DMG build — from scratch

Build a distributable **HobbyFlow** `.dmg` on a Mac with no dev tools pre-installed.

**Quick path:** clone the repo, then run:

```bash
chmod +x scripts/build-macos-dmg.sh
./scripts/build-macos-dmg.sh
```

Expected output:

```text
src-tauri/target/release/bundle/dmg/HobbyFlow_0.2.0_<arch>.dmg
```

`<arch>` is `aarch64` on Apple Silicon (M1/M2/M3/M4) or `x64` on Intel Macs.

---

## What the script installs

| Tool | Why |
|------|-----|
| **Xcode Command Line Tools** | C/C++ compiler, `clang`, macOS SDK — required by Rust and native deps |
| **Homebrew** | Installs Node.js without manual downloads |
| **Node.js + npm** | Frontend build (`vite`, `typescript`) and Tauri CLI |
| **Rust (rustup)** | Compiles the Tauri native shell |

Nothing else is required for a local unsigned DMG. Code signing and notarization are optional for distribution outside your machine (see below).

---

## Manual step-by-step (same as the script)

### 1. Get the source

```bash
git clone https://github.com/ryu-yatish/hobbyIt.git
cd hobbyIt
```

### 2. Xcode Command Line Tools

```bash
xcode-select --install
```

Wait for the GUI installer to finish. Verify:

```bash
xcode-select -p
# e.g. /Library/Developer/CommandLineTools
```

If prompted for a license after install:

```bash
sudo xcodebuild -license accept
```

### 3. Homebrew

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

After install, Homebrew prints commands to add `brew` to your PATH. On Apple Silicon that is usually:

```bash
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
```

On Intel Macs, `/usr/local/bin` is typically already on PATH.

### 4. Node.js

```bash
brew install node
node -v   # should be v18+ (v20+ recommended)
npm -v
```

### 5. Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source "$HOME/.cargo/env"
rustc --version
```

### 6. Build

```bash
npm install
npm run tauri build
```

### 7. Find the DMG

```bash
ls src-tauri/target/release/bundle/dmg/
open src-tauri/target/release/bundle/dmg/
```

The `.app` bundle (without DMG wrapper) lives at:

```text
src-tauri/target/release/bundle/macos/HobbyFlow.app
```

---

## Rebuilds (deps already installed)

```bash
./scripts/build-macos-dmg.sh --skip-deps
```

Or directly:

```bash
npm run tauri build
```

---

## Troubleshooting

### `This script must run on macOS`

DMG packaging only runs on macOS. You cannot produce a macOS DMG from Windows or Linux. Use a Mac, a macOS VM, or CI with a `macos` runner.

### Xcode Command Line Tools dialog never appears

```bash
sudo rm -rf /Library/Developer/CommandLineTools
xcode-select --install
```

If it still fails, install full **Xcode** from the App Store, then:

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
```

### `brew: command not found` after Homebrew install

Homebrew is not on your PATH. Run the `shellenv` line from the installer output, or:

```bash
# Apple Silicon
eval "$(/opt/homebrew/bin/brew shellenv)"

# Intel
eval "$(/usr/local/bin/brew shellenv)"
```

Open a **new terminal** and run `brew --version`.

### `node` / `npm` / `rustc` not found in the same terminal

Tools were installed in a previous shell without updating PATH. Either:

```bash
source ~/.zprofile   # or ~/.zshrc
source "$HOME/.cargo/env"
```

or use the build script (it adjusts PATH for brew and cargo).

### `npm install` permission errors (`EACCES`)

Do **not** use `sudo npm install`. Fix npm’s global prefix:

```bash
mkdir -p ~/.npm-global
npm config set prefix ~/.npm-global
echo 'export PATH="$HOME/.npm-global/bin:$PATH"' >> ~/.zprofile
source ~/.zprofile
```

Then delete `node_modules` and run `npm install` again.

### Rust build fails: `linker` / `clang` / SDK errors

Usually missing or broken Xcode CLI tools:

```bash
xcode-select -p
xcode-select --install
```

Then clean and rebuild:

```bash
rm -rf src-tauri/target
npm run tauri build
```

### `error: failed to run custom build command` (Tauri / `tauri-build`)

1. Ensure you are in the **repo root** (where `package.json` lives).
2. Reinstall deps: `rm -rf node_modules && npm install`
3. Full clean: `rm -rf src-tauri/target dist && npm run tauri build`

### Build succeeds but no `.dmg` file

1. Check bundle config in `src-tauri/tauri.conf.json` — `bundle.active` should be `true` and targets should include `dmg` (default `all` includes DMG).
2. Inspect the bundle folder:

   ```bash
   ls -la src-tauri/target/release/bundle/
   ```

3. Build only the DMG target:

   ```bash
   npm run tauri build -- --bundles dmg
   ```

4. If you only see `HobbyFlow.app` under `bundle/macos/`, the app built but DMG step failed — scroll the build log for errors mentioning `dmg` or `bundle_dmg`.

### First build takes a very long time

Normal. Rust compiles hundreds of crates on the first run. Later builds are much faster. Ensure ~5–10 GB free disk space for `src-tauri/target`.

### `App is damaged` or Gatekeeper blocks the app

The default build is **unsigned**. macOS may block it when copied from the DMG.

**For local testing:**

```bash
xattr -cr /path/to/HobbyFlow.app
```

Or: **System Settings → Privacy & Security → Open Anyway** after the first launch attempt.

**For distribution:** you need an Apple Developer account, code signing certificate, and notarization. That is not covered by the from-scratch script; see [Tauri macOS distribution](https://v2.tauri.app/distribute/macos-application-bundle/).

### Wrong architecture (app won’t run on this Mac)

The DMG is built for the Mac you compile on. An `aarch64` build runs on Apple Silicon; an `x64` build runs on Intel (or x64 Macs via Rosetta on Apple Silicon in some cases). To cross-compile architectures, see Tauri’s macOS target docs — cross-compiling macOS bundles from another arch is limited.

### `npm run tauri build` vs `npx tauri build`

Both work if `@tauri-apps/cli` is in `devDependencies`. Prefer:

```bash
npm run tauri build
```

### Network / corporate proxy during install

- Homebrew: [Homebrew behind proxy](https://docs.brew.sh/FAQ#how-do-i-update-homebrew)
- rustup: set `export RUSTUP_DIST_SERVER=...` if using a mirror
- npm: `npm config set registry <url>` if required

### Still stuck

1. Run with verbose logging:

   ```bash
   npm run tauri build -- --verbose
   ```

2. Capture versions:

   ```bash
   sw_vers
   xcode-select -p
   node -v && npm -v
   rustc --version && cargo --version
   ```

3. Open an issue on [GitHub](https://github.com/ryu-yatish/hobbyIt/issues) with that output and the full error block.

---

## CI reference (GitHub Actions)

For automated DMG builds without a local Mac, use a `macos-latest` runner and the same `npm ci && npm run tauri build` steps. Signing requires exporting certificates as secrets — not needed for internal/test builds.

---

## Related files

- Build script: `scripts/build-macos-dmg.sh`
- Tauri config: `src-tauri/tauri.conf.json`
- Windows build: `npm run tauri build` on Windows → `src-tauri/target/release/bundle/nsis/`
