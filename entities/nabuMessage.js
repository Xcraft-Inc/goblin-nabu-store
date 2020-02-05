'use strict';
const {buildEntity} = require('goblin-workshop');

/******************************************************************************/

const entity = {
  type: 'nabuMessage',

  newEntityStatus: 'published',

  cache: 0,

  properties: {
    nabuId: {
      type: 'string',
      defaultValue: '',
    },
    custom: {
      type: 'bool',
      defaultValue: false,
    },
    sources: {
      type: 'array',
      defaultValue: [],
    },
  },

  summaries: {
    info: {type: 'string', defaultValue: ''},
    description: {type: 'string', defaultValue: ''},
  },

  buildSummaries: function(quest, nabuMessage) {
    const ref = nabuMessage.get('nabuId', '');
    return {info: ref, description: ref};
  },

  indexer: function(quest, entity) {
    const info = entity.get('meta.summaries.description', '');
    return {info, value: info.toLowerCase()};
  },

  quests: {},

  onNew: function(quest, id, nabuId, custom, sources) {
    return {
      id: id,
      nabuId: nabuId || '',
      custom: custom || false,
      sources: sources || [],
    };
  },
};

/******************************************************************************/

module.exports = {
  entity,
  service: buildEntity(entity),
};
