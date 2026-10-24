# Septaris — Foundry VTT

> Implémentation du système de jeu de rôle **Septaris** pour **Foundry Virtual Tabletop**.

![Foundry VTT](https://img.shields.io/badge/Foundry%20VTT-v14-informational)
![GitHub Release](https://img.shields.io/github/v/release/Nendran/septaris-foundryvtt?display_name=tag)
![CI](https://github.com/Nendran/septaris-foundryvtt/actions/workflows/ci.yml/badge.svg)
![License](https://img.shields.io/github/license/Nendran/septaris-foundryvtt)

---

## À propos

**Septaris** est un système de jeu de rôle conçu pour être indépendant d'un univers ou d'un cadre de campagne particulier.

Ce dépôt contient son implémentation pour **Foundry VTT**.

Le système Foundry est actuellement en développement actif. Certaines fonctionnalités peuvent être incomplètes, évoluer rapidement ou comporter des changements incompatibles entre deux versions.

---

## Installation

### Depuis le manifest Foundry

Dans Foundry VTT :

1. Ouvrez **Game Systems**.
2. Cliquez sur **Install System**.
3. Dans le champ **Manifest URL**, saisissez :

```text
https://github.com/Nendran/septaris-foundryvtt/releases/latest/download/system.json
```

4. Cliquez sur **Install**.

Foundry permet l'installation d'un système non présent dans son catalogue officiel à partir de l'URL de son manifest `system.json`.

### Installation manuelle

Téléchargez `septaris.zip` depuis la dernière release GitHub.

Décompressez ensuite son contenu dans :

```text
FoundryVTT/Data/systems/septaris/
```

Puis redémarrez Foundry VTT.

---

## État du projet

Septaris Foundry VTT est actuellement en **développement précoce**.

L'objectif est d'intégrer progressivement les éléments nécessaires à une partie de Septaris directement dans Foundry :

- fiches de personnages ;
- caractéristiques et compétences ;
- jets de dés ;
- gestion des conflits ;
- objets et équipements ;
- effets et ressources ;
- automatisations propres aux règles de Septaris ;
- outils destinés au MJ.

Le périmètre évoluera avec le développement du système de jeu et les retours des playtests.

---

## Développement

### Prérequis

- Node.js 22 ou supérieur ;
- npm ;
- une installation de Foundry VTT compatible.

### Installation

Clonez le dépôt :

```bash
git clone https://github.com/Nendran/septaris-foundryvtt.git
cd Septaris-FoundryVTT
```

Installez les dépendances :

```bash
npm ci
```

### Développement avec Foundry

Pour développer directement dans Foundry, le dépôt peut être cloné dans le dossier des systèmes :

```text
FoundryVTT/Data/systems/septaris/
```

Par exemple :

```bash
cd /path/to/FoundryVTT/Data/systems
git clone https://github.com/Nendran/septaris-foundryvtt.git septaris
```

Redémarrez ensuite Foundry VTT si nécessaire.

---

## Qualité du code

Le projet utilise **BiomeJS** pour le formatage et l'analyse statique.

Vérifier le projet :

```bash
npm run check
```

Corriger automatiquement les problèmes pouvant l'être :

```bash
npm run check:fix
```

Exécuter les vérifications utilisées par la CI :

```bash
npm run ci
```

Les mêmes vérifications sont exécutées automatiquement par GitHub Actions sur les changements du dépôt.

---

## Releases

Les releases sont générées automatiquement via GitHub Actions.

Une release :

1. met à jour la version de `package.json` ;
2. met à jour `package-lock.json` ;
3. met à jour la version et les URLs de distribution de `system.json` ;
4. crée le commit de release ;
5. crée le tag correspondant ;
6. construit `septaris.zip` ;
7. publie `septaris.zip` et `system.json` dans une GitHub Release.

Les packages publiés utilisent le format :

```text
vMAJOR.MINOR.PATCH
```

Par exemple :

```text
v0.1.0
v0.1.1
v0.2.0
```

---

## Structure du projet

```text
Septaris-FoundryVTT/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml
│   │   └── release.yml
│   └── dependabot.yml
│
├── assets/
│   └── fonts/
│
├── lang/
├── scripts/
├── styles/
├── templates/
│
├── biome.json
├── package.json
├── package-lock.json
└── system.json
```

### `scripts/`

Code JavaScript du système et intégration avec l'API Foundry.

### `templates/`

Templates Handlebars utilisés notamment pour les feuilles et interfaces du système.

### `styles/`

Styles CSS de Septaris.

### `lang/`

Fichiers de traduction et d'internationalisation.

### `assets/`

Ressources statiques utilisées par le système, notamment les polices et éléments graphiques.

---

## Contributions

Le projet étant encore en phase de développement, son architecture et ses APIs internes peuvent évoluer rapidement.

Les issues et retours sont néanmoins les bienvenus pour :

- signaler un bug ;
- proposer une amélioration ;
- documenter un comportement inattendu ;
- discuter d'une intégration Foundry.

Pour les changements importants, il est préférable d'ouvrir une issue avant de commencer une implémentation.

---

## Signaler un problème

Lors de la création d'une issue, indiquez si possible :

- la version de Septaris ;
- la version de Foundry VTT ;
- les étapes permettant de reproduire le problème ;
- le résultat attendu ;
- le résultat obtenu ;
- les erreurs présentes dans la console navigateur, le cas échéant.

---

## Liens

- **Releases :** https://github.com/Nendran/septaris-foundryvtt/releases
- **Issues :** https://github.com/Nendran/septaris-foundryvtt/issues
- **Foundry VTT :** https://foundryvtt.com/

---

## Licence

Le code source de cette intégration Foundry VTT est distribué sous licence MIT.

Le contenu créatif associé à Septaris — notamment les règles, textes, illustrations,
logos, univers et éléments graphiques — reste protégé et est soumis aux conditions
décrites dans [LICENSE-CONTENT](LICENSE-CONTENT).

Les ressources tierces restent soumises à leurs licences respectives.

---

<p align="center">
  <strong>Septaris</strong><br>
  Un système, des univers.
</p>