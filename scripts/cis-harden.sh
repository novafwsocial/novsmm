#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# NOVSMM — CIS Benchmarks Hardening Script
# ─────────────────────────────────────────────────────────────────────────────
# Applies CIS Benchmark controls for:
#   - PostgreSQL 16
#   - Node.js production
#   - Linux system (kernel sysctl, ulimits)
#
# Usage: sudo bash scripts/cis-harden.sh
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  NOVSMM CIS Benchmarks Hardening Script                     ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# ── 1. PostgreSQL Hardening ──
echo "📋 [1/3] PostgreSQL Hardening..."

PG_CONF="/etc/postgresql/16/main/postgresql.conf"
PG_HBA="/etc/postgresql/16/main/pg_hba.conf"

if [ -f "$PG_CONF" ]; then
  # CIS PostgreSQL 6.1: Enable SSL
  sudo sed -i "s/^#ssl = off/ssl = on/" "$PG_CONF" || true
  sudo sed -i "s/^#ssl_cert_file/ssl_cert_file/" "$PG_CONF" || true

  # CIS PostgreSQL 6.2: Set password encryption to scram-sha-256
  sudo sed -i "s/^#password_encryption.*/password_encryption = scram-sha-256/" "$PG_CONF" || true

  # CIS PostgreSQL 6.3: Log connections
  sudo sed -i "s/^#log_connections.*/log_connections = on/" "$PG_CONF" || true

  # CIS PostgreSQL 6.4: Log disconnections
  sudo sed -i "s/^#log_disconnections.*/log_disconnections = on/" "$PG_CONF" || true

  # CIS PostgreSQL 6.5: Log duration for slow queries
  sudo sed -i "s/^#log_min_duration_statement.*/log_min_duration_statement = 1000/" "$PG_CONF" || true

  # CIS PostgreSQL 6.6: Set log_line_prefix for better forensics
  sudo sed -i "s|^#log_line_prefix.*|log_line_prefix = '%m [%p] %u@%d %h '|" "$PG_CONF" || true

  # CIS PostgreSQL 6.7: Limit connections
  sudo sed -i "s/^#max_connections.*/max_connections = 100/" "$PG_CONF" || true

  # CIS PostgreSQL 6.8: Enable row security
  sudo sed -i "s/^#row_security.*/row_security = on/" "$PG_CONF" || true

  echo "  ✅ PostgreSQL config hardened"
else
  echo "  ⚠️  PostgreSQL config not found at $PG_CONF — skipping"
fi

# CIS PostgreSQL 6.9: pg_hba.conf — require scram-sha-256 + reject trust
if [ -f "$PG_HBA" ]; then
  # Backup
  sudo cp "$PG_HBA" "${PG_HBA}.bak.$(date +%s)"

  # Replace 'trust' with 'scram-sha-256' and 'md5' with 'scram-sha-256'
  sudo sed -i 's/\btrust\b/scram-sha-256/g' "$PG_HBA"
  sudo sed -i 's/\bmd5\b/scram-sha-256/g' "$PG_HBA"

  echo "  ✅ pg_hba.conf hardened (trust/md5 → scram-sha-256)"
fi

echo ""

# ── 2. Node.js Production Hardening ──
echo "📋 [2/3] Node.js Production Hardening..."

# CIS Node.js: Set production env vars in PM2 ecosystem
if command -v pm2 &> /dev/null; then
  # Set PM2 to auto-restart on high memory
  pm2 set novsmm:max_memory_restart 1G 2>/dev/null || true

  # Enable PM2 log rotation (10MB, 30 files)
  pm2 install pm2-logrotate 2>/dev/null || true
  pm2 set pm2-logrotate:max_size 10M 2>/dev/null || true
  pm2 set pm2-logrotate:retain 30 2>/dev/null || true
  pm2 set pm2-logrotate:compress true 2>/dev/null || true

  echo "  ✅ PM2 hardening applied (memory restart, log rotation)"
else
  echo "  ⚠️  PM2 not installed — skipping"
fi

echo ""

# ── 3. Linux System Hardening (sysctl) ──
echo "📋 [3/3] Linux System Hardening..."

SYSCTL_CONF="/etc/sysctl.d/99-novsmm-hardening.conf"

sudo tee "$SYSCTL_CONF" > /dev/null << 'EOF'
# ── NOVSMM CIS Linux Hardening ──

# CIS 1.1: Disable IP forwarding (not a router)
net.ipv4.ip_forward = 0
net.ipv6.conf.all.forwarding = 0

# CIS 1.2: Disable send redirects
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0

# CIS 1.3: Disable ICMP redirects (prevent MITM)
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv6.conf.all.accept_redirects = 0
net.ipv6.conf.default.accept_redirects = 0

# CIS 1.4: Disable source routing
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0
net.ipv6.conf.all.accept_source_route = 0
net.ipv6.conf.default.accept_source_route = 0

# CIS 1.5: Log martian packets (spoofed source IPs)
net.ipv4.conf.all.log_martians = 1
net.ipv4.conf.default.log_martians = 1

