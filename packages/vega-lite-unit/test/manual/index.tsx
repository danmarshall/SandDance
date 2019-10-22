// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { createElement, getActiveElementInfo, mount, setActiveElement } from 'tsx-create-element';
import { App, Input } from './app';
import { convert } from '../../dist/es5/convert';
import * as vl from 'vega-lite';

// (1) Desired editor features:
import 'monaco-editor/esm/vs/editor/browser/controller/coreCommands.js';
// import 'monaco-editor/esm/vs/editor/browser/widget/codeEditorWidget.js';
// import 'monaco-editor/esm/vs/editor/browser/widget/diffEditorWidget.js';
// import 'monaco-editor/esm/vs/editor/browser/widget/diffNavigator.js';
// import 'monaco-editor/esm/vs/editor/contrib/bracketMatching/bracketMatching.js';
// import 'monaco-editor/esm/vs/editor/contrib/caretOperations/caretOperations.js';
// import 'monaco-editor/esm/vs/editor/contrib/caretOperations/transpose.js';
// import 'monaco-editor/esm/vs/editor/contrib/clipboard/clipboard.js';
// import 'monaco-editor/esm/vs/editor/contrib/codelens/codelensController.js';
// import 'monaco-editor/esm/vs/editor/contrib/colorPicker/colorDetector.js';
// import 'monaco-editor/esm/vs/editor/contrib/comment/comment.js';
// import 'monaco-editor/esm/vs/editor/contrib/contextmenu/contextmenu.js';
// import 'monaco-editor/esm/vs/editor/contrib/cursorUndo/cursorUndo.js';
// import 'monaco-editor/esm/vs/editor/contrib/dnd/dnd.js';
import 'monaco-editor/esm/vs/editor/contrib/find/findController.js';
// import 'monaco-editor/esm/vs/editor/contrib/folding/folding.js';
// import 'monaco-editor/esm/vs/editor/contrib/format/formatActions.js';
// import 'monaco-editor/esm/vs/editor/contrib/goToDeclaration/goToDeclarationCommands.js';
// import 'monaco-editor/esm/vs/editor/contrib/goToDeclaration/goToDeclarationMouse.js';
// import 'monaco-editor/esm/vs/editor/contrib/gotoError/gotoError.js';
// import 'monaco-editor/esm/vs/editor/contrib/hover/hover.js';
// import 'monaco-editor/esm/vs/editor/contrib/inPlaceReplace/inPlaceReplace.js';
// import 'monaco-editor/esm/vs/editor/contrib/linesOperations/linesOperations.js';
// import 'monaco-editor/esm/vs/editor/contrib/links/links.js';
// import 'monaco-editor/esm/vs/editor/contrib/multicursor/multicursor.js';
// import 'monaco-editor/esm/vs/editor/contrib/parameterHints/parameterHints.js';
// import 'monaco-editor/esm/vs/editor/contrib/quickFix/quickFixCommands.js';
// import 'monaco-editor/esm/vs/editor/contrib/referenceSearch/referenceSearch.js';
// import 'monaco-editor/esm/vs/editor/contrib/rename/rename.js';
// import 'monaco-editor/esm/vs/editor/contrib/smartSelect/smartSelect.js';
// import 'monaco-editor/esm/vs/editor/contrib/snippet/snippetController2.js';
// import 'monaco-editor/esm/vs/editor/contrib/suggest/suggestController.js';
// import 'monaco-editor/esm/vs/editor/contrib/toggleTabFocusMode/toggleTabFocusMode.js';
// import 'monaco-editor/esm/vs/editor/contrib/wordHighlighter/wordHighlighter.js';
// import 'monaco-editor/esm/vs/editor/contrib/wordOperations/wordOperations.js';
// import 'monaco-editor/esm/vs/editor/standalone/browser/accessibilityHelp/accessibilityHelp.js';
// import 'monaco-editor/esm/vs/editor/standalone/browser/inspectTokens/inspectTokens.js';
// import 'monaco-editor/esm/vs/editor/standalone/browser/iPadShowKeyboard/iPadShowKeyboard.js';
// import 'monaco-editor/esm/vs/editor/standalone/browser/quickOpen/quickOutline.js';
// import 'monaco-editor/esm/vs/editor/standalone/browser/quickOpen/gotoLine.js';
// import 'monaco-editor/esm/vs/editor/standalone/browser/quickOpen/quickCommand.js';
// import 'monaco-editor/esm/vs/editor/standalone/browser/toggleHighContrast/toggleHighContrast.js';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js';

// (2) Desired languages:
import 'monaco-editor/esm/vs/language/json/monaco.contribution';


self['MonacoEnvironment'] = {
    getWorkerUrl: function (moduleId, label) {
        if (label === 'json') {
            return './json.worker.js';
        }
        if (label === 'css') {
            return './css.worker.js';
        }
        if (label === 'html') {
            return './html.worker.js';
        }
        return './editor.worker.js';
    },
};


const defaultVlSpec: vl.TopLevelSpec = {
    "$schema": "https://vega.github.io/schema/vega-lite/v4.json",
    "data": {
        "url": "https://gist.githubusercontent.com/stevendrucker/148b70e89808fc13daed45c925f62b0e/raw/21b6e23161032aa0fff13e1f5fd57b841197a041/titanicmaster.txt",
        "format": { "type": "tsv" }
    },
    "height": 500,
    "width": 200,
    "mark": "bar",
    "encoding": {
        "column": { "field": "Class", "type": "nominal" },
        "y": { "field": "Survived", "type": "nominal", "aggregate": "count" },
        "color": { "field": "Survived", "type": "nominal" }
    }
};

const stuff: { m?: monaco.editor.IStandaloneCodeEditor } = { m: null };

const state: Input = {
    textareaInput: JSON.stringify(defaultVlSpec),
    textareaOutput: ''
}

const textarea = (
    <textarea
        ref={t => {
            t.onkeypress = t.onkeyup = t.onkeydown = t.onchange = () => {
                requestAnimationFrame(() => {
                    state.textareaInput = t.value;
                    updateRetainFocus();
                });
            }
        }}
        spellCheck={false}
    >{state.textareaInput}</textarea>
);

function updateRetainFocus() {
    //get the focused element's position and selectionrange
    const a = getActiveElementInfo();
    update();
    //re-set the focus and selectionrange after the update
    setActiveElement(a);
}

function update() {
    let textareaOutput = '';
    let vlspec: vl.TopLevelSpec;
    try {
        vlspec = JSON.parse(state.textareaInput);
    } catch (e) {
        //noop
    }
    if (vlspec) {
        const spec = convert(vlspec);
        textareaOutput = JSON.stringify(spec, null, 2);
    }
    state.textareaOutput = textareaOutput;

    let d: HTMLDivElement;

    mount(
        App(
            {
                ...state,
                divRef: div => d = div,
                textarea

            }
        ),
        document.getElementById('app')
    );

    stuff.m = monaco.editor.create(d, {
        value: JSON.stringify(defaultVlSpec, null, 2),
        language: 'json'
    });

}

const z = 9;


update();

window.addEventListener('error', e => {
    console.log('unhandled error', e);
});

window['VegaLiteUnit'] = {
    state,
    stuff,
    update
}