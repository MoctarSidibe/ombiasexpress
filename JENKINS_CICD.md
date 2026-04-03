# Jenkins CI/CD — Android APK Build on Server 37.60.240.199

## Server Audit Results (Verified 2026-04-03)

```
OS:           Ubuntu (VPS — vmi3144428)
Disk:         141 GB free / 145 GB total  ✅ plenty of space
Port 80:      Nginx → carte_grise frontend + ombia-admin
Port 5000:    Node.js → carte-grise-backend (PM2)
Port 5001:    Node.js → ombia-express-api (PM2)
Port 5432:    PostgreSQL (localhost only)
Port 8080:    FREE → Jenkins will use this  ✅
Nginx config: /etc/nginx/sites-enabled/carte_grise (single file)
```

**No conflicts.** Jenkins installs cleanly alongside existing apps.

---

## Architecture on This Server

```
PORT 80 — Nginx (carte_grise config)
  ├── /                → carte_grise frontend (static, /var/www/carte_grise/frontend-dist)
  ├── /api/            → carte-grise-backend (port 5000, PM2)
  ├── /uploads/        → static uploads
  ├── /generated_pdfs/ → static PDFs
  └── /jenkins         → Jenkins (NEW — proxy to localhost:8080)

PORT 5000 — carte-grise-backend (PM2, UNTOUCHED)
PORT 5001 — ombia-express-api (PM2, UNTOUCHED)
PORT 8080 — Jenkins internal (not exposed publicly)

/var/www/              → existing apps (UNTOUCHED)
/var/lib/jenkins/      → Jenkins data (new, separate)
/opt/android-sdk/      → Android SDK (new, separate)
```

---

## Step 1 — Add Jenkins Block to Nginx

Open the existing Nginx config:

```bash
sudo nano /etc/nginx/sites-enabled/carte_grise
```

Add the Jenkins location block **before the closing `}`** — after the `/generated_pdfs/` block:

```nginx
server {
    listen 80;
    server_name 37.60.240.199;

    # Frontend
    root /var/www/carte_grise/frontend-dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }

    # Static Files (Uploads)
    location /uploads/ {
        alias /var/www/carte_grise/Backend/uploads/;
        autoindex off;
    }

    # Static Files (Generated PDFs)
    location /generated_pdfs/ {
        alias /var/www/carte_grise/Backend/generated_pdfs/;
        autoindex off;
    }

    # ─── Jenkins CI/CD (added 2026-04-03) ────────────────────────
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
}
```

Validate and reload (zero downtime — existing apps keep running):

```bash
sudo nginx -t
# Expected: syntax is ok / test is successful

sudo systemctl reload nginx
```

---

## Step 2 — Install Java 17

Jenkins requires Java. This does not affect existing Node.js apps.

```bash
sudo apt update
sudo apt install -y openjdk-17-jdk

# Verify
java -version
# Expected: openjdk version "17.x.x"
```

---

## Step 3 — Install Jenkins

```bash
# Add Jenkins apt repository
curl -fsSL https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key | sudo tee \
  /usr/share/keyrings/jenkins-keyring.asc > /dev/null

echo "deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] \
  https://pkg.jenkins.io/debian-stable binary/" | sudo tee \
  /etc/apt/sources.list.d/jenkins.list > /dev/null

sudo apt update
sudo apt install -y jenkins

# Enable and start
sudo systemctl enable jenkins
sudo systemctl start jenkins

# Verify it's running
sudo systemctl status jenkins
# Expected: Active: active (running)
```

---

## Step 4 — Tell Jenkins It Lives at /jenkins

Jenkins needs to know it's served from a subpath, not the root.

```bash
sudo nano /usr/lib/systemd/system/jenkins.service
```

Find the `Environment="JAVA_OPTS=...` line and add the prefix option.
The file should have these two environment lines:

```ini
Environment="JAVA_OPTS=-Djava.awt.headless=true -Djenkins.install.runSetupWizard=true"
Environment="JENKINS_OPTS=--prefix=/jenkins"
```

Apply the changes:

```bash
sudo systemctl daemon-reload
sudo systemctl restart jenkins

# Confirm still running
sudo systemctl status jenkins
```

---

## Step 5 — First Login

Get the initial admin password:

```bash
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
```

Open in browser:
```
http://37.60.240.199/jenkins
```

