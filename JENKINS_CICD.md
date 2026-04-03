# Jenkins CI/CD — Android APK Build on Existing Server (37.60.240.199)

## Context

You already have a production server at `http://37.60.240.199` running other apps
(Node.js/PM2 backend on port 5001, possibly Nginx on port 80).

Jenkins will be installed **without touching any existing app**.
It runs as an isolated service on **port 8080**, behind its own Nginx block.

---

## Zero-Conflict Strategy

```
PORT 80  (Nginx)
  ├── /          → your existing apps (Node, static sites, etc.)
  └── /jenkins   → Jenkins (reverse proxy to localhost:8080)

PORT 5001        → your Node.js backend (PM2, untouched)
PORT 8080        → Jenkins (internal only, not exposed publicly)
```

Jenkins data lives in `/var/lib/jenkins/` — completely separate from `/var/www/`.
It never touches your existing Nginx configs or app files.

---

## Before You Start — Audit the Server

SSH into the server first and check what's running:

```bash
ssh root@37.60.240.199

# Check which ports are in use
ss -tlnp | grep -E '80|443|8080|5001|3000'

# Check what Nginx configs exist (so we don't overwrite them)
ls /etc/nginx/sites-enabled/

# Check running PM2 apps (your existing backend)
pm2 list

# Check available disk space
df -h /
```

> **Required before continuing:**
> - At least **15 GB free disk** (Android SDK + Gradle cache)
> - At least **4 GB RAM** (Gradle is memory-hungry)
> - Port 8080 not already in use

---

## Step 1 — Install Java 17

Jenkins requires Java. Install it without affecting any existing packages:

```bash
sudo apt update
sudo apt install -y openjdk-17-jdk

# Verify
java -version
# Expected: openjdk version "17.x.x"
```

---

## Step 2 — Install Jenkins

Jenkins installs as a system service. It has **no overlap with your web apps**.

```bash
# Add Jenkins apt repository
curl -fsSL https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key | sudo tee \
  /usr/share/keyrings/jenkins-keyring.asc > /dev/null

echo "deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] \
  https://pkg.jenkins.io/debian-stable binary/" | sudo tee \
  /etc/apt/sources.list.d/jenkins.list > /dev/null

sudo apt update
sudo apt install -y jenkins

# Start and enable on boot
sudo systemctl enable jenkins
sudo systemctl start jenkins

# Confirm it's running
sudo systemctl status jenkins
```

**Jenkins data directory:** `/var/lib/jenkins/`
**Jenkins logs:** `/var/log/jenkins/jenkins.log`
**No files written to `/var/www/`** — your existing apps are untouched.

---

## Step 3 — Configure Jenkins Port (Avoid Conflicts)

Jenkins defaults to port 8080. Verify nothing else uses it:

```bash
ss -tlnp | grep 8080
```

If port 8080 is already taken by another app, change Jenkins to a free port (e.g. 8090):

```bash
sudo nano /etc/default/jenkins
# Find this line and change the port:
# HTTP_PORT=8090

sudo systemctl restart jenkins
```

---

## Step 4 — Add Jenkins to Nginx (No Conflict with Existing Sites)

This is the most important step. We add Jenkins as a **new location block** inside your
existing Nginx config — without touching existing app configs.

### 4a — Check your current Nginx setup

```bash
# See which config file handles port 80
cat /etc/nginx/sites-enabled/*

# Identify the server block that handles your main domain/IP
# We will ADD to it, not replace it
```

### 4b — Add the /jenkins location block

Find the Nginx config file that has your `server { listen 80; }` block.
It's usually `/etc/nginx/sites-available/default` or a custom file.

Open it:
```bash
sudo nano /etc/nginx/sites-available/default
```

Inside the existing `server { }` block, add this **before** the closing `}`:

```nginx
# Jenkins reverse proxy — add this inside your existing server { } block
location /jenkins {
    proxy_pass         http://127.0.0.1:8080;
    proxy_redirect     http://127.0.0.1:8080 http://37.60.240.199/jenkins;
    proxy_set_header   Host              $host;
    proxy_set_header   X-Real-IP         $remote_addr;
    proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;

    # Required for Jenkins websocket (build logs)
    proxy_http_version 1.1;
    proxy_set_header   Upgrade    $http_upgrade;
    proxy_set_header   Connection "upgrade";

    # Increase timeout for long Gradle builds
    proxy_read_timeout 300s;
    proxy_connect_timeout 300s;
}
```

