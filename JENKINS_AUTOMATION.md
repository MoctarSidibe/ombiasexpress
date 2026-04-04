# Jenkins Full Automation — Ombia Express

## What We Can Automate

The project has 3 deployable parts + 1 mobile build:

```
ombiasexpress (GitHub repo)
├── mobile/       → Android APK build         (Jenkins builds on server)
├── server/       → Node.js API (PM2)         (Jenkins deploys to server)
├── admin/        → React admin panel (static) (Jenkins builds + deploys to server)
└── database      → PostgreSQL                 (Jenkins backs up nightly)
```

**Current state:**
- `mobile` APK build → ✅ Jenkins job running (`ombia-express-apk`)
- `server` deploy → ⏳ to automate
- `admin` deploy → ⏳ to automate
- `database` backup → ⏳ to automate

---

## Full Automation Architecture

```
git push origin main
        │
        ▼
   GitHub Webhook
        │
        ▼
   Jenkins (37.60.240.199:8080)
        │
        ├── Job 1: ombia-express-apk
        │     └── Build Android APK → archive artifact
        │
        ├── Job 2: ombia-express-server
        │     └── SSH into server → git pull → pm2 restart ombia-express-api
        │
        ├── Job 3: ombia-express-admin
        │     └── npm run build → copy dist/ to /var/www/ombia-admin/
        │
        └── Job 4: ombia-db-backup (scheduled, nightly)
              └── pg_dump → save to /var/backups/ombia/
```

---

## Prerequisites — SSH Credentials in Jenkins

Jenkins needs SSH access to the server to deploy.
Since Jenkins is ON the server, we use **localhost SSH** (no password needed).

```bash
# On the server — generate SSH key for Jenkins user
sudo -u jenkins ssh-keygen -t rsa -b 4096 -f /var/lib/jenkins/.ssh/id_rsa -N ""

# Add Jenkins public key to authorized_keys (so Jenkins can SSH to localhost)
sudo -u jenkins cat /var/lib/jenkins/.ssh/id_rsa.pub | sudo tee -a /root/.ssh/authorized_keys

# Test it works
sudo -u jenkins ssh -o StrictHostKeyChecking=no root@localhost "echo OK"
# Expected: OK
```

> **Why localhost SSH?** Jenkins runs on the same server as your apps.
> Instead of deploying to a remote server, it deploys to itself via localhost.
> This avoids storing passwords anywhere.

---

## Job 2 — Deploy Server (Node.js API)

### What it does
After every `git push origin main`:
1. SSH into the server (localhost)
2. `cd /var/www/ombia-express/server`
3. `git pull origin main`
4. `npm install --production`
5. `pm2 restart ombia-express-api`

### Add to Jenkinsfile

Add this stage inside the existing `Jenkinsfile` pipeline, after the APK build:

```groovy
stage('Deploy Server') {
    steps {
        sh '''
            ssh -o StrictHostKeyChecking=no root@localhost "
                cd /var/www/ombia-express/server &&
                git pull origin main &&
                npm install --production --legacy-peer-deps &&
                pm2 restart ombia-express-api
            "
        '''
    }
}
```

### Verify after deploy
```bash
pm2 list                              # ombia-express-api should show online
curl http://localhost:5001/api/health # should return 200
```

---

## Job 3 — Deploy Admin Panel (React)

### What it does
After every `git push origin main`:
1. `cd admin/`
2. `npm install`
3. `npm run build` → generates `admin/dist/`
4. Copy `dist/` to `/var/www/ombia-admin/` on the server
5. Nginx serves it automatically (static files)

### Add Nginx config for admin panel

On the server, add a new location block in `/etc/nginx/sites-enabled/carte_grise`:

```nginx
# Ombia Express Admin Panel
location /ombia-admin/ {
    alias /var/www/ombia-admin/;
    index index.html;
    try_files $uri $uri/ /ombia-admin/index.html;
}
```

Create the directory:
```bash
sudo mkdir -p /var/www/ombia-admin
sudo chown -R jenkins:jenkins /var/www/ombia-admin
sudo nginx -t && sudo systemctl reload nginx
```

### Add to Jenkinsfile

