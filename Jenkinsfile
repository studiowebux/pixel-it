pipeline {
    agent any

    stages {
        stage('Build') {
            steps {
                echo 'Building..'
                sshagent(credentials: ['webuxlab-blog']) {
                    withCredentials([string(credentialsId: 'webuxlab-blog-ssh', variable: 'SSHINFO')]) {
                        sh "scp -v -r -o StrictHostKeyChecking=no ./* ${SSHINFO}:/srv/pixel-it/"
                        sh "ssh -o StrictHostKeyChecking=no $SSHINFO 'pushd /srv/pixel-it; docker compose build; popd;'"
                    }
                }
            }
        }
        stage('Deploy') {
            steps {
                echo 'Deploying....'
                sshagent(credentials: ['webuxlab-blog']) {
                    withCredentials([string(credentialsId: 'webuxlab-blog-ssh', variable: 'SSHINFO')]) {
                        sh "ssh -o StrictHostKeyChecking=no $SSHINFO 'pushd /srv/pixel-it; docker compose up -d; popd;'"
                    }
                }
            }
        }
    }
}