# CIS 1.6: Enable reverse path filtering
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1

# CIS 1.7: Enable TCP SYN cookies (SYN flood protection)
net.ipv4.tcp_syncookies = 1

# CIS 1.8: Disable ICMP broadcast echo (smurf attack prevention)
net.ipv4.icmp_echo_ignore_broadcasts = 1

# CIS 1.9: Increase file descriptor limits
fs.file-max = 65535

# CIS 1.10: Enable ASLR (address space layout randomization)
kernel.randomize_va_space = 2

# CIS 1.11: Restrict kernel pointer access
kernel.kptr_restrict = 2

# CIS 1.12: Restrict dmesg access
kernel.dmesg_restrict = 1

# CIS 1.13: Restrict kernel profiling
kernel.perf_event_paranoid = 3

# CIS 1.14: Disable core dumps (don't leak memory to disk)
fs.suid_dumpable = 0

# CIS 1.15: Protect hardlinks/symlinks
fs.protected_hardlinks = 1
fs.protected_symlinks = 1
fs.protected_fifos = 2
fs.protected_regular = 2

# CIS 1.16: Limit pending connections
net.ipv4.tcp_max_syn_backlog = 4096

# CIS 1.17: Reduce TCP keepalive time (faster dead connection cleanup)
net.ipv4.tcp_keepalive_time = 300
net.ipv4.tcp_keepalive_probes = 5
net.ipv4.tcp_keepalive_intvl = 30

# CIS 1.18: Increase TCP max orphan count
net.ipv4.tcp_max_orphans = 8192
EOF

# Apply sysctl changes
sudo sysctl --system > /dev/null 2>&1
echo "  ✅ Kernel sysctl hardening applied ($SYSCTL_CONF)"

# CIS 2: Set ulimits for the novsmm user
LIMITS_CONF="/etc/security/limits.d/99-novsmm.conf"
sudo tee "$LIMITS_CONF" > /dev/null << 'EOF'
# NOVSMM — Process limits for the novsmm user
novsmm  soft  nofile  65535
novsmm  hard  nofile  65535
novsmm  soft  nproc   4096
novsmm  hard  nproc   4096
novsmm  soft  memlock unlimited
novsmm  hard  memlock unlimited
EOF
echo "  ✅ Ulimit hardening applied ($LIMITS_CONF)"

# CIS 3: Disable unnecessary services (if running)
echo ""
echo "📋 Checking for unnecessary services..."
for svc in telnet rsh-server rlogin-server tftp-server xinetd; do
  if systemctl is-active --quiet "$svc" 2>/dev/null; then
    sudo systemctl disable --now "$svc"
    echo "  ✅ Disabled: $svc"
  fi
done

# CIS 4: Ensure SSH hardening (if SSH is installed)
SSH_CONF="/etc/ssh/sshd_config"
if [ -f "$SSH_CONF" ]; then
  # CIS 5.1: Disable root SSH login
  sudo sed -i 's/^#PermitRootLogin.*/PermitRootLogin no/' "$SSH_CONF" || true
  # CIS 5.2: Disable password auth (key-only)
  sudo sed -i 's/^#PasswordAuthentication.*/PasswordAuthentication no/' "$SSH_CONF" || true
  # CIS 5.3: Set SSH timeout
  sudo sed -i 's/^#ClientAliveInterval.*/ClientAliveInterval 300/' "$SSH_CONF" || true
  sudo sed -i 's/^#ClientAliveCountMax.*/ClientAliveCountMax 2/' "$SSH_CONF" || true
  # CIS 5.4: Max auth tries
  sudo sed -i 's/^#MaxAuthTries.*/MaxAuthTries 3/' "$SSH_CONF" || true
  # CIS 5.5: Disable X11 forwarding
  sudo sed -i 's/^#X11Forwarding.*/X11Forwarding no/' "$SSH_CONF" || true

  # Restart SSH if config changed
  sudo systemctl reload ssh 2>/dev/null || sudo systemctl reload sshd 2>/dev/null || true
  echo "  ✅ SSH hardened (no root login, key-only, 5min timeout)"
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  ✅ CIS Hardening Complete!                                  ║"
echo "║                                                              ║"
echo "║  Applied:                                                    ║"
echo "║   • PostgreSQL: scram-sha-256, logging, SSL                  ║"
echo "║   • Node.js/PM2: memory limits, log rotation                 ║"
echo "║   • Linux kernel: 18 sysctl hardening controls               ║"
echo "║   • Ulimits: 65k file descriptors for novsmm user            ║"
echo "║   • SSH: no root login, key-only, 5min timeout               ║"
echo "║                                                              ║"
echo "║  Next steps:                                                 ║"
echo "║   1. Restart PostgreSQL: sudo systemctl restart postgresql   ║"
echo "║   2. Restart PM2: pm2 restart novsmm                         ║"
echo "║   3. Verify: sysctl -a | grep novsmm                         ║"
echo "╚══════════════════════════════════════════════════════════════╝"
