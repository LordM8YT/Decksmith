# Linux Compatibility Notes

Decksmith is being shaped to run well across mainstream Linux desktop distributions, especially:

- Ubuntu and Ubuntu-based distros
- Fedora
- Arch and Arch-based distros
- openSUSE

## Practical Compatibility Goals

### 1. Session-based desktop access

The most portable default for desktop Linux is `TAG+="uaccess"` through `udev`, because it works with modern `systemd-logind` user sessions and avoids assuming a distro-specific group like `plugdev`.

Use:

- `linux/udev/60-decksmith-user.rules`

### 2. Headless or service deployments

Some users will want to run Decksmith as a background daemon or from a service account. Group names vary by distro, so the repo includes:

- `linux/udev/60-decksmith-headless.rules.example`

That example uses a dedicated `decksmith` group instead of `plugdev`, which is more portable across distros.

Suggested flow:

```bash
sudo groupadd --system decksmith
sudo usermod -aG decksmith "$USER"
sudo cp linux/udev/60-decksmith-headless.rules.example /etc/udev/rules.d/60-decksmith-headless.rules
sudo udevadm control --reload-rules
sudo udevadm trigger
```

Then unplug and reconnect the device.

### 3. Packaging strategy

For broad distro coverage, the likely packaging path after Step 1 is:

- AppImage for easy portable installs
- `.deb` for Debian/Ubuntu ecosystems
- `.rpm` for Fedora/openSUSE ecosystems

That gives the project a sane default story without forcing Flatpak or Snap on everyone.

The current alpha repo now includes an Electron Builder path for AppImage and RPM builds, plus Fedora-specific notes in `docs/fedora-alpha.md`.

As of June 17, 2026, the AppImage path has already been built successfully from WSL2 Ubuntu, while the RPM path is blocked only by the absence of `rpmbuild` on that local builder.

## Important Constraint

If the UI launches but no Stream Deck device appears, the problem is often not the Electron app itself. On Linux, missing or incorrect `udev` rules are one of the most common causes of hardware detection failures.
