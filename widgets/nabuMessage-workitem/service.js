//T:2019-02-27
const {buildWorkitem} = require('goblin-workshop');
const {parseParameters} = require('goblin-nabu/lib/format.js');

const config = {
  type: 'nabuMessage',
  kind: 'workitem',
  width: '1400px',
  initialState: {
    icuParameters: {},
    nabuIdIcuError: null,
  },
  onLoad: function* (quest) {
    const message = yield quest.me.getEntityState();
    const parametersResponse = parseParameters(message.get('nabuId'));

    if (parametersResponse.error) {
      yield quest.me.change({
        path: 'nabuIdIcuError',
        newValue: parametersResponse.error,
      });
    } else {
      const icuParameters = {};
      for (let parameterName of parametersResponse.parameters) {
        icuParameters[parameterName] = '';
      }

      yield quest.me.change({
        path: 'icuParameters',
        newValue: icuParameters,
      });
    }
  },
  quests: {
    changeIcuParameter: function* (quest, parameterName, value, next) {
      yield quest.me.change({
        path: `icuParameters.${parameterName}`,
        newValue: value,
      });
    },
  },
  hinters: {
    nabuMessage: {
      onValidate: function* (quest, selection) {
        const nabuMessageApi = quest.getAPI(quest.goblin.getX('entityId'));
        yield nabuMessageApi.setNabuMessageId({entityId: selection.value});
      },
    },
  },
};

module.exports = buildWorkitem(config);
