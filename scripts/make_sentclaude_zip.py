import os
import zipfile

# Hanya sertakan file kode, konfigurasi, dan dokumentasi esensial untuk Claude
ALLOWED_EXTS = {
    ".ts", ".tsx", ".js", ".jsx", ".json", ".toml", ".html", ".css",
    ".py", ".md", ".sh", ".sql", ".txt", ".env", ".env.local"
}

EXCLUDE_DIRS = {
    "node_modules", ".git", "dist", "sentclaude", ".pnpm", "__pycache__",
    "backups", "release", "coverage", ".vscode", ".idea"
}

# Batasi ukuran file individual maksimal 300 KB untuk menghindari dump teks/log raksasa
MAX_FILE_SIZE = 300 * 1024

def make_sentclaude_zip(repo_dir: str, project_name: str):
    sentclaude_dir = os.path.join(repo_dir, "sentclaude")
    os.makedirs(sentclaude_dir, exist_ok=True)
    zip_path = os.path.join(sentclaude_dir, f"{project_name}_sentclaude.zip")
    if os.path.exists(zip_path):
        os.remove(zip_path)

    file_count = 0
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(repo_dir):
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
            for file in files:
                ext = os.path.splitext(file)[1].lower()
                # Sertakan file tanpa ekstensi yang penting seperti CNAME, .env
                if ext not in ALLOWED_EXTS and not file.startswith(".env"):
                    continue

                full_path = os.path.join(root, file)
                try:
                    if os.path.getsize(full_path) > MAX_FILE_SIZE:
                        continue
                except OSError:
                    continue

                rel_path = os.path.relpath(full_path, repo_dir)
                zipf.write(full_path, rel_path)
                file_count += 1

    size_kb = os.path.getsize(zip_path) / 1024
    print(f"[OK] Created essential sentclaude zip: {zip_path} ({size_kb:.1f} KB, {file_count} files)")

if __name__ == "__main__":
    repo = os.path.abspath(".")
    proj = os.path.basename(repo)
    make_sentclaude_zip(repo, proj)
