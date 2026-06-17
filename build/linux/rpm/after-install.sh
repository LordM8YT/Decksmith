#!/bin/sh
set -eu

RULE_TARGET="/usr/lib/udev/rules.d/60-opendeck-user.rules"
RULE_TARGET_ETC="/etc/udev/rules.d/60-opendeck-user.rules"
MARKER="# Managed by OpenDeck alpha RPM"

RULE_CONTENT=$(cat <<'EOF'
# Managed by OpenDeck alpha RPM
SUBSYSTEM=="input", GROUP="input", MODE="0660"

KERNEL=="hidraw*", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="0060", MODE:="660", TAG+="uaccess"
KERNEL=="hidraw*", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="0063", MODE:="660", TAG+="uaccess"
KERNEL=="hidraw*", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="006c", MODE:="660", TAG+="uaccess"
KERNEL=="hidraw*", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="006d", MODE:="660", TAG+="uaccess"
KERNEL=="hidraw*", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="0080", MODE:="660", TAG+="uaccess"
KERNEL=="hidraw*", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="0084", MODE:="660", TAG+="uaccess"
KERNEL=="hidraw*", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="0086", MODE:="660", TAG+="uaccess"
KERNEL=="hidraw*", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="008f", MODE:="660", TAG+="uaccess"
KERNEL=="hidraw*", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="0090", MODE:="660", TAG+="uaccess"
KERNEL=="hidraw*", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="009a", MODE:="660", TAG+="uaccess"
KERNEL=="hidraw*", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="00a5", MODE:="660", TAG+="uaccess"
KERNEL=="hidraw*", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="00aa", MODE:="660", TAG+="uaccess"
KERNEL=="hidraw*", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="00b3", MODE:="660", TAG+="uaccess"
KERNEL=="hidraw*", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="00b8", MODE:="660", TAG+="uaccess"
KERNEL=="hidraw*", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="00b9", MODE:="660", TAG+="uaccess"
KERNEL=="hidraw*", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="00ba", MODE:="660", TAG+="uaccess"
KERNEL=="hidraw*", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="00c6", MODE:="660", TAG+="uaccess"
KERNEL=="hidraw*", ATTRS{idVendor}=="1b1c", ATTRS{idProduct}=="2b18", MODE:="660", TAG+="uaccess"
EOF
)

install_rule() {
  target="$1"

  if [ -f "$target" ] && ! grep -q "$MARKER" "$target"; then
    echo "OpenDeck RPM: leaving existing custom udev rule untouched at $target"
    return
  fi

  printf '%s\n' "$RULE_CONTENT" > "$target"
  chmod 0644 "$target"
  echo "OpenDeck RPM: installed udev access rule at $target"
}

if [ -d "/usr/lib/udev/rules.d" ]; then
  install_rule "$RULE_TARGET"
elif [ -d "/etc/udev/rules.d" ]; then
  install_rule "$RULE_TARGET_ETC"
fi

if command -v udevadm >/dev/null 2>&1; then
  udevadm control --reload-rules || true
  udevadm trigger || true
fi

echo "OpenDeck RPM: reconnect the Stream Deck if the device does not appear immediately."
