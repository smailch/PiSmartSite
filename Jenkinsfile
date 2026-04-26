/**
 * PiSmartSite — CI monorepo (1 job) : Backend NestJS + Frontend Next.js + smartsite-ai-service (Python)
 *
 * Jenkins : Pipeline from SCM → Script Path = Jenkinsfile (racine du dépôt)
 * Prérequis : agent Linux avec Node.js 20+ et npm sur le PATH, Git, plugins Git + Pipeline.
 * (Option : plugin « NodeJS » + outil « nodejs-22 » — alors tu peux rajouter tools { nodejs 'nodejs-22' }.)
 * Python 3 sur l’agent (python3) pour smartsite-ai-service.
 *
 * Le service IA : installation légère (FastAPI + Uvicorn + multipart) + compileall + import de main.
 * Torch / Ultralytics ne sont pas installés en CI (trop lourds) ; le code reste validé syntaxiquement.
 */
pipeline {
  agent any

  options {
    timestamps()
    buildDiscarder(logRotator(numToKeepStr: '20'))
  }

  environment {
    CI = 'true'
    HUSKY = '0'
    NEXT_TELEMETRY_DISABLED = '1'
    NEXT_PUBLIC_API_URL = "${env.NEXT_PUBLIC_API_URL ?: 'http://127.0.0.1:3200'}"
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Toolchain') {
      steps {
        sh '''
          set -e
          echo ">>> Node / npm (requis sur l’agent si le plugin NodeJS n’est pas installé)"
          node -v
          npm -v
          echo ">>> Python (service IA)"
          command -v python3 >/dev/null 2>&1 && python3 --version || { echo "python3 manquant"; exit 1; }
        '''
      }
    }

    stage('CI — Backend, Frontend, AI service') {
      parallel {
        stage('Backend (NestJS)') {
          environment {
            JEST_JUNIT_OUTPUT_DIR = "${WORKSPACE}/reports/junit/backend"
          }
          steps {
            sh 'mkdir -p reports/junit/backend'
            dir('smartsite-backend') {
              sh 'echo ">>> Backend: npm ci" && npm ci'
              sh 'echo ">>> Backend: tests + coverage (échec = pipeline rouge)" && npm run test:cov:ci'
              sh 'echo ">>> Backend: build" && npm run build'
            }
          }
        }

        stage('Frontend (Next.js)') {
          steps {
            sh 'mkdir -p reports/junit'
            dir('smarsite-frontend') {
              sh 'echo ">>> Frontend: npm ci" && npm ci'
              sh 'echo ">>> Frontend: tests + coverage (échec = pipeline rouge)" && npm run test:cov:ci'
              sh 'echo ">>> Frontend: build" && npm run build'
            }
          }
        }

        stage('AI service (Python / FastAPI)') {
          steps {
            dir('smartsite-ai-service') {
              sh '''
                set -e
                if command -v python3 >/dev/null 2>&1; then PY=python3
                elif command -v python >/dev/null 2>&1; then PY=python
                else echo "Python 3 requis sur l’agent Jenkins pour smartsite-ai-service"; exit 1
                fi
                echo ">>> AI service: venv + dépendances minimales (sans torch — CI rapide)"
                $PY -m venv .venv-ci
                . .venv-ci/bin/activate
                pip install --upgrade pip -q
                pip install -q fastapi==0.104.1 "uvicorn[standard]==0.24.0" python-multipart==0.0.6
                $PY -m compileall -q .
                $PY -c "import main; assert main.app.title == 'SmartSite AI'"
                echo ">>> AI service: OK"
              '''
            }
          }
        }
      }
    }
  }

  post {
    always {
      junit testResults: 'reports/junit/**/*.xml', allowEmptyResults: true
      archiveArtifacts artifacts: 'smartsite-backend/coverage/**/*,smarsite-frontend/coverage/**/*', allowEmptyArchive: true
    }
    success {
      echo 'CI monorepo PiSmartSite : SUCCESS (backend + frontend + smartsite-ai-service).'
    }
    failure {
      echo 'CI monorepo : FAILURE — corriger le stage indiqué en erreur.'
    }
  }
}
