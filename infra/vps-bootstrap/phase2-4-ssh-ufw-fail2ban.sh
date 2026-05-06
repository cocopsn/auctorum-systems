#!/bin/bash
# Phase 2-4: SSH hardening + UFW firewall + Fail2Ban
# Idempotent — safe to re-run.
set -euo pipefail

LOG=/root/phase2-4.log
echo "[phase2-4] start: $(date)" > "$LOG"

# ---------- PHASE 2: SSH HARDENING ----------
echo "[phase2] SSH hardening" >> "$LOG"
[ -f /etc/ssh/sshd_config.bak ] || cp /etc/ssh/sshd_config /etc/ssh/sshd_config.bak

cat > /etc/ssh/sshd_config.d/hardening.conf << 'SSHEOF'
Port 2222
PermitRootLogin prohibit-password
PasswordAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
PermitEmptyPasswords no
X11Forwarding no
ClientAliveInterval 300
ClientAliveCountMax 2
LoginGraceTime 30
AllowUsers auctorum root
SSHEOF

# ---------- PHASE 3: UFW ----------
# Order is critical: allow new SSH port BEFORE enabling UFW or restarting SSH
echo "[phase3] UFW" >> "$LOG"
ufw --force reset >> "$LOG" 2>&1
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH old (will close after verification)'
ufw allow 2222/tcp comment 'SSH new'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
echo y | ufw enable >> "$LOG" 2>&1
ufw status verbose >> "$LOG"

# Now restart SSH to pick up new port (still listens on 22 from default config)
sshd -t  # validate config
systemctl restart ssh

# ---------- PHASE 4: FAIL2BAN ----------
echo "[phase4] Fail2Ban" >> "$LOG"
cat > /etc/fail2ban/jail.d/custom.conf << 'F2BEOF'
[DEFAULT]
bantime = 3600
maxretry = 3
findtime = 600

[sshd]
enabled = true
port = 2222
maxretry = 3
bantime = 3600

[nginx-botsearch]
enabled = true
port = http,https
filter = nginx-botsearch
logpath = /var/log/nginx/access.log
maxretry = 3
bantime = 86400

[nginx-http-auth]
enabled = true
port = http,https
filter = nginx-http-auth
logpath = /var/log/nginx/error.log
maxretry = 3
bantime = 3600
F2BEOF

systemctl restart fail2ban
systemctl enable fail2ban >> "$LOG" 2>&1

echo "[phase2-4] DONE: $(date)" >> "$LOG"
echo "DONE" > /root/phase2-4.status