```groovy
stage('Build Admin Panel') {
    steps {
        dir('admin') {
            sh 'npm install --legacy-peer-deps'
            sh 'npm run build'
        }
    }
}

stage('Deploy Admin Panel') {
    steps {
        sh '''
            ssh -o StrictHostKeyChecking=no root@localhost "
                rm -rf /var/www/ombia-admin/* &&
                cp -r /var/lib/jenkins/workspace/ombia-express-apk/admin/dist/* /var/www/ombia-admin/
            "
        '''
    }
}
```

Admin panel will be accessible at:
```
http://37.60.240.199/ombia-admin/
```

---

## Job 4 — Nightly Database Backup

### What it does
Every night at 2:00 AM:
1. `pg_dump ombia_express_db` → compressed SQL file
2. Save to `/var/backups/ombia/`
3. Keep last 7 days only (auto-delete old backups)

### Create a separate Jenkins job for this

1. Jenkins → **New Item** → name: `ombia-db-backup` → **Pipeline** → OK
2. **Build Triggers** → check **"Build periodically"**
3. Schedule: `0 2 * * *` (every night at 2:00 AM)
4. **Pipeline** → Pipeline script:

```groovy
pipeline {
    agent any

    stages {
        stage('Backup Database') {
            steps {
                sh '''
                    ssh -o StrictHostKeyChecking=no root@localhost "
                        mkdir -p /var/backups/ombia &&
                        pg_dump -U postgres ombia_express_db | gzip > /var/backups/ombia/ombia_\$(date +%Y%m%d_%H%M%S).sql.gz &&
                        find /var/backups/ombia/ -name '*.sql.gz' -mtime +7 -delete &&
                        echo Backup done
                    "
                '''
            }
        }
    }

    post {
        success {
            echo 'Database backed up successfully.'
        }
        failure {
            echo 'Database backup FAILED — check the server.'
        }
    }
}
```

### Verify backups
```bash
ls -lh /var/backups/ombia/
# Should show daily .sql.gz files
```

---

## Updated Jenkinsfile (All Jobs Combined)

Replace the current `Jenkinsfile` at the repo root with this complete version
when you are ready to enable server + admin deployment:

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

        // ── Mobile APK ──────────────────────────────────────────
        stage('Install JS Dependencies (Mobile)') {
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

        // ── Admin Panel ─────────────────────────────────────────
        stage('Build Admin Panel') {
            steps {
                dir('admin') {
                    sh 'npm install --legacy-peer-deps'
                    sh 'npm run build'
                }
            }
        }

        stage('Deploy Admin Panel') {
            steps {
                sh '''
                    rm -rf /var/www/ombia-admin/* && \
                    cp -r admin/dist/* /var/www/ombia-admin/
                '''
            }
        }

        // ── Server API ──────────────────────────────────────────
        stage('Deploy Server') {
            steps {
                sh '''
                    cd /var/www/ombia-express/server && \
                    git pull origin main && \
                    npm install --production --legacy-peer-deps && \
                    pm2 restart ombia-express-api
                '''
            }
        }
    }

    post {
        success {
            archiveArtifacts(
                artifacts: 'mobile/android/app/build/outputs/apk/release/app-release.apk',
                fingerprint: true
            )
            echo 'All done — APK built, admin deployed, server restarted.'
        }
        failure {
            echo 'Pipeline failed — check the console output above.'
        }
    }
}
```

---

## Rollout Plan

Do this in order — don't rush all at once:

| Phase | Job | When to enable |
|-------|-----|---------------|
| 1 | `ombia-express-apk` (APK build) | ✅ Running now |
| 2 | Add admin build + deploy | After first APK build succeeds |
| 3 | Add server deploy | After confirming admin deploy works |
| 4 | `ombia-db-backup` (nightly) | Any time — independent job |

---

## Security Note — Server Password

**Never store your server SSH password in Jenkins or in the repo.**

The correct approach (already documented above) is:
- Jenkins generates its own SSH keypair
- Public key added to server's `authorized_keys`
- Jenkins SSHes using the key — no password stored anywhere

If you want to give me server access to set this up:
- Share the password only in the terminal (not in chat)
- After setup, you can change the password — the SSH key remains valid

---

## Quick Reference

| Job | Trigger | What it does |
|-----|---------|-------------|
| `ombia-express-apk` | git push to main | Builds Android APK |
| `ombia-express-apk` (extended) | git push to main | APK + admin build + server restart |
| `ombia-db-backup` | Every night 2:00 AM | pg_dump → /var/backups/ombia/ |
