# Atelier Kubernetes — étape par étape

Ne passe à l’étape suivante **que** quand la vérification « ✅ » est OK.  
Les commandes détaillées et le contexte : **`README.md`** (même dossier).

---

## Étape 1 — Machines VMware + Ubuntu

### Objectif

Trois VM distinctes avec **Ubuntu Server 24.04 LTS**, des **noms** clairs et des **IP** notées pour la suite (Kubernetes, NodePort, navigateur).

### Avant de commencer

- Télécharge l’ISO **Ubuntu Server 24.04 LTS** : [https://ubuntu.com/download/server](https://ubuntu.com/download/server) (fichier `.iso`).
- VMware **Workstation Pro** (ou équivalent du cours) installé sur ta machine hôte (Windows).

### A) Créer une VM dans VMware (répéter 3 fois)

1. **File → New Virtual Machine** (ou *Créer une machine virtuelle*).
2. Choisir **Typical (recommended)** → Next.
3. **Installer disc image (iso)** → sélectionner l’ISO Ubuntu Server 24.04 → Next.
4. **Guest operating system** : **Linux**, version **Ubuntu 64-bit** → Next.
5. **Virtual machine name** : pour la 1ʳᵉ VM mets par ex. `master-node` (pour les autres : `worker-node-1`, `worker-node-2`). Le dossier peut rester proposé par VMware → Next.
6. **Disk** : au moins **30 Go** (20 Go mini possible mais serré) → cocher *Store virtual disk as a single file* si proposé → Next.
7. **Customize Hardware** (important) :
   - **Memory** : **4096 Mo** (4 Go) minimum pour Kubernetes ; 2 Go est trop juste pour le master.
   - **Processors** : **2** processeurs (ou 2 cœurs selon l’interface).
   - **Network adapter** : voir section **Réseau** ci‑dessous.
   - **CD/DVD** : doit pointer sur l’ISO Ubuntu (pour l’installation).
8. **Finish**, puis **Power on** la VM.

### B) Réseau VMware : Bridged ou Host-only

À décider **une fois pour tout le groupe** (toutes les VM sur le même mode).

| Mode | Idée | Quand le choisir |
|------|------|------------------|
| **Bridged** | La VM a une IP sur le **même réseau** que ta carte Wi‑Fi/Ethernet (comme un PC de plus). | Accès facile depuis ton PC, Internet, parfois simple pour que tout le monde se voie si le réseau du labo le permet. |
| **Host-only** | Les VM parlent entre elles et avec l’**hôte** ; souvent **sans** Internet direct selon la config VMware. | Réseau **fermé** de groupe : tout le monde crée le **même** réseau host-only (même nom / même segment) pour que les 9 VM du groupe (3×3) se pingent. |

**Où régler ça** : *Virtual Machine Settings* → *Network Adapter* → **Bridged** ou **Host-only** (et choisir le bon réseau host-only VMware si plusieurs).

### C) Installation Ubuntu Server (sur chaque VM, au premier démarrage)

1. Langue / clavier : selon ton choix (FR si besoin).
2. **Type** : *Ubuntu Server* (pas Desktop).
3. **Réseau** : laisser DHCP en général ; note l’IP affichée si l’installateur la montre.
4. **Proxy** : vide sauf consigne école.
5. **Disque** : utiliser le disque entier, confirmer l’écriture.
6. **Profil** : ton nom, nom de machine (**hostname**) :
   - VM 1 : `master-node`
   - VM 2 : `worker-node-1`
   - VM 3 : `worker-node-2`  
   (Exactement ces noms simplifient les tutos ; sinon note les noms réels pour `kubectl label node …`.)
7. **SSH** : **cocher Install OpenSSH server** (indispensable pour te connecter depuis Windows avec `ssh`).
8. **Snaps** : aucun obligatoire pour l’atelier ; tu peux tout décocher pour aller plus vite.
9. Laisser l’installation finir → **Reboot** ; si VMware demande, démonte l’ISO du lecteur CD si le reboot boucle sur l’installateur.

### D) Récupérer les IP et les noter

Sur **chaque** VM (console VMware ou après SSH) :

```bash
ip -brief address
# ou
hostname -I
```

Note pour le groupe un tableau du type :

| VM | Hostname | IP |
|----|----------|-----|
| Control plane | master-node | ex. 192.168.x.10 |
| Worker 1 | worker-node-1 | ex. 192.168.x.11 |
| Worker 2 | worker-node-2 | ex. 192.168.x.12 |

### E) Se connecter en SSH depuis Windows (optionnel mais recommandé)

Dans **PowerShell** sur ton PC :

```powershell
ssh ton_utilisateur@192.168.x.10
```

(Remplace par l’IP et l’utilisateur créé à l’installation.)

### Vérification ✅

Sur les **3** VM :

```bash
lsb_release -a
```

Tu dois voir **Ubuntu 24.04** (ex. *24.04 LTS*, *noble*).

**Ensuite** → Étape 2.

---

## Étape 2 — Désactiver le swap (sur les 3 VM)

**À faire** (répéter sur **chaque** VM) :

```bash
sudo swapoff -a
sudo sed -i '/ swap / s/^/#/' /etc/fstab
```

**Vérification ✅**
- `free -h` → ligne **Swap** à **0** (ou proche).

**Ensuite** → Étape 3.

---

## Étape 3 — Modules noyau + sysctl (sur les 3 VM)

**À faire** : blocs **2.1** du `README.md` (modules `overlay`, `br_netfilter` + `sysctl`).

**Vérification ✅**
- Pas d’erreur au `sudo sysctl --system`.

**Ensuite** → Étape 4.

---

## Étape 4 — containerd + cgroup systemd (sur les 3 VM)

**À faire** : bloc **2.2** du `README.md` (installer containerd, `SystemdCgroup = true`, redémarrer le service).

**Vérification ✅**
- `systemctl is-active containerd` → **active**.

**Ensuite** → Étape 5.

---

## Étape 5 — kubeadm, kubelet, kubectl (sur les 3 VM)

**À faire** : bloc **2.3** du `README.md` (dépôt Kubernetes, install, `apt-mark hold`, `enable --now kubelet`).

**Vérification ✅**
- `kubeadm version` et `kubectl version --client` fonctionnent (kubelet peut encore « attendre » le cluster, c’est normal).

**Ensuite** → Étape 6.

---

## Étape 6 — Initialiser le cluster (master uniquement)

**À faire** : sur **master-node** seulement — `kubeadm init --pod-network-cidr=10.244.0.0/16`, puis copier `admin.conf` vers `~/.kube/config` (voir **§3.1** du `README.md`).

**Vérification ✅**
- `kubectl get nodes` sur le master → au moins **un** nœud (souvent **NotReady** tant qu’il n’y a pas de CNI — normal).

**Ensuite** → Étape 7.

---

## Étape 7 — Installer Calico (master)

**À faire** : `kubectl apply -f` l’URL Calico du `README.md`.

**Vérification ✅**
- Après 1–3 min : `kubectl get nodes` → master **Ready** (souvent).

**Ensuite** → Étape 8.

---

## Étape 8 — Joindre les workers

**À faire** : sur le master, `kubeadm token create --print-join-command` ; exécuter la commande avec **sudo** sur **worker-node-1** puis **worker-node-2**.

**Vérification ✅**
- `kubectl get nodes` → **3** nœuds **Ready**.

**Ensuite** → Étape 9.

---

## Étape 9 — Vérification cluster

**À faire** :

```bash
kubectl get nodes
kubectl get pods -A
```

**Vérification ✅**
- Tous les nœuds **Ready**.
- Pods système / Calico en **Running** (pas de boucle d’erreurs évidente).

**Ensuite** → Étape 10.

---

## Étape 10 — Préparer MongoDB sur un worker

**À faire**
- Choisir **un** worker (ex. `worker-node-1`).
- Sur **cette** VM : `sudo mkdir -p /data/pismartsite/mongo`
- Sur le **master** : `kubectl label node <nom-exact-du-nœud> pismartsite-mongo=true --overwrite`  
  (`kubectl get nodes` pour le nom exact.)

**Vérification ✅**
- `kubectl get node <nom> --show-labels` → présence de `pismartsite-mongo=true`.

**Ensuite** → Étape 11.

---

## Étape 11 — Construire les images Docker (machine de build)

**À faire**
- Sur une machine avec le dépôt + Docker : construire **backend** et **frontend** (voir **§5.0** du `README.md`).
- Définir `API_PUBLIC=http://<IP-nœud>:30320` avec une **vraie** IP de ton cluster.

**Vérification ✅**
- `docker images` montre `pismartsite-backend:latest` et `pismartsite-frontend:latest`.

**Ensuite** → Étape 12.

---

## Étape 12 — Charger les images sur les nœuds

**À faire**
- `docker save` + `ssh … docker load` (ou registry partagé) pour que **chaque** nœud qui peut exécuter les pods ait les **deux** images.

**Vérification ✅**
- Sur un worker : `docker images | grep pismartsite` (si Docker présent) ou méthode **ctr** vue en cours.

**Ensuite** → Étape 13.

---

## Étape 13 — CORS + Mongo (YAML)

**À faire**
- Ouvrir `k8s/backend-deployment.yaml` : adapter **`CORS_ORIGINS`** avec l’URL du frontend, ex. `http://<IP>:30080`.
- Si tu utilises **MongoDB Atlas** au lieu du Mongo du cluster : adapter **`MONGODB_URI`** (voir commentaires dans le YAML).

**Vérification ✅**
- Fichier sauvegardé ; le groupe utilise la **même** config ou documente les différences.

**Ensuite** → Étape 14.

---

## Étape 14 — Déployer l’application

**À faire** (depuis la racine du dépôt, avec `kubectl` pointant sur le cluster) :

```bash
kubectl apply -f k8s/db-pv.yaml
kubectl apply -f k8s/db-pvc.yaml
kubectl apply -f k8s/db-deployment.yaml
kubectl apply -f k8s/backend-service.yaml
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-service.yaml
kubectl apply -f k8s/frontend-deployment.yaml
```

**Vérification ✅**
- `kubectl get pods` → pods **Running** (attendre le `pull` / démarrage si besoin).
- `kubectl get svc` → services présents.

**Ensuite** → Étape 15.

---

## Étape 15 — Tester dans le navigateur

**À faire**
- Ouvrir `http://<IP-d’un-nœud>:30080` (frontend).
- Vérifier que l’API répond : `http://<IP-d’un-nœud>:30320` (ex. racine ou endpoint connu).

**Vérification ✅**
- UI chargée ; pas d’erreur CORS évidente dans la console du navigateur.

**Ensuite** → Étape 16.

---

## Étape 16 — Collaboration

**À faire**
- Partager le **kubeconfig** (fichier sécurisé).
- Aligner les versions (Ubuntu, Kubernetes, Calico) ; noter les IP du groupe.

**Vérification ✅**
- Un autre membre peut utiliser `kubectl` et voir le même cluster.

---

## Fin de l’atelier

- Cluster distribué **Ready**, application **déployée**, accès **NodePort** OK.
