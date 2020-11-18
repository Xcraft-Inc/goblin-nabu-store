//T:2019-02-27
import React from 'react';
import T from 't';
import Container from 'goblin-gadgets/widgets/container/widget';
import Label from 'goblin-gadgets/widgets/label/widget';
import Field from 'goblin-gadgets/widgets/field/widget';

function createLocale(props) {
  return (
    <Container kind="column" grow="1">
      <Container kind="pane">
        <Container kind="row-pane">
          <Label text={T('Locale')} grow="1" kind="title" />
        </Container>

        <Container kind="column">
          <Field
            kind="combo"
            restrictsToList={true}
            list={props.locales}
            fieldWidth="200px"
            labelText={T('Locale')}
            model=".form.locale"
          />
          <Field grow="1" labelText={T('Sublocale')} model=".form.sublocale" />
          <Field grow="1" labelText={T('Common name')} model=".form.text" />
          <Field
            grow="1"
            labelText={T('Description')}
            model=".form.description"
          />
        </Container>
      </Container>
    </Container>
  );
}

function localeCreated(props) {
  return (
    <Container kind="row-pane" grow="1">
      <Label
        text={T('Locale has been successfully created')}
        grow="1"
        kind="title"
      />
    </Container>
  );
}

/******************************************************************************/

export default {
  mappers: {
    createLocale: (entity) => {
      return {
        locales: entity.get('form.locales'),
      };
    },
  },

  createLocale,
  localeCreated,
};
