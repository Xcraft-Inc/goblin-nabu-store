# 📘 goblin-nabu-store

## Aperçu

`goblin-nabu-store` est le module de persistance et de gestion des données de traduction du framework Xcraft. Il constitue la couche de stockage de l'écosystème Nabu, en fournissant les entités RethinkDB pour les locales, les messages et les traductions, ainsi que les interfaces d'administration (workitems, datagrid, wizards) permettant de gérer ces données depuis l'interface graphique. Il expose également les utilitaires de construction de résumés multi-langues utilisés par d'autres modules pour indexer du contenu traduisible.

Le module s'appuie sur [`goblin-workshop`][goblin-workshop] pour générer automatiquement les services CRUD des entités, sur [`goblin-elasticsearch`][goblin-elasticsearch] pour l'indexation full-text, et sur [`goblin-nabu`][goblin-nabu] pour la résolution des traductions.

## Sommaire

- [Structure du module](#structure-du-module)
- [Fonctionnement global](#fonctionnement-global)
- [Exemples d'utilisation](#exemples-dutilisation)
- [Interactions avec d'autres modules](#interactions-avec-dautres-modules)
- [Détails des sources](#détails-des-sources)
- [Licence](#licence)

## Structure du module

Le module est organisé en quatre couches :

- **Acteur principal** (`lib/service.js`) : Goblin singleton `nabu-store` qui orchestre l'initialisation du storage, la gestion des locales et la synchronisation avec Elasticsearch.
- **Entités** (`entities/`) : Définitions des trois entités persistées via [`goblin-workshop`][goblin-workshop] — `locale`, `nabuMessage` et `nabuTranslation`.
- **Utilitaires de résumés** (`lib/summaries.js`, `lib/summaries/`) : Pipeline de construction de résumés multi-langues à partir de données contenant des chaînes traduisibles.
- **Interfaces utilisateur** (`widgets/`) : Workitems, datagrid, wizards et leurs services associés exposés sur le bus Xcraft.

## Fonctionnement global

### Initialisation du storage

Au démarrage, `nabu-store` suit un flux d'initialisation en deux phases :

```
1. BOOT (singleton, appelé une fois)
   Configuration workshop (mandate 'nabu', RethinkDB, Elasticsearch)
   → workshop.init
        ↓
2. INIT (appelé par l'application hôte avec sa configuration)
   Vérification des paramètres requis (desktopId, configuration)
   → ensureEntities : création des tables RethinkDB (locale, nabuMessage, nabuTranslation)
   → loadLocales : chargement des locales publiées
   → handleElasticIndexes : création d'un index Elasticsearch par locale
   → startQuestOnChanges : écoute des changements de la table 'locale' en temps réel
```

### Synchronisation des indexes Elasticsearch

Lorsque [`goblin-workshop`][goblin-workshop] est configuré avec `enableMultiLanguageIndex: true`, `nabu-store` crée un index Elasticsearch par locale active. La convention de nommage est `{mandate}-{localeName}` (ex : `myapp-fr_ch`, `myapp-de_ch`). Ces indexes sont recréés dynamiquement à chaque modification de la liste des locales (via le listener RethinkDB `handle-locales-change`).

### Pipeline multi-langues des résumés

Le point d'entrée principal (`lib/summaries.js`) est utilisé par les modules consommateurs pour construire des résumés traduits dans toutes les locales disponibles :

```
summaries (objet clé/valeur avec valeurs nabu ou primitives)
        ↓
dereferenceSummaries : résolution des références @{ref} dans les translatableMarkdown
        ↓
buildMultiLanguageObject : résolution de chaque champ pour chaque locale connue
        ↓
joinSummaries : aplatissement des translatableString en chaînes simples
        ↓
{ '_original': {...}, 'fr_CH': {...}, 'de_CH': {...}, ... }
```

### Architecture des entités

Les trois entités sont construites avec [`goblin-workshop`][goblin-workshop] via `buildEntity` :

| Entité            | Statut initial | Relations                 | Usage                                                   |
| ----------------- | -------------- | ------------------------- | ------------------------------------------------------- |
| `locale`          | `draft`        | —                         | Définit une langue disponible dans l'application        |
| `nabuMessage`     | `published`    | —                         | Représente un message source identifié par son `nabuId` |
| `nabuTranslation` | `draft`        | `messageId → nabuMessage` | Contient le texte traduit d'un message pour une locale  |

## Exemples d'utilisation

### Initialisation de nabu-store depuis une application hôte

`nabu-store` est un acteur Goblin (non Elf), son initialisation se fait via le système quest :

```javascript
// Initialiser nabu-store avec la configuration de l'application
await quest.cmd('nabu-store.init', {
  desktopId: 'myapp@desktop',
  configuration: {
    mandate: 'myapp',
    elasticsearchUrl: 'http://127.0.0.1:9200',
    rethinkdbHost: '127.0.0.1',
    useNabu: true,
    mainGoblin: 'nabu-store',
    defaultContextId: 'nabu',
  },
});
```

### Récupérer la configuration courante

```javascript
// Obtenir la configuration stockée pour un mandate donné
const config = await quest.cmd('nabu-store.get-configuration', {
  mandate: 'myapp',
});
```

### Utiliser les résumés multi-langues

```javascript
const buildMultiLanguageSummaries = require('goblin-nabu-store');
const T = require('goblin-nabu/widgets/helpers/t.js');

// Dans une quête Goblin, construire les résumés traduits d'une entité
const summaries = {
  info: T("Titre de l'entité"),
  description: 'Texte statique',
};

const multiLangSummaries = await buildMultiLanguageSummaries(
  quest,
  summaries,
  false // fromCache: lire depuis les entités nabuTranslation
);
// → { '_original': { info: "Titre de l'entité", description: 'Texte statique' },
//     'fr_CH': { info: "Titre de l'entité", description: 'Texte statique' },
//     'de_CH': { info: 'Titel der Entität', description: 'Texte statique' } }
```

### Recréer les indexes Elasticsearch manuellement

```javascript
// Forcer la recréation des indexes (utile après ajout de locales)
await quest.cmd('nabu-store.handle-elastic-indexes', {
  locales: [{name: 'fr_CH'}, {name: 'de_CH'}],
  mandate: 'myapp',
  force: true,
});
```

## Interactions avec d'autres modules

- **[goblin-nabu]** : Fournit les helpers `T()`, la fonction `Tr()` et les composants de traduction utilisés dans les widgets et les utilitaires de résumés.
- **[goblin-workshop]** : Génère automatiquement les services CRUD pour les entités (`buildEntity`, `buildWorkitem`, `buildWizard`) et orchestre l'initialisation du backend de données.
- **[goblin-desktop]** : Fournit `buildWizard` pour les assistants de création de locale et d'import.
- **[goblin-elasticsearch]** : Fournit `buildHinter` pour les recherches full-text sur les locales et messages (conditionnel à `nabuConfig.storageAvailable`).
- **[xcraft-core-goblin]** : Mécanismes de base Goblin (quêtes, dispatch, createSingle, bus Xcraft).
- **[xcraft-core-etc]** : Chargement de la configuration `goblin-workshop` et `goblin-nabu`.
- **[xcraft-core-shredder]** : Manipulation des structures Immutable.js dans `dereference.js`.

## Détails des sources

### `lib/service.js` — Acteur Goblin `nabu-store` (singleton)

Cœur du module. Orchestre l'initialisation du storage, la gestion des tables RethinkDB, la synchronisation des indexes Elasticsearch et l'écoute des changements de locales en temps réel.

#### État et modèle de données

```javascript
{
  id: 'nabu-store';
  // Pas d'état Redux explicite — les données opérationnelles
  // sont stockées via quest.goblin.setX() :
  // - configuration           : config du boot (mandate 'nabu')
  // - configuration.<mandate> : config par mandate (définie à l'init)
}
```

#### Cycle de vie

`nabu-store` est un singleton (`Goblin.createSingle`). Il expose deux quêtes de démarrage :

- **`boot`** : appelée une seule fois au démarrage du framework. Configure la connexion workshop pour le mandate interne `'nabu'` et initialise workshop.
- **`init`** : appelée par l'application hôte avec sa configuration propre. Vérifie les paramètres, crée les tables et indexes, charge les locales, et souscrit au changefeed RethinkDB sur la table `locale`.

La quête `dispose` assure la fermeture propre en arrêtant l'écoute des changements.

#### Méthodes publiques

- **`boot()`** — Initialise la connexion workshop avec la configuration interne du mandate `'nabu'`. Appelée automatiquement au démarrage.
- **`init(desktopId, configuration)`** — Initialise le storage pour un mandate applicatif. Lance la création des tables, le chargement des locales et l'abonnement aux changements RethinkDB. Lève une erreur si `desktopId` ou `configuration` sont absents.
- **`ensure-entities(desktopId)`** — Crée (si nécessaire) les tables `locale`, `nabuMessage` et `nabuTranslation` dans RethinkDB, ainsi que leurs indexes.
- **`load-locales(desktopId)`** — Lit toutes les locales au statut `published` depuis RethinkDB et émet l'événement `locales-loaded` avec la liste.
- **`handle-elastic-indexes(locales, mandate, configuration, force)`** — Crée ou met à jour les indexes Elasticsearch multi-langues (`{mandate}-{localeName}`). Nécessite `enableMultiLanguageIndex: true` dans la config workshop.
- **`handle-locales-change(change, desktopId, mandate)`** — Réagit aux modifications de la table `locale` (ajout, suppression). Recharge les locales et reconfigure les indexes Elasticsearch. Les changements de type `state` sont ignorés.
- **`stop-listen-locales(desktopId)`** — Arrête le listener RethinkDB sur la table `locale`.
- **`get-configuration(mandate)`** — Retourne la configuration stockée pour un mandate donné.
- **`dispose(desktopId)`** — Ferme proprement les ressources (appelle `stopListenLocales`).

### `lib/summaries.js`

Point d'entrée principal du module (`package.json` → `"main": "lib/summaries.js"`). Exporte la fonction `buildMultiLanguageSummaries` consommée par les autres modules pour construire des résumés traduits dans toutes les locales.

#### Méthodes publiques

- **`buildMultiLanguageSummaries(quest, summaries, fromCache)`** — Générateur watt. Prend un objet de résumés (valeurs pouvant être des primitives, objets nabu, ou tableaux), déréférence les `translatableMarkdown`, résout chaque champ pour chaque locale connue, et retourne un objet indexé par nom de locale (plus `_original`). Retourne `summaries` inchangé si la valeur est falsy. Le paramètre `fromCache` est passé à `Tr` pour choisir entre lecture du cache packagé ou lecture depuis la base.

### `lib/summaries/dereference.js`

Pré-traitement des résumés de type `translatableMarkdown` avant traduction. Un `translatableMarkdown` est un objet de la forme :

```javascript
{
  _type: 'translatableMarkdown',
  _string: 'abc@{ref}xyz',
  _refs: { ref: { /* objet nabu */ } }
}
```

Le traitement se déroule en deux passes :

1. **`applySplitTransform`** : découpe la chaîne `_string` en tableau d'alternances texte/référence (`['abc', '@{ref}', 'xyz']`).
2. **`applyDereferenceTransform`** : remplace chaque `@{ref}` par la valeur correspondante dans `_refs`.

Les objets Shredder/Immutable sont préalablement convertis en JS natif via `toJS()`. Les champs non-`translatableMarkdown` sont retournés inchangés.

#### Méthodes publiques

- **`dereferenceSummaries(summaries)`** — Applique le déréférencement sur tous les champs d'un objet de résumés. Retourne un nouvel objet avec les mêmes clés.

### `lib/summaries/multilanguage.js`

Construit la version multi-langue d'un objet de résumés en appelant `Tr` (depuis [`goblin-nabu`][goblin-nabu]) pour chaque locale disponible dans le warehouse. Parcourt récursivement les tableaux et objets imbriqués pour traduire chaque objet nabu trouvé (reconnu à la présence d'un champ `nabuId`).

La locale spéciale `_original` est toujours générée en plus des locales réelles — elle conserve les `nabuId` bruts sans traduction. Les locales masquées (`hide: true`) sont exclues du résultat.

### `entities/locale.js`

Entité `locale` construite avec `buildEntity` de [`goblin-workshop`][goblin-workshop].

#### Modèle de données

| Propriété     | Type     | Valeur par défaut | Description                                                       |
| ------------- | -------- | ----------------- | ----------------------------------------------------------------- |
| `name`        | `string` | `''`              | Identifiant technique de la locale (ex : `fr_CH`, `fr_CH/valais`) |
| `text`        | `string` | `''`              | Nom commun affiché (ex : `Français`)                              |
| `description` | `string` | `''`              | Description libre                                                 |

**Résumés** : `info` et `description` sont tous deux alimentés par `text` (ou `name` si `text` est vide).

**Indexation** : le champ `description` des summaries est indexé dans Elasticsearch sous la clé `info`.

**Création** (`onNew`) : génère automatiquement un `name` de type `locale-{uuid6}` si aucun n'est fourni.

### `entities/nabuMessage.js`

Entité `nabuMessage` représentant un message source identifié par son `nabuId`.

#### Modèle de données

| Propriété | Type     | Valeur par défaut | Description                                        |
| --------- | -------- | ----------------- | -------------------------------------------------- |
| `nabuId`  | `string` | `''`              | Identifiant textuel du message (clé de traduction) |
| `custom`  | `bool`   | `false`           | `true` si créé manuellement (non extrait du code)  |
| `sources` | `array`  | `[]`              | Liste des emplacements dans le code source         |

**Résumés** : `info` et `description` reprennent le `nabuId`.

**Indexation** : champs `info` (description) et `value` (description en minuscules, pour tri).

**Statut initial** : `published` (les messages sont immédiatement visibles).

### `entities/nabuTranslation.js`

Entité `nabuTranslation` liant un `nabuMessage` à une locale avec le texte traduit.

#### Modèle de données

| Propriété   | Type       | Valeur par défaut | Description                                   |
| ----------- | ---------- | ----------------- | --------------------------------------------- |
| `messageId` | `entityId` | `null`            | Référence vers l'entité `nabuMessage` parente |
| `locale`    | `string`   | `''`              | Nom de la locale (ex : `fr_CH`)               |
| `text`      | `string`   | `''`              | Texte traduit                                 |

**Résumés** : `info` et `description` contiennent le texte traduit. `localeName` contient le nom de la locale.

**Indexation** : champs `info`, `messageId`, et un champ dynamique `{localeName}-value` (texte en minuscules) pour le tri et la recherche par locale.

**Création** (`onNew`) : si `locale` n'est pas fourni, il est extrait de l'`id` en prenant la partie après le premier `@`.

### `widgets/nabuMessage-datagrid/`

Grille d'administration des messages Nabu. Affiche l'ensemble des `nabuMessage` avec leurs traductions dans deux locales configurables simultanément.

#### `service.js`

Service Goblin généré par `buildWorkitem` avec le type `datagrid`. Colonnes : indicateur de traductions manquantes, identifiant du message (`nabuId`), deux colonnes de locale sélectionnables, et bouton d'ouverture en édition externe.

À la création (`afterCreate`), les deux premières locales disponibles dans le warehouse sont automatiquement sélectionnées pour les colonnes `locale_1` et `locale_2`.

Quêtes spécifiques :

- **`openSingleEntity(entityId, navigate)`** — Émet l'événement `{toolbarId}.edit-message-requested` pour ouvrir le message dans l'éditeur Nabu.
- **`changeSelectedLocale(index, locale)`** — Change la locale affichée dans une colonne (index 2 ou 3). Réinitialise le tri si la colonne triée est modifiée.
- **`applyElasticVisualization(value, sort)`** — Applique une recherche full-text ou un tri sur les résultats de la datagrid. Si `value` est vide ou non fourni, bascule le tri ; sinon déclenche une recherche Elasticsearch.
- **`setNeedTranslation()`** — Interroge RethinkDB pour identifier les locales ayant des traductions manquantes (texte vide), et met à jour `hasTranslations` dans l'état.

#### `header.js` / `header-combo.js`

Rendu des en-têtes de colonnes. La colonne `nabuId` affiche un label fixe. Les colonnes `locale_1` et `locale_2` affichent un `TextFieldCombo` (`HeaderCombo`) permettant de choisir la locale parmi celles disponibles dans `backend.nabu.locales`. Un indicateur visuel (icône triangle d'avertissement) signale les locales ayant des traductions manquantes. Le combo déclenche `setNeedTranslation` à l'ouverture pour actualiser les indicateurs.

#### `row.js`

Rendu des cellules de chaque ligne. Utilise `TranslationFieldConnected` (depuis [`goblin-nabu`][goblin-nabu]) pour les colonnes de traduction, `HighlightLabel` pour la colonne `nabuId` (avec surbrillance des termes recherchés), et un `Button` crayon pour l'ouverture externe.

#### `labels.js`

Deux composants Label connectés au store Redux :

- **`InfoLabel`** — Affiche une icône d'information (`regular/info-circle`, si une description source existe) ou d'avertissement (`solid/exclamation-triangle`, si une traduction est manquante dans les colonnes visibles) selon l'état des traductions.
- **`SortLabel`** — Affiche l'icône de tri courante (neutre `solid/sort`, ascendant `solid/sort-alpha-up` ou descendant `solid/sort-alpha-down`) selon l'état de tri de la datagrid. Masqué si une recherche textuelle est active.

#### `ui.js`

Exports du rendu UI : `headerCell`, `rowCell`, `sortCell` et `hinter`. La zone `hinter` contient un champ de recherche full-text avec throttle à 200 ms, déclenchant `applyElasticVisualization`.

### `widgets/nabuMessage-workitem/`

Formulaire d'édition d'un `nabuMessage` individuel avec prévisualisation des paramètres ICU.

#### `service.js`

Service Goblin de type `workitem`. À l'ouverture (`onLoad`), parse les paramètres ICU du `nabuId` via `parseParameters` (depuis [`goblin-nabu`][goblin-nabu]) et initialise `icuParameters` avec une entrée vide par paramètre trouvé. En cas d'erreur de parsing ICU, stocke le message d'erreur dans `nabuIdIcuError`. La quête `changeIcuParameter` met à jour dynamiquement les paramètres pour la prévisualisation.

État initial : `{ icuParameters: {}, nabuIdIcuError: null }`.

#### `ui.js`

Délègue entièrement le rendu au composant `NabuMessage` de [`goblin-nabu`][goblin-nabu], en lui passant `entityId` et `id`.

### `widgets/locale-workitem/`

Formulaire d'édition d'une entité `locale`.

#### `service.js`

Service Goblin de type `workitem`. Le bouton "reset" est supprimé de l'interface (via la fonction `buttons`). Le hinter `locale` permet de sélectionner une locale existante via autocomplétion et appelle `setLocaleId` sur validation.

#### `ui.js`

Affiche les trois champs de la locale (`name`, `text`, `description`). Le champ `name` (nom technique) est en lecture seule si la locale est déjà publiée (`status !== 'draft'`), pour éviter les incohérences d'identifiant. Le composant est connecté au store via `Widget.connect` pour lire le statut de l'entité depuis `backend.{entityId}.meta.status`.

### `widgets/importPackedMessages-wizard/`

Assistant en deux étapes pour importer un fichier de traductions packagé (`.json`).

#### `service.js`

Wizard construit avec `buildWizard` de [`goblin-desktop`][goblin-desktop].

- **Étape `selectFilePath`** : formulaire avec un `FileInput` acceptant les `.json`. Le bouton "Import" est désactivé tant qu'aucun fichier n'est sélectionné. Mode `updateButtonsMode: 'onChange'` pour réévaluation à chaque modification.
- **Étape `showImportedMessages`** : exécute `nabuAPI.importPackedMessages` avec le chemin sélectionné, puis affiche le nombre de messages et traductions importés. En cas d'erreur, les compteurs tombent à 0.

#### `ui.js`

Étape 1 : `FileInput` avec filtre `.json` lié au modèle `.form.filePath`.  
Étape 2 : deux champs `Field` en mode `label` affichant `importedMessages` et `importedTranslations`.

### `widgets/newLocale-wizard/`

Assistant en deux étapes pour créer une nouvelle locale.

#### `service.js`

Wizard construit avec `buildWizard`. Utilise la bibliothèque `langmap` pour générer la liste complète des locales standard (format BCP 47 normalisé en `_`).

- **Étape `createLocale`** : sélection d'une locale dans le combo, saisie optionnelle d'une sub-locale (`/valais`, `/romandie`…), nom commun et description. Le bouton "Créer" est désactivé si la sub-locale contient `-` ou `_` (caractères non supportés), ou si la locale combinée existe déjà (vérifiée via `nabuAPI.findBestLocale` avec `avoidCompareLanguages: true`).
- **Étape `localeCreated`** : appelle `nabuAPI.tryAddLocales` avec la locale construite (id `locale@{localeName}`), puis affiche un message de confirmation.

Le nom de locale final est construit par `constructLocaleName(locale, sublocale)` : les deux parties sont jointes par `/`, la sub-locale est normalisée en minuscules et le `/` initial éventuel est supprimé.

#### `ui.js`

Étape 1 : combo de locales (liste `langmap`), champ sub-locale, nom commun et description. Un `mapper` extrait `form.locales` de l'état pour alimenter le combo.  
Étape 2 : label de confirmation de création.

### Fichiers d'entrée du bus Xcraft (racine)

Ces fichiers exposent les commandes sur le bus via `exports.xcraftCommands` :

| Fichier                          | Commandes exposées                                                         |
| -------------------------------- | -------------------------------------------------------------------------- |
| `nabu-store.js`                  | Service principal `nabu-store` (`lib/service.js`)                          |
| `locale.js`                      | Service CRUD de l'entité `locale` (`entities/locale.js`)                   |
| `nabuMessage.js`                 | Service CRUD de l'entité `nabuMessage` (`entities/nabuMessage.js`)         |
| `nabuTranslation.js`             | Service CRUD de l'entité `nabuTranslation` (`entities/nabuTranslation.js`) |
| `locale-workitem.js`             | Workitem d'édition de locale (`widgets/locale-workitem/service.js`)        |
| `locale-search.js`               | Workitem de recherche de locales (`goblin-workshop`)                       |
| `locale-hinter.js`               | Hinter Elasticsearch pour les locales (conditionnel à `storageAvailable`)  |
| `nabuMessage-workitem.js`        | Workitem d'édition de message (`widgets/nabuMessage-workitem/service.js`)  |
| `nabuMessage-datagrid.js`        | Datagrid des messages (`widgets/nabuMessage-datagrid/service.js`)          |
| `nabuMessage-hinter.js`          | Hinter Elasticsearch pour les messages (conditionnel à `storageAvailable`) |
| `importPackedMessages-wizard.js` | Wizard d'import de pack (`widgets/importPackedMessages-wizard/service.js`) |
| `newLocale-wizard.js`            | Wizard de création de locale (`widgets/newLocale-wizard/service.js`)       |

## Licence

Ce module est distribué sous [licence MIT](./LICENSE).

[goblin-nabu]: https://github.com/Xcraft-Inc/goblin-nabu
[goblin-workshop]: https://github.com/Xcraft-Inc/goblin-workshop
[goblin-desktop]: https://github.com/Xcraft-Inc/goblin-desktop
[goblin-elasticsearch]: https://github.com/Xcraft-Inc/goblin-elasticsearch
[xcraft-core-goblin]: https://github.com/Xcraft-Inc/xcraft-core-goblin
[xcraft-core-etc]: https://github.com/Xcraft-Inc/xcraft-core-etc
[xcraft-core-shredder]: https://github.com/Xcraft-Inc/xcraft-core-shredder

_Ce contenu a été généré par IA_