1. Paste the password
2. Click **Install suggested plugins** (wait ~3–5 min)
3. Create your admin user (save the credentials!)
4. On **"Jenkins URL"** screen → set to `http://37.60.240.199/jenkins`
5. Click **Save and Finish** → **Start using Jenkins**

---

## Step 6 — Install Android SDK

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

# Set environment variables system-wide
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

# Give Jenkins user ownership of the SDK
sudo chown -R jenkins:jenkins /opt/android-sdk

# Verify
ls /opt/android-sdk/
# Expected: build-tools  cmdline-tools  ndk  platform-tools  platforms
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

## Step 8 — Install GitHub Plugin in Jenkins

1. Go to `http://37.60.240.199/jenkins`
2. **Manage Jenkins** → **Plugins** → **Available plugins**
3. Search `GitHub` → check **GitHub plugin** → **Install**
4. Restart Jenkins after install:
   ```bash
   sudo systemctl restart jenkins
   ```

---

## Step 9 — Create the Pipeline Job

1. Jenkins dashboard → **New Item**
2. Name: `ombia-express-apk`
3. Type: **Pipeline** → OK
4. Under **Build Triggers** → check **"GitHub hook trigger for GITScm polling"**
5. Under **Pipeline**:
   - Definition: `Pipeline script from SCM`
   - SCM: `Git`
   - Repository URL: `https://github.com/MoctarSidibe/ombiasexpress.git`
   - Branch Specifier: `*/main`
   - Script Path: `Jenkinsfile`
6. **Save**

---

## Step 10 — Add GitHub Webhook

In GitHub → `https://github.com/MoctarSidibe/ombiasexpress/settings/hooks` → **Add webhook**

| Field | Value |
|-------|-------|
| Payload URL | `http://37.60.240.199/jenkins/github-webhook/` |
| Content type | `application/json` |
| Which events | Just the **push** event |

Save → GitHub will send a ping → check it shows a green tick ✅

---

## Step 11 — Add Jenkinsfile to the Repo

Create `Jenkinsfile` at the root of the repo (already done — verify it exists):

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

Commit and push:
```bash
git add Jenkinsfile
git commit -m "ci: add Jenkinsfile for Jenkins pipeline"
git push origin main
```

---

## Step 12 — Trigger First Build & Download APK

```bash
# Trigger manually from your machine
git commit --allow-empty -m "ci: trigger first Jenkins build"
git push origin main
```

Watch the build at:
```
http://37.60.240.199/jenkins → ombia-express-apk → Console Output
```

Download the APK after success:
```
http://37.60.240.199/jenkins → ombia-express-apk → Last Successful Build → Artifacts → app-release.apk
```

---

## Verify Existing Apps Are Untouched

Run after every Jenkins step:

```bash
# carte-grise frontend still accessible
curl -s -o /dev/null -w "%{http_code}" http://37.60.240.199/
# Expected: 200

# ombia-express-api still running
curl -s -o /dev/null -w "%{http_code}" http://37.60.240.199:5001/api/health
# Expected: 200

# PM2 apps all online
pm2 list
# Expected: carte-grise-backend, ombia-admin, ombia-express-api — all online

# Jenkins accessible
curl -s -o /dev/null -w "%{http_code}" http://37.60.240.199/jenkins/login
# Expected: 200
```

---

## Build Speed Optimization

Add to `mobile/android/gradle.properties` (already in repo):
```properties
org.gradle.caching=true
org.gradle.daemon=true
```

| Build | Expected time |
|-------|--------------|
| First build (cold) | ~15–20 min |
| Subsequent builds (warm cache) | ~5–8 min |

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `http://37.60.240.199/jenkins` → 502 | Jenkins not running | `sudo systemctl start jenkins` |
| `http://37.60.240.199/jenkins` → 404 | Nginx block missing or prefix not set | Check Step 1 and Step 4 |
| `http://37.60.240.199/` broken after reload | Nginx syntax error | `sudo nginx -t` — fix errors before reloading |
| PM2 apps down after install | Shouldn't happen — check anyway | `pm2 resurrect` or `pm2 start all` |
| `ANDROID_HOME not set` in build | Env not loaded for jenkins user | Re-check `/etc/environment`, restart Jenkins |
| `Out of memory` during Gradle | Server RAM limit hit | Set `org.gradle.jvmargs=-Xmx2048m` in gradle.properties |
| Webhook not triggering | GitHub can't reach server | Check `ufw allow 80` on server |
| First build never starts | Webhook not configured | Go to GitHub → Settings → Webhooks → Recent Deliveries |

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
