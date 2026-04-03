# Jenkins CI/CD — Android APK Build Setup

## What is Jenkins?

Jenkins is a **free, open-source** CI/CD server you run yourself (self-hosted).
No monthly limits, no queues, no credit card — you own the machine, you control the builds.

**Trade-off:** You need a machine to run it (a cheap VPS or your own server).

---

## Why Jenkins for Ombia Express?

| Feature | Jenkins | Codemagic | EAS Build | GitHub Actions |
|---------|---------|-----------|-----------|----------------|
| Cost | Free (self-hosted) | Paid (private repo) | 30 builds/month | 500 min/month |
| Queue wait | None | ~2 min | 15–60 min | ~2 min |
| Build limit | Unlimited | By plan | 30/month | By minutes |
| Setup effort | Medium | Low | Low | Low |
| Disk control | Full | None | None | None |
| Windows support | ✅ | ✅ | ❌ | ✅ |

**Best for:** When you need unlimited builds with no recurring cost.

---

## Architecture

```
Developer
    │
    │  git push origin main
    ▼
 GitHub Repo
    │
    │  Webhook (push event)
    ▼
Jenkins Server (VPS / local machine)
    │
    ├── Pull latest code
    ├── npm install
    ├── ./gradlew assembleRelease
    ▼
APK artifact → stored on Jenkins / sent by email / uploaded to server
```

---

## Option A — Jenkins on a VPS (Recommended)

### Minimum VPS requirements
- **RAM:** 4 GB (8 GB ideal — Gradle is memory-hungry)
- **Disk:** 30 GB free
- **OS:** Ubuntu 22.04 LTS
- **Cost:** ~$6–12/month (DigitalOcean, Hetzner, Vultr)

### Cheapest option: Hetzner CX22
- 4 vCPU / 8 GB RAM / 80 GB SSD
- **€3.79/month** (~$4/month)
- More than enough for Android builds

---

## Option B — Jenkins on Your Windows Machine

Run Jenkins locally when you need a build — no VPS cost, but:
- Machine must be on and connected to internet for webhooks
- Disk space issue (C: is full — need to free space first)
- Use only if VPS is not an option

---

## Setup Guide (Ubuntu VPS)

### Step 1 — Install Java
```bash
sudo apt update
sudo apt install -y openjdk-17-jdk
java -version  # should show 17.x
```

### Step 2 — Install Jenkins
```bash
curl -fsSL https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key | sudo tee \
  /usr/share/keyrings/jenkins-keyring.asc > /dev/null

echo deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] \
  https://pkg.jenkins.io/debian-stable binary/ | sudo tee \
  /etc/apt/sources.list.d/jenkins.list > /dev/null

sudo apt update
sudo apt install -y jenkins
sudo systemctl enable jenkins
sudo systemctl start jenkins
```

### Step 3 — Access Jenkins
```
http://YOUR_VPS_IP:8080
```
Get the initial password:
```bash
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
```
→ Install suggested plugins → Create admin user

### Step 4 — Install Android SDK on the VPS
```bash
# Install required tools
sudo apt install -y wget unzip

# Download command-line tools
mkdir -p /opt/android-sdk/cmdline-tools
cd /opt/android-sdk/cmdline-tools
wget https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
unzip commandlinetools-linux-*.zip
mv cmdline-tools latest

# Set environment variables
echo 'export ANDROID_HOME=/opt/android-sdk' >> /etc/environment
echo 'export PATH=$PATH:/opt/android-sdk/cmdline-tools/latest/bin:/opt/android-sdk/platform-tools' >> /etc/environment
source /etc/environment

# Accept licenses and install required components
yes | sdkmanager --licenses
sdkmanager "platform-tools" "platforms;android-35" "build-tools;35.0.1" "ndk;27.1.12297006"
```

