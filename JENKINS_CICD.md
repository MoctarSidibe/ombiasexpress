# Jenkins CI/CD — Android APK Build on Server 37.60.240.199

## Server Audit Results (Verified 2026-04-04)

```
OS:           Ubuntu 24.04 LTS (vmi3144428)
Disk:         141 GB free / 145 GB total  ✅
Java:         OpenJDK 17.0.18 (already installed)  ✅
Port 80:      Nginx → carte_grise + ombia-admin
Port 5000:    Node.js → carte-grise-backend (PM2)
Port 5001:    Node.js → ombia-express-api (PM2)
Port 5432:    PostgreSQL (localhost only)
Port 8080:    Jenkins  ✅ installed and running
Nginx config: /etc/nginx/sites-enabled/carte_grise (single file)
```

---

## Architecture on This Server

```
PORT 80 — Nginx (carte_grise config)
  ├── /                → carte_grise frontend (static)
  ├── /api/            → carte-grise-backend (port 5000, PM2)
  ├── /uploads/        → static uploads
  ├── /generated_pdfs/ → static PDFs
  └── /jenkins         → Jenkins (proxy to localhost:8080) ✅ added

PORT 5000 — carte-grise-backend (PM2, UNTOUCHED)
PORT 5001 — ombia-express-api (PM2, UNTOUCHED)
PORT 8080 — Jenkins internal (not exposed publicly)

/var/www/              → existing apps (UNTOUCHED)
/var/lib/jenkins/      → Jenkins data
/opt/android-sdk/      → Android SDK (to be installed)
```

---

## Step 1 — Add Jenkins Block to Nginx ✅ DONE

Edited `/etc/nginx/sites-enabled/carte_grise` — added before the closing `}`:

```nginx
    # ─── Jenkins CI/CD (added 2026-04-04) ────────────────────────
    location /jenkins {
        proxy_pass         http://127.0.0.1:8080;
        proxy_redirect     http://127.0.0.1:8080 http://37.60.240.199/jenkins;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";
        proxy_read_timeout    300s;
        proxy_connect_timeout 300s;
    }
    # ─────────────────────────────────────────────────────────────
```

Validated with `sudo nginx -t` → OK. Reloaded with `sudo systemctl reload nginx`.

---

## Step 2 — Java 17 ✅ ALREADY INSTALLED

```bash
java -version
# openjdk version "17.0.18" 2026-01-20 — already present on server
```

---

## Step 3 — Install Jenkins ✅ DONE

> **Note:** The `jenkins.io-2023.key` expired on 2026-03-26. The `jenkins.io-2025.key`
> does not exist yet. The correct fix is to fetch the new key ID directly from the
> Ubuntu keyserver.

```bash
# Clean up any failed attempts first
sudo rm -f /etc/apt/sources.list.d/jenkins.list
sudo rm -f /usr/share/keyrings/jenkins-keyring.gpg

# Fetch the current Jenkins signing key directly from keyserver
sudo gpg --no-default-keyring \
  --keyring /usr/share/keyrings/jenkins-keyring.gpg \
  --keyserver keyserver.ubuntu.com \
  --recv-keys 7198F4B714ABFC68

# Add the repo
echo "deb [signed-by=/usr/share/keyrings/jenkins-keyring.gpg] \
  https://pkg.jenkins.io/debian-stable binary/" | sudo tee \
  /etc/apt/sources.list.d/jenkins.list > /dev/null

# Install
sudo apt update && sudo apt install -y jenkins

# Enable and start
sudo systemctl enable jenkins && sudo systemctl start jenkins
sudo systemctl status jenkins
# Expected: Active: active (running)
```

---

## Step 4 — Configure Jenkins Prefix (/jenkins) ✅ DONE

```bash
sudo nano /usr/lib/systemd/system/jenkins.service
```

Added this line after the existing `Environment="JAVA_OPTS=...` line:

```ini
Environment="JENKINS_OPTS=--prefix=/jenkins"
```

Applied:

```bash
sudo systemctl daemon-reload && sudo systemctl restart jenkins
sleep 10 && sudo systemctl status jenkins | head -5
# Expected: Active: active (running)
```

---

## Step 5 — First Login ✅ DONE

Got initial password:
```bash
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
```

Opened in browser: `http://37.60.240.199/jenkins`

1. Pasted the initial password
2. Clicked **Install suggested plugins**
3. Created admin user
4. Set Jenkins URL to `http://37.60.240.199/jenkins`
5. Save and Finish

---

## Step 6 — Install Android SDK ✅ DONE

Isolated to `/opt/android-sdk/` — nothing to do with `/var/www/`.

