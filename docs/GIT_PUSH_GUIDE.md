# Git Push Guide

Use this when you want to push this project to GitHub.

## 1. Check Your Work

```bash
git status
```

If files are listed as changed, add and commit them first:

```bash
git add .
git commit -m "Your commit message"
```

## 2. Check Your Branch

```bash
git branch
```

The branch with `*` is your current branch.

For this project, use `main` as the branch to push to GitHub:

```bash
git switch main
```

If you need to create `main` from your current branch:

```bash
git branch -m main
```

## 3. Check The Remote

```bash
git remote -v
```

For this repo, it should show:

```text
origin  git@github.com:pogmoji/epawatech.git (fetch)
origin  git@github.com:pogmoji/epawatech.git (push)
```

If there is no remote, add it like this:

```bash
git remote add origin git@github.com:pogmoji/epawatech.git
```

Important: `origin` is the remote name. Do not run only:

```bash
git remote add git@github.com:pogmoji/epawatech.git
```

That command is missing the remote name.

If `origin` exists but points to the wrong URL, update it:

```bash
git remote set-url origin git@github.com:pogmoji/epawatech.git
```

## 4. Get The Latest GitHub Changes

Before pushing, fetch and pull the latest `main` branch:

```bash
git fetch origin
git pull origin main
```

If Git says `Already up to date.`, you can continue.

## 5. Push Main

Push `main` to GitHub:

```bash
git push -u origin main
```

After the first successful push, future pushes can usually be:

```bash
git push
```

## 6. Merge Master Into Main

Use this only if the project has both `master` and `main` branches and you want `main` to contain the work from `master`.

First, make sure you are on `main`:

```bash
git switch main
git pull origin main
```

Then merge `master` into `main`:

```bash
git merge master
```

If Git shows this error:

```text
fatal: refusing to merge unrelated histories
```

Run the merge again with:

```bash
git merge master --allow-unrelated-histories
```

If conflicts appear, open each conflicted file and remove the conflict markers:

```text
<<<<<<< HEAD
your current main version
=======
the master version
>>>>>>> master
```

Keep the correct code, then stage and commit the resolved files:

```bash
git add .
git commit
```

Finally, push the merged `main` branch:

```bash
git push origin main
```

## 7. Optional: Remove Old Master Branch

Only do this after confirming `main` has everything you need and GitHub is using `main` as the default branch.

Delete the remote `master` branch:

```bash
git push origin --delete master
```

Delete the local `master` branch:

```bash
git branch -d master
```

If Git says the local branch is not fully merged, check carefully before forcing anything.

## 8. If GitHub Asks For Login

For HTTPS:

- Username: your GitHub username
- Password: use a GitHub Personal Access Token, not your GitHub password

If you prefer SSH and already have SSH keys set up:

```bash
git remote set-url origin git@github.com:pogmoji/epawatech.git
git push -u origin main
```

## 9. Common Errors

### No configured push destination

Run:

```bash
git remote add origin git@github.com:pogmoji/epawatech.git
git push -u origin main
```

### Could not read Username for GitHub

Your terminal is not authenticated with GitHub. Use a Personal Access Token for HTTPS, or switch to SSH.

### Remote origin already exists

Check it:

```bash
git remote -v
```

If it is wrong, update it:

```bash
git remote set-url origin git@github.com:pogmoji/epawatech.git
```

### Refusing To Merge Unrelated Histories

This can happen when `main` and `master` were created separately.

```bash
git switch main
git merge master --allow-unrelated-histories
```

Resolve any conflicts, then:

```bash
git add .
git commit
git push origin main
```
