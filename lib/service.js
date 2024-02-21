'use strict';

const goblinName = 'nabu-store';
const Goblin = require('xcraft-core-goblin');

// Define initial logic values
const logicState = {
  id: goblinName,
};

// Define logic handlers according rc.json
const logicHandlers = {};
Goblin.registerQuest(goblinName, 'boot', function* (quest) {
  const desktopId = `system@nabu`;
  const configuration = {
    mandate: 'nabu',
    elasticsearchUrl: 'http://127.0.0.1:9200',
    rethinkdbHost: '127.0.0.1',
    useNabu: true,
    mainGoblin: 'nabu-store',
    defaultContextId: 'nabu',
  };
  quest.goblin.setX('configuration', configuration);

  yield quest.cmd('workshop.init', {
    configuration,
    desktopId,
    appName: 'nabu',
  });
  quest.log.dbg('Nabu Store Ready');
});

Goblin.registerQuest(goblinName, 'init', function* (
  quest,
  desktopId,
  configuration
) {
  if (!desktopId) {
    throw new Error('Nabu-store init error: required desktopId parameter');
  }

  if (!configuration) {
    throw new Error('Nabu-store init error: no configuration provided');
  }
  const {mandate} = configuration;

  quest.goblin.setX(`configuration.${mandate}`, configuration);
  yield quest.me.ensureEntities({desktopId});
  const locales = yield quest.me.loadLocales({desktopId});
  yield quest.me.handleElasticIndexes({locales, mandate});

  const r = quest.getStorage('rethink');
  yield r.startQuestOnChanges({
    table: 'locale',
    onChangeQuest: `${goblinName}.handle-locales-change`,
    onErrorQuest: `${goblinName}.stop-listen-locales`,
    goblinId: quest.goblin.id,
    questArgs: {desktopId, mandate},
    errorQuestArgs: {desktopId},
  });
});

Goblin.registerQuest(goblinName, 'ensure-entities', function* (
  quest,
  desktopId,
  next
) {
  const r = quest.getStorage('rethink');
  const entities = ['locale', 'nabuMessage', 'nabuTranslation'];

  for (const entity of entities) {
    r.ensureTable({table: entity}, next.parallel());
  }
  yield next.sync();
  for (const entity of entities) {
    r.ensureIndex({table: entity}, next.parallel());
  }
  yield next.sync();
});

Goblin.registerQuest(goblinName, 'handle-elastic-indexes', function* (
  quest,
  locales,
  mandate,
  configuration,
  force
) {
  const workshopConfig = require('xcraft-core-etc')().load('goblin-workshop');
  if (!workshopConfig.enableMultiLanguageIndex) {
    return;
  }
  // config passed by args or current config
  configuration = configuration
    ? configuration
    : quest.goblin.getX(`configuration.${mandate}`);
  if (!mandate) {
    return;
  }
  //Create one index per locale
  const multilanguageIndexes = locales.map(
    (locale) => `${mandate}-${locale.name.toLowerCase().replace(/\//g, '-')}`
  );

  const workshopAPI = quest.getAPI('workshop');
  yield workshopAPI.initIndexer({
    indexes: multilanguageIndexes,
    configuration,
    force,
  });
});

Goblin.registerQuest(goblinName, 'load-locales', function* (quest) {
  const r = quest.getStorage('rethink');

  const locales = yield r.getAll({
    table: 'locale',
    status: ['published'],
  });
  quest.evt('locales-loaded', {locales});
  return locales;
});

Goblin.registerQuest(goblinName, 'handle-locales-change', function* (
  quest,
  change,
  desktopId,
  mandate
) {
  const configuration = quest.goblin.getX(`configuration.${mandate}`);
  if (change.type === 'state') {
    return;
  }
  const locales = yield quest.me.loadLocales({desktopId});
  yield quest.me.handleElasticIndexes({
    mandate,
    locales,
    configuration,
  });
});

Goblin.registerQuest(goblinName, 'stop-listen-locales', function* (quest) {
  const r = quest.getStorage('rethink');
  yield r.stopOnChanges({
    table: 'locale',
    goblinId: quest.goblin.id,
  });
});

Goblin.registerQuest(goblinName, 'get-configuration', function (
  quest,
  mandate
) {
  return quest.goblin.getX(`configuration.${mandate}`);
});

Goblin.registerQuest(goblinName, 'dispose', function* (quest, desktopId) {
  yield quest.me.stopListenLocales({desktopId});
});

// Singleton
module.exports = Goblin.configure(goblinName, logicState, logicHandlers);
Goblin.createSingle(goblinName);
