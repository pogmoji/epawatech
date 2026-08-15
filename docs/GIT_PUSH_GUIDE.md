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

## 2. Check The Remote

```bash
git remote -v
```

For this repo, it should show:

```text
origin  https://github.com/pogmoji/epawatech (fetch)
origin  https://github.com/pogmoji/epawatech (push)
```

If there is no remote, add it like this:

```bash
git remote add origin https://github.com/pogmoji/epawatech
```

Important: `origin` is the remote name. Do not run only:

```bash
git remote add https://github.com/pogmoji/epawatech
```

That command is missing the remote name.

## 3. Push

If your branch is `master`, run:

```bash
git push -u origin master
```

After the first successful push, future pushes can usually be:

```bash
git push
```

## 4. If GitHub Asks For Login

For HTTPS:

- Username: your GitHub username
- Password: use a GitHub Personal Access Token, not your GitHub password

If you prefer SSH and already have SSH keys set up:

```bash
git remote set-url origin git@github.com:pogmoji/epawatech.git
git push -u origin master
```

## 5. Common Errors

### No configured push destination

Run:

```bash
git remote add origin https://github.com/pogmoji/epawatech
git push -u origin master
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
git remote set-url origin https://github.com/pogmoji/epawatech
```
