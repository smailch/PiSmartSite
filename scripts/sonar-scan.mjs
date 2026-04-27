/**
 * SonarQube / SonarCloud — scanner npm v4 (@sonar/scan / sonarqube-scanner).
 * Le CLI n’accepte plus les arguments -D… en ligne de commande : utiliser l’environnement.
 * @see https://docs.sonarsource.com/sonarqube-server/latest/analyzing-source-code/scanners/npm/introduction/
 */
import { spawnSync } from "node:child_process";

const token =
  process.env.SONAR_TOKEN?.trim() ||
  process.env.SONAR_AUTH_TOKEN?.trim();
if (!token) {
  console.error(
    "SONAR_TOKEN (ou SONAR_AUTH_TOKEN) manquant. Jenkins : withSonarQubeEnv injecte SONAR_AUTH_TOKEN.",
  );
  process.exit(1);
}

const host =
  process.env.SONAR_HOST_URL?.trim() ||
  process.env.SONARQUBE_HOST?.trim();

const childEnv = {
  ...process.env,
  SONAR_TOKEN: token,
};
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
