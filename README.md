# Whey of the Slime

Un bodybuilder beaucoup trop musclé, des slimes beaucoup trop collants.
Prototype de survival auto-shooter pour navigateur, en français, mobile portrait
et desktop. Aucun compte, API ou serveur applicatif ; progression locale.

## Lancer le jeu

Node.js 22.12+ ou 24 LTS et npm sont nécessaires.

```sh
npm ci
npm run dev
```

Ouvrir l’adresse affichée par Vite dans son navigateur. Pour jouer sur un téléphone
sur le même réseau, utiliser l’adresse réseau affichée par Vite. Le serveur de
développement écoute sur toutes les interfaces : l’utiliser sur un réseau de confiance.

```sh
npm run build
npm run preview
```

Le dossier `dist/` est un site statique prêt à héberger. Le workflow GitHub Pages
peut le publier automatiquement depuis la branche du prototype (voir ci-dessous). Les illustrations Canvas et bruitages synthétiques sont
produits localement, sans ressources externes ni télémétrie.

## Jouer

- Déplacement : ZQSD, WASD, flèches ou joystick tactile.
- Dash : Espace ou bouton fléché. Recharge de trois secondes au départ.
- Pouvoir combiné : E ou bouton W, pour 35 points de rage.
- Pause : Échap, P ou bouton II. Les statistiques mobiles et le passage en
  arrière-plan mettent aussi le combat en pause.

Les attaques sont automatiques. Survivre cinq minutes fait apparaître le boss ;
les slimes continuent d’arriver. Battre le boss débloque le palier suivant.
Quitter ou perdre conserve toutes les gelées déjà gagnées. Fermer l’onglet ne
conserve pas le combat, mais la progression est sauvegardée à chaque gain.

Commencer avec deux haltères. Acheter des disques ou shakers dans l’arsenal avec
la gelée d’armement, qui tombe en supplément à 30 %. Les couleurs azur et violette
apparaissent aux paliers 2 et 3. Les niveaux d’armes sont communs par famille,
les talents sont indépendants pour chaque main. Les configurations du personnage
et du duo sont nommables et séparées ; leur chargement est transactionnel.

## Sauvegarde et confidentialité

La progression utilise `localStorage` sur l’origine du site. Changer de navigateur,
de port ou de domaine ne transfère pas la sauvegarde. Le bouton « Exporter /
importer » est dans la barre latérale sur desktop ; le bouton S en haut de l’écran
remplit la même fonction sur mobile.
Un export est recommandé avant d’effacer les données du navigateur. Un import
valide remplace la sauvegarde après confirmation. Aucun fichier n’est téléversé.

Voir [SECURITY.md](SECURITY.md) pour activer le hook local dans une nouvelle copie.
Les parties simultanées dans plusieurs onglets ne sont pas prises en charge.

## Validation

```sh
npm test
npm run build
npm run test:browser
npm run test:pages
npm run format:check
python3 scripts/check_secrets.py --all
```

Les tests navigateur utilisent Chromium système à `/usr/bin/chromium` dans cet
environnement. Ailleurs, fournir `CHROMIUM_PATH=/chemin/vers/chromium`.
Ils lancent leur serveur Vite, sans connexion à un service externe. Les tests
moteur couvrent également le boss à cinq minutes, la fin de partie, les drops et
les remboursements sans duplication de gelées.

## État du prototype

Trois paliers, trois familles d’armes, six combinaisons découvrables, boss slime,
rage, talents, configurations, import/export et son désactivable sont jouables.
Le moteur est en modules JavaScript et Canvas 2D, avec Vite ; il n’utilise pas
Phaser ni de ressources graphiques distantes.

L’équilibrage est une première proposition. Les arbres utilisent pour le moment
une progression linéaire par branche et par effet ; les ramifications, malus de
vulnérabilité du joueur, effets supplémentaires du dash et patterns de boss
spécifiques à chaque palier restent à enrichir. Les boss partagent un comportement
d’onde de choc, avec type, taille et puissance visibles. Pas de musique dans cette
version. Tests réalisés sur Chromium, sans validation sur un téléphone physique
ni Safari/iOS pour le moment.

## GitHub Pages

Le workflow `.github/workflows/pages.yml` construit et publie uniquement `dist/`
à chaque push sur `feat/first-playable`. Aucun secret personnel à ajouter : il
utilise le jeton temporaire fourni par GitHub Actions avec des permissions limitées.
Les dépendances de build et les sources du dépôt ne sont pas incluses dans `dist/`.
Le site publié est accessible publiquement, même si le dépôt est privé selon le
plan GitHub ; aucune sauvegarde utilisateur n’est envoyée au site.

Activation initiale par le propriétaire du dépôt :

1. Dans **Settings → Pages → Build and deployment**, choisir **Source: GitHub Actions**.
2. Dans **Actions → Deploy GitHub Pages**, relancer le dernier workflow si le
   premier essai a échoué avant l’activation de Pages. Lancer **Run workflow** sur
   `feat/first-playable` est aussi possible si GitHub affiche ce bouton.
3. Si l’environnement `github-pages` limite les branches autorisées, autoriser
   `feat/first-playable` dans **Settings → Environments → github-pages**.

Adresse attendue après déploiement réussi :
<https://daviddurighello.github.io/SlimeSurvivor/>.
Le statut de publication et l’adresse effective sont affichés dans le job
`deploy`. Si le dépôt est privé et le plan ne permet pas Pages, GitHub proposera
les options disponibles ; ce workflow ne change pas la visibilité du dépôt.

Le build utilise des chemins de ressources relatifs pour fonctionner sous
`/SlimeSurvivor/`. Les sauvegardes du serveur de développement ne sont pas
transférées automatiquement : exporter puis importer dans le site publié.
`localStorage` est partagé par origine entre les sites GitHub Pages d’un même
compte ; ne pas y stocker de données sensibles. La clé du jeu est spécifique à
Whey of the Slime.

`npm run test:pages` vérifie le build de production servi sous `/SlimeSurvivor/`
avec Chromium, en desktop et portrait mobile, y compris le chargement des assets
et le démarrage du combat.