### 4c — Tell Jenkins it lives at /jenkins

```bash
sudo nano /etc/default/jenkins
```

Add or update this line:
```bash
JENKINS_ARGS="--webroot=/var/cache/jenkins/war --httpPort=8080 --prefix=/jenkins"
```

### 4d — Apply and verify

```bash
# Test Nginx config — must say "syntax is ok"
sudo nginx -t

# Reload Nginx (no downtime, existing apps keep running)
sudo systemctl reload nginx

# Restart Jenkins to apply prefix
sudo systemctl restart jenkins
```

Jenkins is now accessible at:
```
http://37.60.240.199/jenkins
```

Your existing apps at `http://37.60.240.199/` are **completely unaffected**.

---

## Step 5 — First Jenkins Login

```bash
# Get the initial admin password
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
```

1. Open `http://37.60.240.199/jenkins` in your browser
2. Paste the password
3. Click **Install suggested plugins** (wait ~3 min)
4. Create your admin user
5. On "Jenkins URL" screen → set it to `http://37.60.240.199/jenkins`

---

## Step 6 — Install Android SDK (Isolated to /opt)

The Android SDK goes into `/opt/android-sdk/` — nothing to do with `/var/www/`.

```bash
# Install tools
sudo apt install -y wget unzip

# Create SDK directory
sudo mkdir -p /opt/android-sdk/cmdline-tools
cd /opt/android-sdk/cmdline-tools

# Download Android command-line tools
sudo wget https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
sudo unzip commandlinetools-linux-*.zip
sudo mv cmdline-tools latest
sudo rm commandlinetools-linux-*.zip

# Set environment variables system-wide
sudo tee -a /etc/environment > /dev/null << 'EOF'
ANDROID_HOME=/opt/android-sdk
PATH=/opt/android-sdk/cmdline-tools/latest/bin:/opt/android-sdk/platform-tools:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
EOF

source /etc/environment

# Accept licenses and install required SDK components
yes | /opt/android-sdk/cmdline-tools/latest/bin/sdkmanager --licenses
/opt/android-sdk/cmdline-tools/latest/bin/sdkmanager \
  "platform-tools" \
  "platforms;android-35" \
  "build-tools;35.0.1" \
  "ndk;27.1.12297006"

# Give Jenkins user access to the SDK
sudo chown -R jenkins:jenkins /opt/android-sdk
```

---

## Step 7 — Install Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node -v   # v20.x
npm -v    # 10.x
```

---

## Step 8 — Jenkinsfile (already in repo root)

The `Jenkinsfile` at the root of the repo controls the build pipeline.
Create it if it doesn't exist yet:

```groovy
pipeline {
    agent any

    environment {
        ANDROID_HOME         = '/opt/android-sdk'
        PATH                 = "/opt/android-sdk/cmdline-tools/latest/bin:/opt/android-sdk/platform-tools:${env.PATH}"
        EXPO_PUBLIC_API_URL  = 'http://37.60.240.199:5001/api'
        EXPO_PUBLIC_SOCKET_URL = 'http://37.60.240.199:5001'
    }

    triggers {
        githubPush()
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install JS Dependencies') {
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
            archiveArtifacts(
                artifacts: 'mobile/android/app/build/outputs/apk/release/app-release.apk',
                fingerprint: true
            )
            echo 'APK ready — download from Jenkins Artifacts tab.'
        }
        failure {
            echo 'Build failed — check the console output above.'
        }
    }
}
```

---

## Step 9 — Create the Pipeline Job in Jenkins

1. Go to `http://37.60.240.199/jenkins`
2. **New Item** → name it `ombia-express-apk` → select **Pipeline** → OK
3. Under **Pipeline** section:
   - Definition: `Pipeline script from SCM`
   - SCM: `Git`
   - Repository URL: `https://github.com/MoctarSidibe/ombiasexpress.git`
   - Branch Specifier: `*/main`
   - Script Path: `Jenkinsfile`
