pipeline {
    agent {
        docker {
            image 'node:24.14.0-alpine'
            args '-u root'
        }
    }

    stages {
        stage('Build H5') {
            steps {
                script {
                    sh 'npm ci'
                    if (env.BRANCH_NAME == 'production') {
                        echo "Building for Production..."
                        sh 'npm run build:h5:prod'
                    } else if (env.BRANCH_NAME == 'staging') {
                        echo "Building for Staging..."
                        sh 'npm run build:h5:test'
                    } else {
                        error("Unsupported branch: ${env.BRANCH_NAME}. Build aborted.")
                    }
                    sh '''
                    # Navigate to dist/build before compressing so the archive only contains the 'h5' directory
                    cd dist/build && tar -czvf ../../h5.tar.gz h5/
                    '''
                }
            }
        }

        stage('Deploy to Staging') {
            when {
                branch 'staging'
            }
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'byteplus-staging',
                        usernameVariable: 'REMOTE_USER',
                        passwordVariable: 'REMOTE_PASSWORD'
                    )
                ]) {
                    script {
                        def remote = [
                            name:          "byteplus-staging",
                            host:          "101.47.67.36",
                            user:          "${REMOTE_USER}",
                            password:      "${REMOTE_PASSWORD}",
                            port:          22,
                            allowAnyHosts: true
                        ]

                        sshCommand remote: remote, command: 'mkdir -p /opt/azoc-report-webpage'
                        sshPut remote: remote, from: 'h5.tar.gz', into: '/opt/azoc-report-webpage'
                        sshCommand remote: remote, command: 'cd /opt/azoc-report-webpage && if [ -d "h5" ]; then rm -rf h5_bak && mv h5 h5_bak; fi && tar -xzvf h5.tar.gz && rm h5.tar.gz'
                        echo "Successfully deployed to Staging!"
                    }
                }
            }
        }

        stage('Deploy to Production') {
            when {
                branch 'production'
            }
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'byteplus-server',
                        usernameVariable: 'REMOTE_USER',
                        passwordVariable: 'REMOTE_PASSWORD'
                    )
                ]) {
                    script {
                        def remote = [
                            name:          "byteplus-prod",
                            host:          "101.47.77.78",
                            user:          "${REMOTE_USER}",
                            password:      "${REMOTE_PASSWORD}",
                            port:          22,
                            allowAnyHosts: true
                        ]

                        sshCommand remote: remote, command: 'mkdir -p /opt/azoc-report-webpage'
                        sshPut remote: remote, from: 'h5.tar.gz', into: '/opt/azoc-report-webpage'
                        sshCommand remote: remote, command: 'cd /opt/azoc-report-webpage && if [ -d "h5" ]; then rm -rf h5_bak && mv h5 h5_bak; fi && tar -xzvf h5.tar.gz && rm h5.tar.gz'
                        echo "Successfully deployed to Production!"
                    }
                }
            }
        }
    }

    post {
        always {
            cleanWs()
        }
    }
}
