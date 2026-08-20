# Le P'Tea Goû'Thé — site vitrine

Site statique en HTML/CSS/JS pur. Les photos et la carte ne sont **pas**
codées en dur : le site va les chercher en direct dans ton Google Drive et
ton Google Sheet à chaque visite. Modifier une photo ou un prix dans le
Drive suffit — pas besoin de retoucher le code ni de redéployer.

## Arborescence

```
index.html
css/styles.css
js/config.js   <- le seul fichier à modifier pour la config
js/main.js     <- la logique (rien à toucher normalement)
```

## 1. Organiser le Google Drive

Dans ton dossier `site` (celui-ci : `1lJIdtn4eWrc4ZXBTh3uagyFV8ERGEnbA`), un
sous-dossier = soit des photos d'ambiance, soit une catégorie de la carte :

- `logo/` → une seule image (le logo, utilisé dans la barre du haut et sur
  la couverture du livre)
- `photo_accueil` → photos du carrousel d'accueil (modifiable
  dans `js/config.js` → `drive.heroFolders`)
- un sous-dossier par catégorie de la carte, **avec exactement le même nom
  que dans la colonne "categorie" du Google Sheet** (ex: `patisserie`,
  `porcelaine`, `boissons`, `snacks`...) → jusqu'à 4 photos y seront
  affichées sur la page de droite du livre quand on ouvre cette catégorie.
  Pas grave si les accents/majuscules diffèrent, le site les ignore pour
  la comparaison.

Chaque dossier et chaque fichier doit être partagé en **"Tous les
utilisateurs disposant du lien peuvent consulter"** (clic droit → Partager),
sinon le site ne pourra pas les lire une fois en ligne.

## 2. Créer le Google Sheet de la carte

Un tableau avec une ligne d'en-tête et 4 colonnes, dans cet ordre :

| categorie   | nom           | description                 | prix    |
| ----------- | ------------- | --------------------------- | ------- |
| Boissons    | Caramel Doré | Thé noir, caramel, vanille | 4,50 € |
| Pâtisserie | Tarte citron  | Citron de Menton, meringue  | 5,00 € |

- Une ligne = un article. La colonne `categorie` détermine dans quel
  chapitre du livre il apparaît, et l'ordre des catégories dans le
  sommaire suit l'ordre où elles apparaissent dans la feuille.
- `description` et `prix` peuvent rester vides si besoin.
- Partage la feuille en **"Tous les utilisateurs disposant du lien
  peuvent consulter"**.
- Récupère son ID dans l'URL :
  `https://docs.google.com/spreadsheets/d/`**`CET_ID_LA`**`/edit`

## 3. Créer la clé API Google (gratuite)

1. Va sur [console.cloud.google.com](https://console.cloud.google.com/)
   et crée un projet (ou utilise un projet existant).
2. Menu ☰ → *APIs & Services* → *Library* : active **Google Drive API**
   et **Google Sheets API**.
3. *APIs & Services* → *Credentials* → *Create credentials* → *API key*.
4. Une fois le site en ligne (étape 6), reviens restreindre la clé :
   *Application restrictions* → *Websites* → ajoute l'URL de ton site
   (ex: `https://tonpseudo.github.io/*`, ou `https://ton-site.vercel.app/*`
   si tu utilises Vercel). Ça évite que quelqu'un d'autre réutilise ta clé.

## 4. Remplir `js/config.js`

Ouvre le fichier et remplace :

- `apiKey` par la clé créée à l'étape 3
- `sheet.id` par l'ID du Google Sheet de l'étape 2
- les infos `business` (téléphone, email, Instagram, adresse, horaires)
- `maps.query` par l'adresse exacte du salon (pour la carte de
  localisation en bas de page)

## 5. Tester en local

Les navigateurs bloquent les requêtes réseau depuis un simple double-clic
sur `index.html` (`file://`). Lance un petit serveur local depuis ce
dossier, par exemple :

```bash
python -m http.server 8000
```

puis ouvre `http://localhost:8000` dans ton navigateur.

## 6. Mettre en ligne (GitHub Pages ou Vercel)

**GitHub Pages :**
1. Crée un dépôt GitHub, pousse tous ces fichiers dedans (à la racine).
2. *Settings* → *Pages* → *Source* : branche `main`, dossier `/ (root)`.
3. Ton site sera visible à `https://tonpseudo.github.io/nom-du-depot/`
   après une à deux minutes.

**Vercel :** connecte le même dépôt GitHub sur vercel.com → *Add New Project*.
Aucune configuration de build n'est nécessaire (site statique). Le site est
visible à `https://nom-du-projet.vercel.app/` après le déploiement.

Dans les deux cas, reviens à l'étape 3 pour restreindre ta clé API à cette
URL.

## Notes

- Si `apiKey` ou `sheet.id` sont laissés tels quels (valeurs qui
  commencent par `COLLE_`), le site s'affiche quand même avec des
  messages discrets invitant à terminer la configuration — rien ne
  casse.
- Ajouter/retirer une photo dans le Drive, ou modifier une ligne du
  Sheet, se reflète sur le site à la prochaine visite, sans rien
  redéployer.
