/**
 * SonarQube / SonarCloud — scanner npm v4 (bootstrapper) + SonarScanner CLI Java.
 *
 * Sur SonarQube **Server** 9.9, le CLI Java exige en pratique un jeton utilisateur comme
 * **sonar.login** (voir message « Please provide a user token in sonar.login »). Seul
 * SONAR_TOKEN ne suffit pas toujours une fois le bootstrapper npm lancé le JRE.
 * On passe donc -Dsonar.login=… via SONAR_SCANNER_OPTS (hérité par le processus Java).
 *
 * URL : SONAR_HOST_URL_OVERRIDE / SONAR_HOST_URL (Jenkins + Docker : host.docker.internal).
 *
 * @see https://docs.sonarsource.com/sonarqube-server/latest/analyzing-source-code/scanners/npm/introduction/
 */
import { spawnSync } from "node:child_process";

const token =
  process.env.SONAR_TOKEN?.trim() ||
  process.env.SONAR_AUTH_TOKEN?.trim();
if (!token) {
  console.error(
    "SONAR_TOKEN (ou SONAR_AUTH_TOKEN) manquant. Jenkins : withSonarQubeEnv + token sur le serveur SonarQube, ou credentials « Secret text » sur le job.",
  );
  process.exit(1);
}

const override =
  process.env.SONAR_HOST_URL_OVERRIDE?.trim() ||
  process.env.SONARQUBE_URL_OVERRIDE?.trim();
const fromEnv =
  process.env.SONAR_HOST_URL?.trim() || process.env.SONARQUBE_HOST?.trim();
const host = override || fromEnv;

const childEnv = { ...process.env };
delete childEnv.SONARQUBE_SCANNER_PARAMS;
// Évite que le CLI Java ignore sonar.login si sonar.token est aussi défini vide / incohérent
delete childEnv.SONAR_TOKEN;
delete childEnv.SONAR_AUTH_TOKEN;
delete childEnv.SONAR_SCANNER_OPTS;

if (host) {
  childEnv.SONAR_HOST_URL = host;
}

// Jeton utilisateur SonarQube : propriété attendue par SonarScanner 6 + SQ 9.9 LTS
childEnv.SONAR_SCANNER_OPTS = `-Dsonar.login=${token}`;

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
