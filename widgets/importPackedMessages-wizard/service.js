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
    selectFilePath: {
      form: {filePath: null},
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
    },
    showImportedMessages: {
      form: {imported: false, importedMessages: 0, importedTranslations: 0},
      buttons: function (quest, buttons) {
        return buttons.set('main', {
          glyph: 'solid/arrow-right',
          text: `Terminer`,
          grow: '2',
        });
      },
      quest: function* (quest, form) {
        const nabuAPI = quest.getAPI('nabu');

        const result = yield nabuAPI.importPackedMessages({
          desktopId: quest.getDesktop(),
          ownerId: quest.me.id,
          packFilePath: form.filePath,
        }) || {
          importedMessages: 0,
          importedTranslations: 0,
        };

        quest.do({form: {imported: true, ...result}});
      },
    },
    finish: {
      form: {},
      quest: function* () {},
    },
  },
};

module.exports = buildWizard(config);
