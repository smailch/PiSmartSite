/**
 * SonarQube — lancement du scanner npm v4 (bootstrapper + CLI Java).
 *
 * Authentification : le bootstrapper transmet les paramètres au JVM via
 * SONAR_SCANNER_JSON_PARAMS (doc SonarSource), pas via SONAR_SCANNER_OPTS seul.
 * @see https://docs.sonarsource.com/sonarqube-server/latest/analyzing-source-code/scanners/npm/configuring
 *
 * Jenkins : utiliser withCredentials (Secret text) pour SONAR_TOKEN — withSonarQubeEnv
 * fournit surtout SONAR_HOST_URL ; le jeton du bloc « SonarQube servers » n’est pas
 * toujours exposé à node scripts/sonar-scan.mjs.
 *
 * URL : SONAR_HOST_URL_OVERRIDE > SONAR_HOST_URL (withSonarQubeEnv).
 */
import { spawnSync } from "node:child_process";

const token =
  process.env.SONAR_TOKEN?.trim() ||
  process.env.SONAR_AUTH_TOKEN?.trim();
if (!token) {
  console.error(
    "SONAR_TOKEN ou SONAR_AUTH_TOKEN manquant.\n" +
      "Jenkins : ajouter withCredentials(credentialsId: 'sonar-token', variable: 'SONAR_TOKEN') " +
      "autour de l’étape (Secret text = jet utilisateur SonarQube, voir Jenkinsfile + docs).",
  );
  process.exit(1);
}

const override =
  process.env.SONAR_HOST_URL_OVERRIDE?.trim() ||
  process.env.SONARQUBE_URL_OVERRIDE?.trim();
const fromEnv =
  process.env.SONAR_HOST_URL?.trim() || process.env.SONARQUBE_HOST?.trim();
const host = override || fromEnv;

// SonarQube 9.9 LTS : le jeton utilisateur / analyse se passe dans sonar.login
// (laisser sonar.password vide). sonar.token seul peut être ignoré par le CLI →
// « Not authorized » dès le chargement des réglages.
// Ne pas laisser SONAR_TOKEN dans l’env du processus enfant : le bootstrapper npm
// injecterait aussi sonar.token ; les deux propriétés ensemble déclenchent des
// avertissements et un comportement imprévisible selon les versions.
const jsonParams = {
  "sonar.login": token,
};
if (host) {
  jsonParams["sonar.host.url"] = host;
}

const childEnv = { ...process.env };
delete childEnv.SONARQUBE_SCANNER_PARAMS;
delete childEnv.SONAR_SCANNER_JSON_PARAMS;
delete childEnv.SONAR_SCANNER_OPTS;
delete childEnv.SONAR_TOKEN;
delete childEnv.SONAR_AUTH_TOKEN;

childEnv.SONAR_SCANNER_JSON_PARAMS = JSON.stringify(jsonParams);

if (host) {
  childEnv.SONAR_HOST_URL = host;
}

const isWin = process.platform === "win32";
const res = spawnSync(isWin ? "npx.cmd" : "npx", ["-y", "sonarqube-scanner"], {
  stdio: "inherit",
  env: childEnv,
  shell: isWin,
});

if (res.error) {
  console.error(res.error);
  process.exit(1);
}
process.exit(res.status === null ? 1 : res.status ?? 1);
