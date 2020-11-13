//T:2019-02-27
import React from 'react';
import T from 't';
import Container from 'goblin-gadgets/widgets/container/widget';
import Label from 'goblin-gadgets/widgets/label/widget';
import FileInput from 'goblin-gadgets/widgets/file-input/widget';
import Field from 'goblin-gadgets/widgets/field/widget';

function selectFilePath(props) {
  return (
    <Container kind="panes" grow="1">
      <Label text={T('Sélectionnez le fichier à importer.')} />
      <FileInput accept=".json" model=".form.filePath" />
    </Container>
  );
}

function showImportedMessages(props) {
  return (
    <Container kind="panes" grow="1">
      <Field
        kind="label"
        grow="1"
        labelText={T('Number of imported messages')}
        model=".form.importedMessages"
      />
      <Field
        kind="label"
        grow="1"
        labelText={T('Number of imported translations')}
        model=".form.importedTranslations"
      />
    </Container>
  );
}

/******************************************************************************/

export default {
  selectFilePath,
  showImportedMessages,
};
