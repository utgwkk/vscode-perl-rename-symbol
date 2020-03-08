# perl-rename-symbol README

Provides `Rename Symbol` for Perl, with [App::PRT](https://metacpan.org/pod/App::PRT) and [App::EditorTools](https://metacpan.org/pod/App::EditorTools).

## Features

### Rename subroutine name

[![Demo of Rename subroutine name](https://i.gyazo.com/b39a47bc5ef97833970e9ed1715c6380.gif)](https://gyazo.com/b39a47bc5ef97833970e9ed1715c6380)

### Rename variable name

[![Demo of Rename variable name](https://i.gyazo.com/c9dbf20958719dac7bc1f0a4eced7516.gif)](https://gyazo.com/c9dbf20958719dac7bc1f0a4eced7516)

## Requirements

- Perl
- App::PRT
- App::EditorTools

## Extension Settings

### `perl-rename-symbol.pathOfAppPRT`

The path of App::PRT, default is `prt`.

### `perl-rename-symbol.pathOfAppEditorTools`

The path of App::EditorTools, default is `editortools`.

### `perl-rename-symbol.targetFilePatterns`

The glob pattern matched to Perl files, default is `["**/**.pl", "**/**.pm", "**/**.t"]`.
