'use strict';
//T:2019-04-09

const T = require('goblin-nabu/widgets/helpers/t.js');
const nabuConfig = require('xcraft-core-etc')().load('goblin-nabu');

if (nabuConfig.storageAvailable) {
  const {buildHinter} = require('goblin-elasticsearch');
  /**
   * Retrieve the list of available commands.
   *
   * @returns {Object} The list and definitions of commands.
   */
  exports.xcraftCommands = function () {
    return buildHinter({
      type: 'locale',
      fields: ['name'],
      newWorkitem: {
        name: 'newLocale-wizard',
        description: T('Nouvelle locale'),
        view: 'default',
        icon: 'solid/map',
        mapNewValueTo: 'name',
        kind: 'tab',
        maxInstances: 1,
        isClosable: true,
        navigate: true,
      },
      title: T('Locales'),
      newButtonTitle: T('Nouvelle locale'),
    });
  };
}