4. Save

---

## Step 10 — GitHub Webhook (Auto-build on every push)

### Install GitHub plugin in Jenkins
Manage Jenkins → Plugins → Available plugins → search `GitHub` → Install

### Add webhook in GitHub
Go to `https://github.com/MoctarSidibe/ombiasexpress/settings/hooks` → **Add webhook**

- **Payload URL:** `http://37.60.240.199/jenkins/github-webhook/`
- **Content type:** `application/json`
- **Which events:** Just the `push` event
- Save

### Enable trigger in the pipeline job
Jenkins → `ombia-express-apk` → Configure → Build Triggers
→ check **"GitHub hook trigger for GITScm polling"** → Save

Now every `git push origin main` automatically triggers a build.

---

## Download the APK

After a successful build:
```
http://37.60.240.199/jenkins
→ ombia-express-apk
→ Last successful build
→ Artifacts
→ app-release.apk   ← download here
```

---

## Verify No Conflicts After Setup

Run these checks to confirm existing apps are untouched:

```bash
# Your Node.js backend still running on 5001
curl http://37.60.240.199:5001/api/health

# Your existing web app still accessible on port 80
curl http://37.60.240.199/

# Jenkins accessible at /jenkins
curl http://37.60.240.199/jenkins/

# PM2 apps still running
pm2 list

# Nginx still healthy
sudo systemctl status nginx
```

---

## Optimizing Build Speed

Add to `mobile/android/gradle.properties`:
```properties
# Cache compiled modules — subsequent builds skip recompilation
org.gradle.caching=true

# Gradle daemon stays warm between builds
org.gradle.daemon=true
```

| Build | Time |
|-------|------|
| First build (cold cache) | ~15–20 min |
| Subsequent builds (warm cache) | ~5–8 min |

---

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `/jenkins` returns 502 | Jenkins not running | `sudo systemctl start jenkins` |
| `/jenkins` returns 404 | Nginx prefix not set | Check `JENKINS_ARGS` has `--prefix=/jenkins` |
| Existing apps broken after Nginx reload | Syntax error in new block | Run `sudo nginx -t` before reloading |
| `ANDROID_HOME not set` in build | Env not loaded for jenkins user | Set in `/etc/environment` and restart Jenkins |
| `Permission denied: ./gradlew` | File not executable | Already handled in Jenkinsfile |
| `Out of memory` during Gradle | Server RAM too low | Set `org.gradle.jvmargs=-Xmx2048m` (lower if needed) |
| Webhook not received by Jenkins | Firewall blocking port 80 | Check `ufw allow 80` on the server |
| Build not triggered on push | Webhook not configured | Check GitHub → Settings → Webhooks → Recent Deliveries |

---

## File & Port Map (Full Picture)

```
/var/www/          → your existing web apps (UNTOUCHED)
/var/lib/jenkins/  → Jenkins data, jobs, builds, plugins
/opt/android-sdk/  → Android SDK (SDK, NDK, build-tools)
~/.gradle/         → Gradle cache (under jenkins user home)

Port 80   → Nginx (existing apps + /jenkins proxy)
Port 5001 → Node.js backend via PM2 (UNTOUCHED)
Port 8080 → Jenkins (internal only, not publicly exposed)
```

---

## Summary — Step by Step

| # | Command / Action | Risk to existing apps |
|---|-----------------|----------------------|
| 1 | `apt install openjdk-17-jdk` | None |
| 2 | `apt install jenkins` | None — new service |
| 3 | Check Jenkins port (8080 free?) | None |
| 4 | Add `/jenkins` block to Nginx config | Low — `nginx -t` validates before reload |
| 5 | `systemctl reload nginx` | Zero downtime |
| 6 | Install Android SDK to `/opt/android-sdk/` | None |
| 7 | Install Node.js 20 | None |
| 8 | Create Pipeline job in Jenkins UI | None |
| 9 | Add GitHub webhook | None |
| 10 | Push code → APK builds automatically | None |
