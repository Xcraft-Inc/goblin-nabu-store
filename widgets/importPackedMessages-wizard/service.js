'use strict';

const T = require('goblin-nabu');
const {buildWizard} = require('goblin-desktop');

const config = {
  name: 'importPackedMessages',
  title: T('Import packed messages'),
  dialog: {
    width: '800px',
  },

  steps: {
    options: {
      updateButtonsMode: 'onChange',
      buttons: function (quest, buttons, form) {
        const filePath = form.get('filePath', null);
        const disabled = !filePath;

        return buttons.set('main', {
          text: T('Import'),
          grow: disabled ? '0.5' : '2',
          disabled,
        });
      },
      form: {filePath: null},
    },
    importMessages: {
      form: {},
      quest: function* (quest, form) {
        const nabuAPI = quest.getAPI('nabu');

        yield nabuAPI.importPackedMessages({
          desktopId: quest.getDesktop(),
          ownerId: quest.me.id,
          packFilePath: form.filePath,
        });
        yield quest.me.next();
      },
    },
    finish: {
      form: {},
      quest: function* () {},
    },
  },
};

module.exports = buildWizard(config);
