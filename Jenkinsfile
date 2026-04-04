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
