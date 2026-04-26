/**
 * PiSmartSite — CI monorepo (1 job) : Backend NestJS + Frontend Next.js + smartsite-ai-service (Python)
 *
 * Jenkins : Pipeline from SCM → Script Path = Jenkinsfile (racine du dépôt)
 * Prérequis : agent Linux (curl, tar, gzip), Git, plugin Pipeline.
 * Node et Python 3 sont mis en cache sous .ci-tools/ (1 seul stage, téléchargements en parallèle si besoin ;
 * Python = archive « install_only_stripped », plus légère que install_only).
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

    stage('Bootstrap toolchain') {
      steps {
        sh '''
          set -e
          mkdir -p "${WORKSPACE}/.ci-tools"
          WS="${WORKSPACE}"
          DEST_NODE="${WS}/.ci-tools/node"
          PY_ROOT="${WS}/.ci-tools/python"

          NEED_NODE=0
          if command -v node >/dev/null 2>&1; then
            echo ">>> Node système: $(command -v node) ($(node -v))"
          elif [ -x "${DEST_NODE}/bin/node" ]; then
            echo ">>> Node déjà en cache workspace"
          else
            NEED_NODE=1
          fi

          NEED_PY=0
          if command -v python3 >/dev/null 2>&1; then
            echo ">>> Python système: $(command -v python3) ($(python3 --version))"
          elif [ -x "${PY_ROOT}/bin/python3" ] || [ -x "${PY_ROOT}/bin/python3.11" ]; then
            echo ">>> Python déjà en cache workspace"
          else
            NEED_PY=1
          fi

          NODE_TMP=""
          PY_TMP=""
          if [ "$NEED_NODE" -eq 1 ] || [ "$NEED_PY" -eq 1 ]; then
            echo ">>> Téléchargements (en parallèle si les deux manquent) — premier run plus long, puis cache .ci-tools/"
          fi
          if [ "$NEED_NODE" -eq 1 ]; then
            NODE_VER=22.12.0
            ARCH=x64
            case "$(uname -m)" in aarch64|arm64) ARCH=arm64 ;; esac
            NODE_TMP="/tmp/node-ci-$$.tar.gz"
            echo ">>> curl Node ${NODE_VER} linux-${ARCH}"
            curl -fsSL "https://nodejs.org/dist/v${NODE_VER}/node-v${NODE_VER}-linux-${ARCH}.tar.gz" -o "${NODE_TMP}" &
          fi
          if [ "$NEED_PY" -eq 1 ]; then
            REL=20260414
            VER=3.11.15
            TRIP=x86_64-unknown-linux-gnu
            case "$(uname -m)" in aarch64|arm64) TRIP=aarch64-unknown-linux-gnu ;; esac
            NAME="cpython-${VER}+${REL}-${TRIP}-install_only_stripped.tar.gz"
            URL="https://github.com/astral-sh/python-build-standalone/releases/download/${REL}/${NAME}"
            PY_TMP="/tmp/py-ci-$$.tar.gz"
            echo ">>> curl Python ${VER} stripped (${TRIP})"
            curl -fsSL "${URL}" -o "${PY_TMP}" &
          fi
          if [ "$NEED_NODE" -eq 1 ] || [ "$NEED_PY" -eq 1 ]; then
            wait || exit 1
          fi

          if [ -n "$NODE_TMP" ]; then
            rm -rf "${DEST_NODE}"
            mkdir -p "${DEST_NODE}"
            tar -xzf "${NODE_TMP}" -C "${DEST_NODE}" --strip-components=1
            rm -f "${NODE_TMP}"
            echo ">>> Node extrait dans ${DEST_NODE}"
          fi
          if [ -n "$PY_TMP" ]; then
            rm -rf "${PY_ROOT}"
            tar -xzf "${PY_TMP}" -C "${WS}/.ci-tools"
            rm -f "${PY_TMP}"
            echo ">>> Python extrait sous .ci-tools/python"
          fi

          if [ -x "${PY_ROOT}/bin/python3.11" ] && [ ! -x "${PY_ROOT}/bin/python3" ]; then
            ln -sf python3.11 "${PY_ROOT}/bin/python3"
          fi
          if [ -x "${PY_ROOT}/bin/python3" ]; then
            "${PY_ROOT}/bin/python3" --version
          fi
        '''
        script {
          def extra = []
          if (fileExists('.ci-tools/python/bin/python3') || fileExists('.ci-tools/python/bin/python3.11')) {
            extra.add("${env.WORKSPACE}/.ci-tools/python/bin")
          }
          if (fileExists('.ci-tools/node/bin/node')) {
            extra.add("${env.WORKSPACE}/.ci-tools/node/bin")
          }
          if (!extra.isEmpty()) {
            env.PATH = extra.join(':') + ':' + env.PATH
          }
        }
      }
    }

    stage('Toolchain') {
      steps {
        sh '''
          set -e
          echo ">>> Node / npm"
          node -v
          npm -v
          echo ">>> Python (service IA)"
          command -v python3 >/dev/null 2>&1 && python3 --version || { echo "python3 manquant sur l’agent"; exit 1; }
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
