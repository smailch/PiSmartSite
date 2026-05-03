# Atelier PiSmartSite — Kubernetes (kubeadm) sur VMware

Guide de groupe : **Ubuntu 24.04 LTS**, **VMware Workstation**, cluster **kubeadm**, manifests dans `k8s/`.

## Où vous en êtes ? (ordre obligatoire)

| Étape | Contenu | Critère « OK » |
|-------|---------|----------------|
| **1** | 3 VM + swap off | SSH sur les 3 machines, `free -h` sans swap |
| **2** | containerd + kubeadm/kubelet/kubectl | `kubeadm version` sur chaque VM |
| **3** | `kubeadm init`, Calico, `kubeadm join` | `kubectl get nodes` → 3 nœuds |
| **4** | Vérification cluster | Tous les nœuds **Ready**, pods système **Running** |
| **5** | Images + manifests PiSmartSite | Pods app **Running**, UI/API joignables |
| **6** | Structure `k8s/` | Fichiers listés ci‑dessous présents dans le dépôt |
| **7** | Collaboration | Même stack, `kubeconfig` partagé, ce README à jour |

---

## 1. Environnement VMware (obligatoire)

Créer **3 VM** identiques pour tout le groupe :

| VM | Rôle | Minimum |
|----|------|---------|
| `master-node` | Control plane | 2 vCPU, 4 Go RAM |
| `worker-node-1` | Worker | 2 vCPU, 4 Go RAM |
| `worker-node-2` | Worker | 2 vCPU, 4 Go RAM |

- **OS** : Ubuntu **Server** 24.04 LTS sur chaque VM.
- **Réseau** : *Bridged* ou *Host-only* (réseau privé commun). **Noter les IP** (ex. master `192.168.56.10`, workers `.11` / `.12`).
- **Noms** : cohérents avec `kubectl get nodes` (ou ajuster les commandes `kubectl label node …` plus bas).

**Désactiver le swap** sur **chaque** VM :

```bash
sudo swapoff -a
sudo sed -i '/ swap / s/^/#/' /etc/fstab
```

---

## 2. Installation Kubernetes (toutes les VM)

### 2.1 Modules noyau et sysctl

```bash
cat <<'EOF' | sudo tee /etc/modules-load.d/k8s.conf
overlay
br_netfilter
EOF

sudo modprobe overlay
sudo modprobe br_netfilter

cat <<'EOF' | sudo tee /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
EOF

sudo sysctl --system
```

### 2.2 containerd + driver cgroup **systemd**

```bash
sudo apt-get update
sudo apt-get install -y containerd
sudo mkdir -p /etc/containerd
containerd config default | sudo tee /etc/containerd/config.toml
sudo sed -i 's/SystemdCgroup = false/SystemdCgroup = true/' /etc/containerd/config.toml
sudo systemctl restart containerd
sudo systemctl enable containerd
```

### 2.3 kubeadm, kubelet, kubectl

**Tout le groupe utilise la même série** (ex. `v1.30`). Remplacer `1.30` partout si votre enseignant impose une autre version.

```bash
sudo apt-get install -y apt-transport-https ca-certificates curl gpg
curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.30/deb/Release.key | sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
echo "deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.30/deb/ /" | sudo tee /etc/apt/sources.list.d/kubernetes.list
sudo apt-get update
sudo apt-get install -y kubelet kubeadm kubectl
sudo apt-mark hold kubelet kubeadm kubectl
sudo systemctl enable --now kubelet
```

---

## 3. Initialisation du cluster

### 3.1 Sur **master-node** uniquement

```bash
sudo kubeadm init --pod-network-cidr=10.244.0.0/16
```

Configurer **kubectl** pour l’utilisateur non root :

```bash
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config
```

### 3.2 CNI **Calico** (recommandé)

```bash
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.3/manifests/calico.yaml
```

Attendre que le master soit **Ready** : `kubectl get nodes`.

### 3.3 Rejoindre les workers

Sur le master, afficher la commande de jointure :

```bash
kubeadm token create --print-join-command
```

Sur **worker-node-1** et **worker-node-2**, exécuter cette commande **avec `sudo`**.

---

## 4. Vérification (résultat attendu : nœuds READY)

```bash
kubectl get nodes
kubectl get pods -A
```

- Les **3** nœuds doivent être **Ready**.
- Les pods des namespaces `kube-system`, `calico-system` (ou équivalent) doivent être **Running** (quelques `Completed` possibles).

---

## 5. Déploiement de l’application PiSmartSite

### 5.0 Prérequis : images sur les nœuds

Les manifests utilisent `pismartsite-backend:latest` et `pismartsite-frontend:latest` avec `imagePullPolicy: IfNotPresent`.  
Il faut **construire** les images et les rendre disponibles sur les nœuds qui exécuteront les pods (ou utiliser un **registry** Docker Hub / GitLab / etc.).

Exemple **sans registry** (depuis une machine avec le dépôt + Docker) :