```bash
# Install required tools
sudo apt install -y wget unzip

# Create SDK directory
sudo mkdir -p /opt/android-sdk/cmdline-tools
cd /opt/android-sdk/cmdline-tools

# Download Android command-line tools
sudo wget https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
sudo unzip commandlinetools-linux-*.zip
sudo mv cmdline-tools latest
sudo rm commandlinetools-linux-*.zip

# Set ANDROID_HOME system-wide
sudo tee -a /etc/environment > /dev/null << 'EOF'
ANDROID_HOME=/opt/android-sdk
EOF

source /etc/environment

# Accept licenses
yes | /opt/android-sdk/cmdline-tools/latest/bin/sdkmanager --licenses

# Install required SDK components
/opt/android-sdk/cmdline-tools/latest/bin/sdkmanager \
  "platform-tools" \
  "platforms;android-35" \
  "build-tools;35.0.1" \
  "ndk;27.1.12297006"

# Give Jenkins user ownership
sudo chown -R jenkins:jenkins /opt/android-sdk

# Verify
ls /opt/android-sdk/
# Expected: build-tools  cmdline-tools  ndk  platform-tools  platforms
```

---

## Step 7 — Node.js 20 ✅ ALREADY INSTALLED

```bash
node -v   # v20.20.2
npm -v    # 10.8.2
```

---

## Step 8 — Install GitHub Plugin in Jenkins ✅ DONE

> In Jenkins 2.541 "Manage Jenkins" is in the left sidebar or navigate directly to
> `http://37.60.240.199/jenkins/manage`

1. **Manage Jenkins** → **Plugins** → **Available plugins**
2. Search `GitHub` → install **GitHub Integration** (Version 0.7.3)
3. Wait for install to complete

---

## Step 9 — Create the Pipeline Job ✅ DONE

1. Jenkins dashboard → **New Item**
2. Name: `ombia-express-apk` → **Pipeline** → OK
3. **Build Triggers** → check **"GitHub hook trigger for GITScm polling"**
4. **Pipeline** section:
   - Definition: `Pipeline script from SCM`
   - SCM: `Git`
   - Repository URL: `https://github.com/MoctarSidibe/ombiasexpress.git`
   - Branch Specifier: `*/main`
   - Script Path: `Jenkinsfile`
5. **Save**

---

## Step 10 — Add GitHub Webhook

GitHub → `https://github.com/MoctarSidibe/ombiasexpress/settings/hooks` → **Add webhook**

| Field | Value |
|-------|-------|
| Payload URL | `http://37.60.240.199/jenkins/github-webhook/` |
| Content type | `application/json` |
| Which events | Just the **push** event |

Save → verify green tick ✅ in Recent Deliveries.

---

## Step 11 — Jenkinsfile ✅ COMMITTED & PUSHED

File: `Jenkinsfile` at repo root — committed on 2026-04-04. Content:

```groovy
pipeline {
    agent any

    environment {
        ANDROID_HOME           = '/opt/android-sdk'
        PATH                   = "/opt/android-sdk/cmdline-tools/latest/bin:/opt/android-sdk/platform-tools:${env.PATH}"
        EXPO_PUBLIC_API_URL    = 'http://37.60.240.199:5001/api'
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

## Step 12 — Trigger First Build & Download APK

```bash
# From your local machine — push any change to trigger
git commit --allow-empty -m "ci: trigger first Jenkins build"
git push origin main
```

Watch the build:
```
http://37.60.240.199/jenkins → ombia-express-apk → Console Output
```

Download the APK after success:
```
http://37.60.240.199/jenkins → ombia-express-apk → Last Successful Build → Artifacts → app-release.apk
```

---

## Verify Existing Apps Are Untouched

```bash
# carte-grise frontend
curl -s -o /dev/null -w "%{http_code}" http://37.60.240.199/
# Expected: 200

# ombia-express-api
curl -s -o /dev/null -w "%{http_code}" http://37.60.240.199:5001/api/health
# Expected: 200

# PM2 all online
pm2 list

# Jenkins up
curl -s -o /dev/null -w "%{http_code}" http://37.60.240.199/jenkins/login
# Expected: 200
```

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `/jenkins` → 502 | Jenkins not running | `sudo systemctl start jenkins` |
| `/jenkins` → 404 | Nginx block missing or prefix not set | Check Step 1 and Step 4 |
| Existing apps broken after Nginx reload | Syntax error | `sudo nginx -t` before reloading |
| GPG key error during apt install | `jenkins.io-2023.key` expired March 2026 | Use keyserver method in Step 3 |
| `ANDROID_HOME not set` in build | Env not loaded for jenkins user | Re-check `/etc/environment`, restart Jenkins |
| `Out of memory` during Gradle | RAM limit | Set `org.gradle.jvmargs=-Xmx2048m` |
| Webhook not triggering | GitHub can't reach server | `sudo ufw allow 80` |

---

## Quick Reference

| What | Where |
|------|-------|
| Jenkins UI | `http://37.60.240.199/jenkins` |
| Jenkins logs | `sudo journalctl -u jenkins -f` |
| Jenkins data | `/var/lib/jenkins/` |
| Android SDK | `/opt/android-sdk/` |
| Nginx config | `/etc/nginx/sites-enabled/carte_grise` |
| APK output | Jenkins → ombia-express-apk → Artifacts |
| Trigger build | `git push origin main` |
