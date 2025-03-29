pipeline {
    agent any
    stages {
        stage('Clone') {
            steps {
                script {
                    echo "Cloning repository..."
                    checkout([
                        $class: 'GitSCM',
                        branches: [[name: '*/main']],
                        userRemoteConfigs: [[
                            credentialsId: 'Sorayut',
                            url: 'https://github.com/SorayutChroenrit/btrader-backend'
                        ]]
                    ])
                    echo "Checkout successful"
                }
            }
        }
        
        stage('Build') {
            steps {
                script {
                    echo "Docker Build Image"
                    sh "/usr/local/bin/docker pull --disable-content-trust=false node:20-alpine"
                    sh "/usr/local/bin/docker build -t btradebackend ."
                    echo "Docker Build Image Success"
                }
                    echo "Docker Image to Running Container"
                    sh "/usr/local/bin/docker rm -f frontend401-run || true"
                    sh "/usr/local/bin/docker run -d --name btradebackend-run -p 20000:3000 btradebackend:latest"
            }
        }
        
        stage('Testing') {
            steps {
                echo "Jenkins Testing"
            }
        }
    }
}