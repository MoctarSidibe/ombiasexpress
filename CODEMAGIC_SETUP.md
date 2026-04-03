# Codemagic & CI/CD Alternatives — Pricing Reality Check

## Codemagic Pricing (2025)

| Plan | Price | Build Minutes | Free? |
|------|-------|---------------|-------|
| **Open Source** | Free | 500 min/month | ✅ Only if repo is **public** |
| Hobby | ~$15/month | 1500 min | ❌ Paid |
| Starter | ~$45/month | 3000 min | ❌ Paid |
| Team | ~$95/month | 8000 min | ❌ Paid |

> **⚠️ Bottom line:** If your repo `ombiasexpress` is **private**, Codemagic is NOT free.
> If you make it **public**, you get 500 free min/month (~20 builds).

---

## Truly Free CI/CD Options (No Credit Card)

### 1. GitHub Actions — ✅ Free (2000 min/month on public repos, 500 on private)

**Best option once billing is fixed.**

- Public repo: **2000 min/month free** (enough for ~80+ APK builds)
- Private repo: **500 min/month free**
- No credit card needed for public repos
- The workflow is already configured at `.github/workflows/android-build.yml`

**Blocker:** Your GitHub account has a billing lock.
**Fix:** Go to [github.com/settings/billing](https://github.com/settings/billing) → resolve payment method.

Once fixed, every `git push origin main` automatically builds the APK.

---

### 2. EAS Build (Expo) — ✅ Free Tier (30 builds/month)

- 30 free builds/month on the free tier (as of 2025)
- No credit card required
- Downside: queue wait on free tier (can be 15–60 min)
- Config: [`mobile/eas.json`](mobile/eas.json) — already set up

**Best for:** occasional builds when you don't need speed.

```bash
cd mobile
eas build --profile preview --platform android
```

---

### 3. Codemagic — ✅ Free ONLY if repo is public

If you're OK making the repo public:
- 500 min/month free
- Fast start (~2 min queue)
- Config: [`codemagic.yaml`](codemagic.yaml) — already set up

**Setup:**
1. Go to [codemagic.io](https://codemagic.io) → sign in with GitHub
2. Add repo → it detects `codemagic.yaml` automatically
3. Push to `main` → build triggers

---

### 4. Bitrise — ❌ Free tier discontinued (2024)

Was a popular alternative but they removed the free plan. Skip it.

---

### 5. CircleCI — Partial free

- 6000 free credits/month on free plan
- Heavy Android builds consume credits fast — typically 3–5 builds/month
- Requires Docker config setup (more complex than Codemagic/GitHub Actions)

---

## Recommended Strategy for Ombia Express

```
Situation                          →  Use this
─────────────────────────────────────────────────────
GitHub billing fixed + any repo    →  GitHub Actions (best value)
Repo is public                     →  Codemagic OR GitHub Actions
Repo is private + billing blocked  →  EAS Build (30 free/month)
Play Store release (.aab)          →  EAS Build production profile
```

---

## Immediate Next Steps

### If you keep the repo private:
1. **Fix GitHub billing** → unlocks 500 free Actions min/month
2. Use **EAS Build** in the meantime (30 builds/month free)

### If you make the repo public:
1. Set up **Codemagic** (500 min/month) — config already done
2. **GitHub Actions** also works once billing is resolved

### The `codemagic.yaml` is already ready:
Just sign up and connect — it will auto-build on every push to `main`.

---

## What Each Build Costs in Minutes

| Platform | Build time | Free min/month | Builds/month |
|----------|-----------|----------------|--------------|
| GitHub Actions (public) | ~15 min | 2000 | ~133 |
| GitHub Actions (private) | ~15 min | 500 | ~33 |
| Codemagic (public) | ~20 min | 500 | ~25 |
| EAS Build | ~20 min | N/A (30 builds) | 30 |
