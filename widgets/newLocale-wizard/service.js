'use strict';

const T = require('goblin-nabu');
const {buildWizard} = require('goblin-desktop');
const langmap = require('langmap');

function buildLocales() {
  return Object.entries(langmap).map(([localeName, texts]) => {
    return {
      id: localeName.replace(/-/g, '_'),
      text: texts.nativeName,
    };
  });
}

function constructLocaleName(locale, sublocale) {
  return [
    locale,
    sublocale
      ? sublocale.startsWith('/')
        ? sublocale.slice(1).toLowerCase()
        : sublocale.toLowerCase()
      : null,
  ]
    .filter((item) => !!item)
    .join('/');
}

const config = {
  name: 'newLocale',
  title: T('Nouvelle locale'),

  steps: {
    createLocale: {
      form: {
        locales: buildLocales(),
        locale: 'fr_CH',
        sublocale: '',
        text: '',
        description: '',
      },
      updateButtonsMode: 'onChange',
      buttons: function* (quest, buttons, form) {
        const nabuAPI = quest.getAPI('nabu');

        const invalidSublocale =
          form.get('sublocale', '').includes('-') ||
          form.get('sublocale', '').includes('_');
        const invalidLocale = !!(yield nabuAPI.findBestLocale({
          desktopId: quest.getDesktop(),
          locale: constructLocaleName(
            form.get('locale', null),
            form.get('sublocale', null)
          ),
          avoidCompareLanguages: true,
        }));

        const disabled = invalidSublocale || invalidLocale;

        return buttons.set('main', {
          text: T('Créer'),
          grow: disabled ? '0.5' : '2',
          disabled,
        });
      },
    },
    localeCreated: {
      form: {},
      buttons: function (quest, buttons) {
        return buttons
          .set('main', {
            glyph: 'solid/arrow-right',
            text: T(`Terminer`),
            grow: '2',
          })
          .del('cancel');
      },
      quest: function* (quest, form) {
        const nabuAPI = quest.getAPI('nabu');

        const desktopId = quest.getDesktop();
        const configuration = yield nabuAPI.getConfiguration({desktopId});

        const localeId = form.locale;

        const localeName = constructLocaleName(localeId, form.sublocale);

        const locale = {
          id: `locale@${localeName}`,
          name: localeName,
          text:
            form.text ||
            form.locales.find((locale) => locale.id === localeId).text,
          description: form.description || '',
        };

        yield nabuAPI.tryAddLocales({
          desktopId,
          mandate: configuration.mandate,
          locales: [locale],
        });
      },
    },
  },
};

module.exports = buildWizard(config);
