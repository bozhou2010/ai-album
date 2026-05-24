#!/bin/bash
set -e

echo "=== AI Album Installer ==="
echo "This script will install AI Album on Ubuntu 22.04"

if [ "$(id -u)" -ne 0 ]; then
    echo "Please run as root (sudo ./install.sh)"
    exit 1
fi

echo "[1/7] Installing Docker..."
if ! command -v docker &> /dev/null; then
    apt-get update
    apt-get install -y ca-certificates curl gnupg
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    systemctl enable docker
    systemctl start docker
    echo "Docker installed successfully"
else
    echo "Docker already installed, skipping..."
fi

echo "[2/7] Generating secure passwords..."
POSTGRES_PASSWORD=$(openssl rand -hex 16)
JWT_SECRET=$(openssl rand -hex 32)

echo "[3/7] Creating .env file..."
cat > .env << EOF
NODE_ENV=production
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
JWT_SECRET=${JWT_SECRET}
FRONTEND_URL=http://$(hostname -I | awk '{print $1}')
NGINX_PORT=80
NGINX_HTTPS_PORT=443
OCR_LANGUAGES=chi_sim+eng
CLIP_MODEL=XLM-Roberta-Large-Vit-B-16Plus
FACE_MODEL=buffalo_l
TRASH_RETENTION_DAYS=30
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@aialbum.com
EOF

echo "[4/7] Building Docker images..."
docker compose build

echo "[5/7] Starting services..."
docker compose up -d

echo "[6/7] Waiting for services to be healthy..."
sleep 15

echo "[7/7] Checking health..."
if curl -s http://localhost/api/server/ping | grep -q "pong"; then
    echo ""
    echo "=== AI Album installed successfully! ==="
    echo "Access your AI Album at: http://$(hostname -I | awk '{print $1}')"
    echo "First registered user will be the admin."
    echo ""
    echo "Important: Save your .env file securely. It contains your secrets."
else
    echo "Warning: Health check failed. Please check logs with: docker compose logs"
fi
