pipeline {
    agent any

    environment {
        ANDROID_HOME           = '/opt/android-sdk'
        PATH                   = "/opt/android-sdk/cmdline-tools/latest/bin:/opt/android-sdk/platform-tools:${env.PATH}"
        EXPO_PUBLIC_API_URL    = 'http://37.60.240.199:5001/api'
        EXPO_PUBLIC_SOCKET_URL = 'http://37.60.240.199:5001'
        VITE_API_URL           = 'http://37.60.240.199:5001/api'
        ADMIN_DIST_DIR         = '/var/www/ombiaexpress/admin/dist'
        // Fix: NODE_ENV requis par expo-constants, évite l'avertissement et les échecs intermittents
        NODE_ENV               = 'production'
        // Fix: limite mémoire JVM pour éviter les OOM lors du build Gradle
        GRADLE_OPTS            = '-Xmx4g -XX:MaxMetaspaceSize=512m -XX:+HeapDumpOnOutOfMemoryError'
        // Fix: Metro bundler — force la sortie propre après le bundling
        EXPO_NO_TELEMETRY      = '1'
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

        // ── Admin Panel ──────────────────────────────────────────────────────
        stage('Install Admin Dependencies') {
            steps {
                dir('admin') {
                    sh 'npm install --legacy-peer-deps'
                }
            }
        }

        stage('Build Admin Panel') {
            steps {
                dir('admin') {
                    sh 'npm run build'
                }
            }
        }

        stage('Deploy Admin Panel') {
            steps {
                catchError(buildResult: 'SUCCESS', stageResult: 'UNSTABLE') {
                    sh '''
                        mkdir -p ${ADMIN_DIST_DIR}
                        rsync -a --delete admin/dist/ ${ADMIN_DIST_DIR}/
                        echo "Admin panel deployed to ${ADMIN_DIST_DIR}"
                    '''
                }
            }
        }

        // ── Mobile APK ──────────────────────────────────────────────────────
        stage('Install Mobile Dependencies') {
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
                    sh '''
                        ./gradlew assembleRelease \
                            --no-daemon \
                            --max-workers=2 \
                            --warning-mode none \
                            -Dorg.jenkinsci.plugins.durabletask.BourneShellScript.HEARTBEAT_CHECK_INTERVAL=86400 \
                            -Dkotlin.incremental=false \
                            -Dkotlin.daemon.jvm.options="-Xmx2g"
                    '''
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
            echo 'Admin panel live at http://37.60.240.199:3001'
        }
        failure {
            echo 'Build failed — check the console output above.'
        }
        unstable {
            echo 'Build instable — deploy admin a échoué mais APK est prêt.'
        }
    }
}