```bash
# Remplacer par une IP réelle d’un nœud (NodePort backend 30320).
export API_PUBLIC=http://192.168.56.11:30320

cd smartsite-backend
docker build -t pismartsite-backend:latest .

cd ../smartsite-frontend
docker build --build-arg NEXT_PUBLIC_API_URL="$API_PUBLIC" -t pismartsite-frontend:latest .
```

Puis **charger** sur chaque worker (et le master si des pods peuvent y tourner), par ex. :

```bash
docker save pismartsite-backend:latest | ssh user@worker-node-1 docker load
docker save pismartsite-frontend:latest | ssh user@worker-node-1 docker load
# Répéter pour les autres nœuds concernés.
```

> Si les nœuds n’ont **pas** Docker mais **containerd** : utiliser `ctr -n k8s.io images import …` ou la méthode vue en cours.

### 5.1 MongoDB (PV local + label nœud)

Sur le worker qui stockera les données :

```bash
sudo mkdir -p /data/pismartsite/mongo
```

Sur le master (`kubectl`), le nom du nœud doit correspondre à `kubectl get nodes` :

```bash
kubectl label node worker-node-1 pismartsite-mongo=true --overwrite
```

### 5.2 Backend : MongoDB dans le cluster + CORS

Les YAML utilisent **MongoDB dans le cluster** (`mongodb://mongodb:27017/smartsite`).  
Pour **MongoDB Atlas**, remplacer `MONGODB_URI` dans `backend-deployment.yaml` ou utiliser un **Secret** (voir commentaires dans le fichier).

Adapter **`CORS_ORIGINS`** dans `backend-deployment.yaml` avec l’URL réelle du frontend pour le navigateur, ex. :

`http://192.168.56.11:30080`

### 5.3 Appliquer les manifests (ordre recommandé)

Depuis la racine du dépôt (où se trouve le dossier `k8s/`) :

```bash
kubectl apply -f k8s/db-pv.yaml
kubectl apply -f k8s/db-pvc.yaml
kubectl apply -f k8s/db-deployment.yaml
kubectl apply -f k8s/backend-service.yaml
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-service.yaml
kubectl apply -f k8s/frontend-deployment.yaml
```

Vérifier :

```bash
kubectl get pods
kubectl get svc
```

**Accès** (NodePort) :

- Frontend : `http://<IP_D_UN_NŒUD>:30080`
- API : `http://<IP_D_UN_NŒUD>:30320`

**Services** : ClusterIP interne (`backend`, `mongodb`) + NodePort (`frontend`, `backend-nodeport`).

### 5.4 Service IA (optionnel — hors liste minimale)

Le dépôt contient `smartsite-ai-service` (Python). Pour l’intégrer au cluster : ajouter un `Deployment` + `Service` et renseigner `AI_ANALYSIS_URL` sur le backend (URL interne du Service, ex. `http://ai-service:8001/...`). Non requis pour valider l’atelier de base.

---

## 6. Structure projet (`/k8s`)

| Fichier | Rôle |
|---------|------|
| `db-pv.yaml` | Volume persistant local MongoDB |
| `db-pvc.yaml` | Réclamation PVC |
| `db-deployment.yaml` | Déploiement MongoDB + Service ClusterIP |
| `backend-deployment.yaml` | NestJS (port 3200) |
| `backend-service.yaml` | ClusterIP + NodePort **30320** |
| `frontend-deployment.yaml` | Next.js (port 3000) |
| `frontend-service.yaml` | NodePort **30080** |

---

## 7. Collaboration groupe

- **VMware** : mêmes réglages (RAM, CPU, type de réseau).
- **Ubuntu** : même version **24.04 LTS**.
- **Kubernetes** : même version `kubeadm` / `kubelet` / `kubectl`, même CNI Calico.
- **kubeconfig** : copie sécurisée de `~/.kube/config` du master ; chaque membre pointe `server:` vers l’**IP du master:6443**.
- **Documentation** : consigner les IP du groupe, les écarts éventuels (noms de nœuds, registry utilisé) dans un document de groupe ou une issue.

---

## Résultat final attendu

- Cluster **kubeadm** fonctionnel, **3 nœuds Ready**.
- **`kubectl get pods -A`** : pods système + application **Running** (ou stabilisation après pull d’images).
- **Application accessible** depuis le réseau du labo (NodePorts **30080** / **30320**).
- Architecture **réellement distribuée** (control plane + 2 workers).

---

## Dépannage rapide

| Symptôme | Piste |
|----------|--------|
| Nœud **NotReady** | CNI pas prêt ; `kubectl get pods -n kube-system` |
| Mongo **Pending** | Label `pismartsite-mongo` ou répertoire `/data/pismartsite/mongo` |
| **ImagePullBackOff** | Image absente sur le nœud ou mauvais nom de tag |
| **CrashLoop** backend | `MONGODB_URI` / Service `mongodb` ; `kubectl logs deploy/backend` |
| Frontend sans API | Rebuild frontend avec le bon `NEXT_PUBLIC_API_URL` ; CORS sur le backend |
