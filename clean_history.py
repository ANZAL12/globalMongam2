import os
import subprocess

repo_dir = r"a:\GlobalAgencies"
env = os.environ.copy()
env["FILTER_BRANCH_SQUELCH_WARNING"] = "1"

print("Removing original refs if any...")
if os.path.exists(os.path.join(repo_dir, ".git", "refs", "original")):
    import shutil
    shutil.rmtree(os.path.join(repo_dir, ".git", "refs", "original"))

print("Running git filter-branch...")
result = subprocess.run(
    [
        "git", "filter-branch", "-f", "--prune-empty",
        "--index-filter", "git rm --cached --ignore-unmatch \"GOOGLE AUTH.txt\"",
        "--tag-name-filter", "cat", "--", "--all"
    ],
    env=env,
    cwd=repo_dir,
    capture_output=True,
    text=True
)

print(result.stdout)
print(result.stderr)
if result.returncode == 0:
    print("Success! History rewritten.")
else:
    print("Failed to rewrite history.")
