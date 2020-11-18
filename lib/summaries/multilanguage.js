'use strict';

const watt = require('gigawatts');
const Tr = require('goblin-nabu/lib/tr.js');

const buildLanguageObjectRecursive = watt(function* (
  quest,
  field,
  localeName,
  fromCache,
  next
) {
  if (!field) {
    return field;
  } else if (Array.isArray(field)) {
    const newList = [];

    for (let item of field) {
      newList.push(
        yield buildLanguageObjectRecursive(
          quest,
          item,
          localeName,
          fromCache,
          next
        )
      );
    }
    return newList;
  } else if (typeof field === 'object' && !field.nabuId) {
    const newObj = {};

    for (let key of Object.keys(field)) {
      newObj[key] = yield buildLanguageObjectRecursive(
        quest,
        field[key],
        localeName,
        fromCache,
        next
      );
    }
    return newObj;
  } else if (typeof field === 'object' && field.nabuId) {
    return yield Tr(
      quest,
      localeName !== '_original' ? localeName : null,
      field,
      fromCache,
      next
    );
  } else {
    return field;
  }
});

const buildLanguageObject = watt(function* (
  quest,
  obj,
  multiLanguageObj,
  localeName,
  fromCache,
  next
) {
  multiLanguageObj[localeName] = yield buildLanguageObjectRecursive(
    quest,
    obj,
    localeName,
    fromCache,
    next
  );
});

const buildMultiLanguageObject = watt(function* (quest, obj, fromCache, next) {
  const nabu = yield quest.warehouse.get({path: 'nabu'});
  const multiLanguageObj = {};

  // With original nabu ids
  buildLanguageObject(
    quest,
    obj,
    multiLanguageObj,
    '_original',
    fromCache,
    next.parallel()
  );

  const locales = nabu.get('locales');
  if (locales) {
    for (let locale of locales.filter((locale) => !locale.get('hide'))) {
      buildLanguageObject(
        quest,
        obj,
        multiLanguageObj,
        locale.get('name'),
        fromCache,
        next.parallel()
      );
    }
  }
  yield next.sync();

  return multiLanguageObj;
});

//-----------------------------------------------------------------------------

module.exports = buildMultiLanguageObject;
