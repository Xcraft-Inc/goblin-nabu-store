'use strict';
//T:2019-04-09

const T = require('goblin-nabu/widgets/helpers/t.js');
const {buildWorkitem, editSelectedEntityQuest} = require('goblin-workshop');

const config = {
  type: 'locale',
  kind: 'search',
  title: T('Locales'),
  list: 'locale',
  hinters: {
    locale: {
      onValidate: editSelectedEntityQuest('locale-workitem'),
    },
  },
};

exports.xcraftCommands = function () {
  return buildWorkitem(config);
};
