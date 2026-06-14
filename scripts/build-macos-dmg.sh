#!/usr/bin/env bash
#
# HobbyFlow — build a macOS .dmg from a clean Mac.
# Installs Xcode CLI tools, Homebrew, Node.js, and Rust if missing, then runs Tauri build.
#
# Usage (from repo root or anywhere):
#   ./scripts/build-macos-dmg.sh
#   ./scripts/build-macos-dmg.sh --skip-deps    # deps already installed
#   ./scripts/build-macos-dmg.sh --help
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

SKIP_DEPS=false
for arg in "$@"; do
  case "$arg" in
    --skip-deps) SKIP_DEPS=true ;;
    -h|--help)
      cat <<'EOF'
HobbyFlow macOS DMG build script

  ./scripts/build-macos-dmg.sh           Install missing tools, then build
  ./scripts/build-macos-dmg.sh --skip-deps   Build only (Node, Rust, brew already set up)

Output:
  src-tauri/target/release/bundle/dmg/HobbyFlow_<version>_<arch>.dmg

Troubleshooting:
  docs/macos-dmg-build.md
EOF
      exit 0
      ;;
    *)
      echo "Unknown option: $arg (try --help)" >&2
      exit 1
      ;;
  esac
done

log()  { printf '\n==> %s\n' "$*"; }
warn() { printf 'warning: %s\n' "$*" >&2; }
die()  { printf 'error: %s\n' "$*" >&2; exit 1; }

on_macos() {
  [[ "$(uname -s)" == "Darwin" ]]
}

ensure_path() {
  # Homebrew (Apple Silicon vs Intel) and rustup cargo bin
  if [[ -d /opt/homebrew/bin ]]; then
    export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:$PATH"
  fi
  if [[ -d /usr/local/bin ]]; then
    export PATH="/usr/local/bin:/usr/local/sbin:$PATH"
  fi
  if [[ -f "$HOME/.cargo/env" ]]; then
    # shellcheck source=/dev/null
    source "$HOME/.cargo/env"
  fi
}

require_macos() {
  if ! on_macos; then
    die "This script must run on macOS. DMG builds are not supported on other OSes."
  fi
}

install_xcode_cli() {
  if xcode-select -p &>/dev/null; then
    log "Xcode Command Line Tools already installed"
    return
  fi

  log "Xcode Command Line Tools are required (compilers, macOS SDK)."
  log "A system dialog will open — click Install and wait for it to finish."
  xcode-select --install || true

  die "Finish installing Xcode Command Line Tools, then run this script again."
}

install_homebrew() {
  if command -v brew &>/dev/null; then
    log "Homebrew already installed"
    return
  fi

  log "Installing Homebrew (package manager for Node.js)..."
  NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  ensure_path

  if ! command -v brew &>/dev/null; then
    die "Homebrew install finished but 'brew' is not on PATH. See docs/macos-dmg-build.md (Homebrew PATH)."
  fi
}

install_node() {
  ensure_path
  if command -v node &>/dev/null && command -v npm &>/dev/null; then
    log "Node.js already installed ($(node -v), npm $(npm -v))"
    return
  fi

  log "Installing Node.js via Homebrew..."
  brew install node
  ensure_path

  command -v node &>/dev/null || die "node not found after install"
  command -v npm &>/dev/null || die "npm not found after install"
  log "Node.js $(node -v), npm $(npm -v)"
}

install_rust() {
  ensure_path
  if command -v rustc &>/dev/null && command -v cargo &>/dev/null; then
    log "Rust already installed ($(rustc --version))"
    return
  fi

  log "Installing Rust via rustup..."
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable
  ensure_path

  command -v rustc &>/dev/null || die "rustc not found after rustup install"
  log "Rust $(rustc --version)"
}

install_dependencies() {
  install_xcode_cli
  install_homebrew
  install_node
  install_rust
}

die_if_missing() {
  command -v "$1" &>/dev/null || die "'$1' not found. Run without --skip-deps or see docs/macos-dmg-build.md"
}

verify_toolchain() {
  ensure_path
  die_if_missing xcode-select
  die_if_missing node
  die_if_missing npm
  die_if_missing rustc
  die_if_missing cargo

  if ! xcode-select -p &>/dev/null; then
    die "Xcode Command Line Tools not configured. Run: xcode-select --install"
  fi
}

build_app() {
  log "Installing npm dependencies..."
  npm install

  log "Building HobbyFlow (frontend + Rust + macOS bundle + DMG)..."
  log "First build may take several minutes while Rust crates compile."
  npm run tauri build
}

locate_dmg() {
  local bundle_dir="$ROOT/src-tauri/target/release/bundle/dmg"
  if [[ ! -d "$bundle_dir" ]]; then
    warn "DMG folder not found: $bundle_dir"
    warn "Check src-tauri/target/release/bundle/ for .app or other artifacts."
    return 1
  fi

  local dmg
  dmg="$(find "$bundle_dir" -maxdepth 1 -name '*.dmg' -print | head -n 1)"
  if [[ -z "$dmg" ]]; then
    warn "No .dmg file in $bundle_dir"
    return 1
  fi

  log "DMG built successfully:"
  echo "  $dmg"
  echo ""
  echo "Open with: open \"$dmg\""
  return 0
}

main() {
  require_macos
  ensure_path

  if [[ "$SKIP_DEPS" == true ]]; then
    log "Skipping dependency installation (--skip-deps)"
    verify_toolchain
  else
    install_dependencies
    verify_toolchain
  fi

  build_app
  locate_dmg || true

  log "Done."
}

main
