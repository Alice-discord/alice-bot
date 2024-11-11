pipeline {
    agent any

    stages {
        stage('Build') {
            steps {
                echo 'Building..',
                sh 'npm install'
            }
        }
        stage('Test') {
            steps {
                echo 'Testing..',
                sh 'node ./src/index.js'
            }
        }
        stage('Deploy') {
            steps {
                echo 'Deploying....',
                sh 'npm start'
            }
        }
    }
}