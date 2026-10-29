# Sécurité du dépôt

Whey of the Slime fonctionne dans le navigateur sans API ni secret serveur.
Tout ce qui est livré au navigateur est public : ne jamais placer de clé privée,
jeton ou mot de passe dans le code, les assets ou une variable de build.

## Activer les protections locales

Depuis la racine du dépôt, avec Python 3 installé :

```sh
git config --local core.hooksPath .githooks
python3 scripts/check_secrets.py --all
```

Le hook contrôle les fichiers réellement indexés avant chaque commit. La CI
contrôle tous les fichiers suivis à chaque push et pull request. Ces contrôles
reconnaissent des noms de fichiers sensibles et plusieurs formats de secrets ;
ils ne garantissent pas la détection de toute information confidentielle et ne
scannent pas l'historique. Les hooks locaux peuvent être contournés.

Les fichiers `.env`, clés, configurations d'authentification, dépendances et
exports de sauvegarde sont ignorés. Les exemples `.env.example` et `.env.sample`
ne doivent contenir que des noms de variables et des valeurs vides.
Un `.gitignore` ne protège pas les fichiers déjà suivis ou ajoutés avec `-f`.
Avant tout commit, examiner `git diff --cached` et `git status`.
Ne pas joindre de données personnelles, logs privés ou exports de navigateur
aux commits, issues et captures d'écran.

## Réglages GitHub à activer par le propriétaire

Dans les paramètres GitHub du dépôt, activer la détection de secrets et la
protection des push si disponibles pour ce dépôt. Protéger la branche principale
avec une pull request et le contrôle obligatoire `secrets`. Ces réglages ne sont
pas activés par les fichiers de ce dépôt. Garder le dépôt privé tant que son
contenu n'est pas destiné à être public.

## Si un secret est exposé

Révoquer ou renouveler immédiatement le secret chez son fournisseur, même si le
commit n'a pas été fusionné. Retirer ensuite la donnée du dépôt et, si nécessaire,
purger l'historique et les autres copies avec les personnes concernées. Une
suppression dans un nouveau commit ne retire pas le secret de l'historique.
Ne jamais copier le secret dans un rapport public.
