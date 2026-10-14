import os
import zipfile

def make_sentclaude_zip(repo_dir: str, project_name: str):
    sentclaude_dir = os.path.join(repo_dir, "sentclaude")
    os.makedirs(sentclaude_dir, exist_ok=True)
    zip_path = os.path.join(sentclaude_dir, f"{project_name}_sentclaude.zip")
    if os.path.exists(zip_path):
        os.remove(zip_path)

    exclude_dirs = {"node_modules", ".git", "dist", "sentclaude", ".pnpm", "__pycache__"}

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(repo_dir):
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            for file in files:
                if file.endswith((".pyc", ".zip")):
                    continue
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, repo_dir)
                zipf.write(full_path, rel_path)

    size_kb = os.path.getsize(zip_path) / 1024
    print(f"[OK] Created clean backup: {zip_path} ({size_kb:.1f} KB)")

if __name__ == "__main__":
    import sys
    repo = os.path.abspath(".")
    proj = os.path.basename(repo)
    make_sentclaude_zip(repo, proj)
