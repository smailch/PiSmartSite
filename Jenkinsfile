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
 *
 * SonarQube (après les tests) : fusion LCOV → analyse via plugin Jenkins → Quality Gate.
 * Par défaut le QG est informatif : waitForQualityGate avec abortPipeline=false (build SUCCESS même si
 * Sonar affiche QG ERROR). Pour bloquer le build sur QG : variable de job SONAR_QUALITYGATE_ENFORCE=true.
 * Le stage « SonarQube — analyse » affiche EXECUTION SUCCESS dès que le CLI a fini ; le stage suivant
 * « Quality Gate » appelle waitForQualityGate : Jenkins attend que le *serveur* SonarQube termine le traitement
 * du rapport (tâche CE « IN_PROGRESS » dans les logs API), puis l’évaluation du Quality Gate — souvent 1 à 5 min
 * selon charge CPU/ES et taille du projet, ce n’est pas un blocage Jenkins arbitraire.
 * Webhook SonarQube → Jenkins (doc plugin) : évite uniquement la latence de sondage, pas la durée du CE.
 * Timeout Quality Gate : variable de job SONAR_QUALITYGATE_TIMEOUT_MINUTES (défaut 45). Un monorepo sous
 * SonarQube en Docker peu RAM peut dépasser 15 min de traitement CE ; augmenter ou dimensionner le serveur.
 * Jenkins : installer « SonarQube Scanner » ; Administration → SonarQube → serveur nommé exactement « SonarQube »
 * (ou adapter withSonarQubeEnv ci-dessous). Voir docs/JENKINS-CI-CD.md.
 *
 * SonarQube + Jenkins en Docker : l’URL du serveur ne doit pas être http://localhost:9000 côté agent.
 * Sur le job, définir SONAR_HOST_URL_OVERRIDE (ex. http://host.docker.internal:9000) ou mettre la même URL
 * dans Manage Jenkins → System → SonarQube servers (joignable depuis le conteneur).
 *
 * Sonar analyse : credential Jenkins « Secret text » id **sonar-token** (jeton utilisateur SonarQube).
 * Variable de job optionnelle SONAR_TOKEN_CREDENTIAL_ID si tu utilises un autre id.
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
    SONAR_HOST_URL_OVERRIDE = "${env.SONAR_HOST_URL_OVERRIDE ?: ''}"
    /** Attente waitForQualityGate (minutes). Défaut 45 : le CE SonarQube peut être lent (Docker / gros rapport). */
    SONAR_QUALITYGATE_TIMEOUT_MINUTES = "${env.SONAR_QUALITYGATE_TIMEOUT_MINUTES ?: '45'}"
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

    stage('SonarQube — fusion LCOV') {
      steps {
        sh '''
          set -e
          echo ">>> Fusion smartsite-backend + smarsite-frontend → coverage/lcov.info (sonar-project.properties)"
          node scripts/sonar-prep-lcov.mjs
        '''
      }
    }

    stage('SonarQube — analyse') {
      steps {
        withCredentials([
          string(
            credentialsId: "${env.SONAR_TOKEN_CREDENTIAL_ID ?: 'sonar-token'}",
            variable: 'SONAR_TOKEN',
          ),
        ]) {
          withSonarQubeEnv('SonarQube') {
            sh '''
              set -e
              echo ">>> Scanner monorepo (sonar-project.properties — auth via SONAR_SCANNER_JSON_PARAMS + SONAR_TOKEN)"
              node scripts/sonar-scan.mjs
            '''
          }
        }
      }
    }

    stage('SonarQube — Quality Gate') {
      steps {
        echo """
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Quality Gate : attente du SERVEUR SonarQube (Compute Engine)
Après « ANALYSIS SUCCESS » du scanner, le rapport est traité côté serveur
(IN_PROGRESS → SUCCESS). Monorepo / instance Docker peu dimensionnée :
souvent 5–30 min. Timeout Jenkins : ${env.SONAR_QUALITYGATE_TIMEOUT_MINUTES} min
(override : variable de job SONAR_QUALITYGATE_TIMEOUT_MINUTES).
Si IN_PROGRESS dépasse systématiquement ce délai : vérifier RAM/CPU SonarQube,
file d’attente CE (Administration → Projects → Background Tasks).
Par défaut un QG « ERROR » sur Sonar ne fait pas échouer le build Jenkins.
Pour bloquer : SONAR_QUALITYGATE_ENFORCE=true sur le job.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""
        script {
          def enforceQg = (env.SONAR_QUALITYGATE_ENFORCE ?: '').trim().equalsIgnoreCase('true')
          echo "SONAR_QUALITYGATE_ENFORCE=${enforceQg} → waitForQualityGate abortPipeline=${enforceQg}"
          timeout(time: "${env.SONAR_QUALITYGATE_TIMEOUT_MINUTES}".toInteger(), unit: 'MINUTES') {
            def qg = waitForQualityGate abortPipeline: enforceQg
            echo "Résultat Quality Gate SonarQube : ${qg.status} (dashboard Sonar pour le détail)"
          }
        }
      }
    }
  }

  post {
    always {
      junit testResults: 'reports/junit/**/*.xml', allowEmptyResults: true
      archiveArtifacts artifacts: 'smartsite-backend/coverage/**/*,smarsite-frontend/coverage/**/*,coverage/lcov.info', allowEmptyArchive: true
    }
    success {
      echo 'PiSmartSite : pipeline OK (tests + analyse SonarQube poussée ; QG peut être ERROR sans faire échouer le build sauf SONAR_QUALITYGATE_ENFORCE=true).'
    }
    failure {
      echo 'CI monorepo : FAILURE — corriger le stage indiqué en erreur.'
    }
  }
}
