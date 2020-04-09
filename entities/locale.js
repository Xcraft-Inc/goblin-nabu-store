'use strict';
const {buildEntity} = require('goblin-workshop');

/******************************************************************************/

const entity = {
  type: 'locale',

  newEntityStatus: 'draft',

  cache: 0,

  properties: {
    name: {
      type: 'string',
      defaultValue: '',
    },
    text: {
      type: 'string',
      defaultValue: '',
    },
    description: {
      type: 'string',
      defaultValue: '',
    },
  },

  summaries: {
    info: {type: 'string', defaultValue: ''},
    description: {type: 'string', defaultValue: ''},
  },

  buildSummaries: function (quest, locale, peers, MD) {
    const ref = locale.get('text', locale.get('name', ''));
    return {info: ref, description: ref};
  },

  indexer: function (quest, entity) {
    const info = entity.get('meta.summaries.description', '');
    return {info};
  },

  quests: {},

  onNew: function (quest, id, name, text, description) {
    return {
      id,
      name: name || `locale-${quest.uuidV4().slice(0, 6)}`,
      text: text || '',
      description: description || '',
    };
  },
};

/******************************************************************************/

module.exports = {
  entity,
  service: buildEntity(entity),
};
