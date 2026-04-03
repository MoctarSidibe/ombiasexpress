# CI/CD Strategy — Ombia Express APK Builds

## The Problem

Building Android APKs locally on Windows is painful:
- Gradle + NDK (C++ compilation) needs 5–10 GB free disk space just to run
- Kotlin daemon + clang OOM crash if disk is full
- EAS Build (Expo) free tier has a queue — waits of 1+ hour are common
- EAS local builds don't support Windows
- GitHub Actions free minutes run out fast on heavy Gradle builds

**The solution: push code, let the cloud build, download the APK.**

---

## Strategy Overview

```
Developer (Windows)
      │
      │  git push origin main
      ▼
   GitHub Repo
      │
      ├──► Codemagic CI  ──► builds APK  ──► artifact download
      │    (PRIMARY)
      │
      └──► EAS Build     ──► builds APK  ──► expo.dev download
           (BACKUP)
```

---

## Option 1 — Codemagic (PRIMARY ✅ Recommended)

**Why Codemagic:**
- 500 free build minutes/month — no credit card required
- Starts within ~2 min (no queue like EAS free tier)
- Fully Linux-based — no OOM issues, plenty of disk space
- Triggered automatically on every `git push` to `main`
- APK downloadable directly from Codemagic dashboard

**Config file:** [`codemagic.yaml`](codemagic.yaml) (already committed)

### Setup (one-time)
1. Go to [codemagic.io](https://codemagic.io) → Sign in with GitHub
2. Click **Add application** → select `ombiasexpress` repo
3. Choose **React Native App** → it auto-detects `codemagic.yaml`
4. Click **Start your first build** (or just push to `main`)

### Trigger a build manually
```bash
# From terminal — push any change to trigger
git commit --allow-empty -m "ci: trigger Codemagic build"
git push origin main
```

### Download the APK
Dashboard → Build → Artifacts → `app-release.apk`

### Monthly limit tracking
- Each build ≈ 15–25 min → ~20 builds/month on free tier
- Upgrade to **Starter** ($15/month) for 1500 min if needed

---

## Option 2 — EAS Build (BACKUP)

**When to use:** When Codemagic minutes are exhausted, or for production `.aab` bundles destined for the Play Store.

**Config file:** [`mobile/eas.json`](mobile/eas.json)

### Build profiles
| Profile | Output | Use case |
|---------|--------|----------|
| `preview` | `.apk` | QA testing, direct install |
| `production` | `.aab` | Google Play Store submission |

### Commands
```bash
cd mobile

# APK for testing (goes to EAS queue)
eas build --profile preview --platform android

# Production bundle for Play Store
eas build --profile production --platform android

# Check build status
eas build:list
```

### Reduce queue wait time
- Build during off-peak hours (early morning UTC)
- Use Codemagic for daily dev builds; reserve EAS for Play Store releases

---

## Option 3 — GitHub Actions (BLOCKED — billing issue)

**Status:** Blocked. GitHub account has a billing lock preventing Actions from running.

**Fix:** Resolve billing at github.com/settings/billing → then the workflow at [`.github/workflows/android-build.yml`](.github/workflows/android-build.yml) will auto-trigger.

**Why keep it configured anyway:**
- Once billing is fixed, it provides 2000 free min/month
- Runs on `ubuntu-latest` — no disk/OOM issues
- APK available as a GitHub Actions artifact (90-day retention)

---

## Release Workflow (Day-to-Day)

### For every feature / bug fix
```
1. Code on Windows (no build needed locally)
2. git add . && git commit -m "feat: ..."
3. git push origin main
4. Codemagic auto-builds → 15–20 min → download APK
5. Install APK on test phone: adb install app-release.apk
```

### For a Play Store release
```
1. Bump versionCode + versionName in mobile/android/app/build.gradle
2. git push origin main  →  Codemagic builds APK for final QA
3. eas build --profile production --platform android
4. Upload .aab to Play Console
```

---

## Environment Variables (Production Server)

These must be set in every build environment:

| Variable | Value |
|----------|-------|
| `EXPO_PUBLIC_API_URL` | `http://37.60.240.199:5001/api` |
| `EXPO_PUBLIC_SOCKET_URL` | `http://37.60.240.199:5001` |

- **Codemagic:** set in `codemagic.yaml` under `environment.vars` ✅
- **EAS:** set in `mobile/eas.json` under `build.preview.env` ✅
- **GitHub Actions:** set in repo Settings → Secrets and Variables → Actions

---

## Android Build Config — Key Files

| File | Purpose |
|------|---------|
| [`mobile/android/gradle.properties`](mobile/android/gradle.properties) | JVM memory, parallel build, architectures |
| [`mobile/android/app/build.gradle`](mobile/android/app/build.gradle) | versionCode, versionName, abiFilters |
| [`mobile/android/app/src/main/AndroidManifest.xml`](mobile/android/app/src/main/AndroidManifest.xml) | `usesCleartextTraffic` for HTTP on Android 9+ |
| [`codemagic.yaml`](codemagic.yaml) | Codemagic CI config |
| [`mobile/eas.json`](mobile/eas.json) | EAS Build profiles |

### Critical gradle.properties settings
```properties
# Only real-device architectures — avoids clang OOM on x86
reactNativeArchitectures=armeabi-v7a,arm64-v8a

# No parallel builds — prevents Kotlin daemon crash on low memory
org.gradle.parallel=false

# Enough heap for Gradle
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=512m
```

---

## Versioning Convention

| Field | Rule |
|-------|------|
| `versionCode` | Increment by 1 for every release (1, 2, 3…) |
| `versionName` | Semantic version (1.0.0, 1.0.1, 1.1.0…) |

Bump both in [`mobile/android/app/build.gradle`](mobile/android/app/build.gradle) before each Play Store submission.

---

## Troubleshooting Quick Reference

| Symptom | Cause | Fix |
|---------|-------|-----|
| EAS queue > 30 min | Free tier peak hours | Use Codemagic instead |
| `clang++ SIGKILL` | OOM compiling x86 | Already fixed: `abiFilters` set to arm only |
| `Serveur inaccessible` | HTTP blocked on Android 9+ | Already fixed: `usesCleartextTraffic=true` |
| `ENOENT adaptive-icon.png` | PNG excluded by `.gitignore` | Already fixed: `!mobile/assets/*.png` exception |
| Local build fails (disk full) | C: drive 100% full | Build in cloud (Codemagic), never build locally |
| Kotlin daemon crash | Low memory / disk full | Same — use cloud builds |
| GitHub Actions not triggered | Billing lock | Fix billing at github.com/settings/billing |

---

## Local Development (No Build Needed)

For day-to-day coding, you **never need to build locally**:

```bash
# Start Metro + dev server (runs fine on Windows)
cd mobile
npx expo start

# Test on physical device with Expo Go app
# OR connect via USB and press 'a' for Android

# Test on emulator (if disk space allows)
npx expo start --android
```

Only trigger a CI build when you need a **standalone APK** to share or test without Expo Go.
