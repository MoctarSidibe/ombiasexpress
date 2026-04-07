pipeline {
    agent any

    environment {
        ANDROID_HOME           = '/opt/android-sdk'
        PATH                   = "/opt/android-sdk/cmdline-tools/latest/bin:/opt/android-sdk/platform-tools:${env.PATH}"
        EXPO_PUBLIC_API_URL    = 'http://37.60.240.199:5001/api'
        EXPO_PUBLIC_SOCKET_URL = 'http://37.60.240.199:5001'
        GRADLE_OPTS            = '-Xmx4g -XX:MaxMetaspaceSize=512m -XX:+HeapDumpOnOutOfMemoryError'
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
            environment {
                NODE_ENV = 'production'
            }
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

        stage('Publish APK') {
            steps {
                catchError(buildResult: 'SUCCESS', stageResult: 'UNSTABLE') {
                    sh '''
                        mkdir -p /var/www/ombiaexpress/downloads
                        cp mobile/android/app/build/outputs/apk/release/app-release.apk \
                           /var/www/ombiaexpress/downloads/ombia-express.apk
                        echo "APK published — http://37.60.240.199/downloads/ombia-express.apk"
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
            echo 'APK ready — share this link to partners: http://37.60.240.199/downloads/ombia-express.apk'
        }
        failure {
            echo 'Build failed — check the console output above.'
        }
    }
}
