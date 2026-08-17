#!/bin/bash

# Hentikan eksekusi script jika ada perintah yang gagal
set -e

PROJECT_NAME=$(basename "$PWD")
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
TARGET_DIR="../backups/$PROJECT_NAME"
BACKUP_FILE="$TARGET_DIR/${PROJECT_NAME}_$TIMESTAMP.tar.gz"

# 1. Konfirmasi Backup (Agar 5 slot backup tidak cepat habis)
echo "❓ Buat backup baru? (y/n)"
read -r answer
if [[ "$answer" =~ ^[Yy]$ ]]; then
    mkdir -p "$TARGET_DIR"
    echo "📦 Memulai Backup ke $BACKUP_FILE..."
    tar --exclude='node_modules' --exclude='.git' --exclude='dist' -czf "$BACKUP_FILE" .
    
    echo "🧹 Rotasi: Menyimpan 5 backup terbaru..."
    ls -t "$TARGET_DIR/${PROJECT_NAME}"_*.tar.gz 2>/dev/null | tail -n +6 | xargs -r rm 2>/dev/null || true
else
    echo "⏭️  Skip backup..."
fi

# 2. Build & Deploy
# ANTI-ERROR: Cek keberadaan file .env sebelum build
if [ -f .env ]; then
    echo "✅ File .env ditemukan. Memuat variabel..."
    set -a
    [ -f .env ] && . .env
    set +a
else
    echo "❌ ERROR: File .env tidak ditemukan! Build dibatalkan."
    exit 1
fi

echo "🔨 Memulai Build..."
npm run build

echo "🚀 Deploy ke Cloudflare..."
# Otomatis kirim input 'y' jika muncul dialog konfirmasi tanpa merusak CLI argument
echo "y" | npx wrangler deploy

# 3. Git Push (Otomatis tanpa input komen)
if [[ -n $(git status -s) ]]; then
    echo "📤 Push perubahan ke GitHub..."
    git add .
    
    commit_msg="update $TIMESTAMP: system auto-deploy & config sync"
    
    git commit -m "$commit_msg"
    git push origin main
else
    echo "✅ Kode sudah sinkron dengan GitHub."
fi

echo "✨ Selesai! Deploy dan sinkronisasi sukses."