### Step 5 — Install Node.js on the VPS
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v  # should show v20.x
```

---

## Jenkinsfile

Create this file at the root of your repo: `Jenkinsfile`

```groovy
pipeline {
    agent any

    environment {
        ANDROID_HOME = '/opt/android-sdk'
        PATH = "${env.PATH}:/opt/android-sdk/cmdline-tools/latest/bin:/opt/android-sdk/platform-tools"
        EXPO_PUBLIC_API_URL = 'http://37.60.240.199:5001/api'
        EXPO_PUBLIC_SOCKET_URL = 'http://37.60.240.199:5001'
    }

    triggers {
        githubPush()  // triggers on every git push
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                dir('mobile') {
                    sh 'npm install --legacy-peer-deps'
                }
            }
        }

        stage('Make Gradlew Executable') {
            steps {
                dir('mobile/android') {
                    sh 'chmod +x gradlew'
                }
            }
        }

        stage('Build Release APK') {
            steps {
                dir('mobile/android') {
                    sh './gradlew assembleRelease --no-daemon'
                }
            }
        }
    }

    post {
        success {
            // Archive the APK so it's downloadable from Jenkins
            archiveArtifacts artifacts: 'mobile/android/app/build/outputs/apk/release/app-release.apk',
                             fingerprint: true
            echo '✅ APK built successfully!'
        }
        failure {
            echo '❌ Build failed — check the logs above.'
        }
    }
}
```

---

## Step 6 — Create Jenkins Pipeline Job

1. Jenkins dashboard → **New Item**
2. Name: `ombia-express-apk`
3. Type: **Pipeline** → OK
4. Under **Pipeline**:
   - Definition: `Pipeline script from SCM`
   - SCM: `Git`
   - Repository URL: `https://github.com/MoctarSidibe/ombiasexpress.git`
   - Branch: `*/main`
   - Script Path: `Jenkinsfile`
5. Save

---

## Step 7 — GitHub Webhook (Auto-trigger on push)

1. Install **GitHub plugin** in Jenkins:
   - Manage Jenkins → Plugins → Available → search "GitHub" → install

2. In GitHub repo → **Settings → Webhooks → Add webhook**:
   - Payload URL: `http://YOUR_VPS_IP:8080/github-webhook/`
   - Content type: `application/json`
   - Event: **Just the push event**
   - Save

3. In Jenkins job → **Build Triggers** → check **"GitHub hook trigger for GITScm polling"**

Now every `git push origin main` triggers a build automatically.

---

## Download the APK

After a successful build:
- Jenkins dashboard → `ombia-express-apk` → last build → **Artifacts**
- Download `app-release.apk`

Or set up email notification to send the APK automatically:
```groovy
post {
    success {
        emailext (
            subject: "✅ Ombia Express APK Ready",
            body: "New APK built from commit ${env.GIT_COMMIT}. Download from Jenkins.",
            to: 'your@email.com',
            attachmentsPattern: 'mobile/android/app/build/outputs/apk/release/app-release.apk'
        )
    }
}
```

---

## Optimizing Build Speed

Add to `mobile/android/gradle.properties` for faster cloud builds:
```properties
# Use build cache to skip re-compiling unchanged modules
org.gradle.caching=true

# Gradle daemon stays alive between builds (faster 2nd build onwards)
org.gradle.daemon=true
```

First build: ~15–20 min
Subsequent builds (cache warm): ~5–8 min

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `ANDROID_HOME not set` | Add to `/etc/environment` and restart Jenkins |
| `Permission denied: ./gradlew` | Add `chmod +x gradlew` step before build |
| `Out of memory` | Increase VPS RAM or set `org.gradle.jvmargs=-Xmx4096m` |
| `SDK license not accepted` | Run `yes \| sdkmanager --licenses` on VPS |
| Webhook not triggering | Check VPS firewall: port 8080 must be open |
| Build not starting | Check Jenkins → Manage Jenkins → System Log for errors |

---

## Security (Important)

```bash
# Put Jenkins behind Nginx with HTTPS (recommended)
sudo apt install -y nginx certbot python3-certbot-nginx

# Use a domain or subdomain: ci.yourdomain.com
# Then Jenkins is at https://ci.yourdomain.com instead of :8080
```

Never expose Jenkins on port 8080 to the internet without authentication.
Jenkins has its own user/password system — make sure it's set up before opening the firewall.

---

## Summary

| Step | Action |
|------|--------|
| 1 | Get a VPS (Hetzner CX22 ~$4/month) |
| 2 | Install Java 17 + Jenkins + Android SDK + Node 20 |
| 3 | Add `Jenkinsfile` to repo root |
| 4 | Create Pipeline job in Jenkins pointing to GitHub repo |
| 5 | Add GitHub webhook → auto-trigger on every push |
| 6 | Push code → APK builds in ~15 min → download from Jenkins |
