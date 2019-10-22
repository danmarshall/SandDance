// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { createElement, getActiveElementInfo, mount, setActiveElement } from 'tsx-create-element';
import { App, Input } from './app';
import { convert } from '../../dist/es5/convert';
import * as vl from 'vega-lite';
import { create } from './shell';

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

    mount(
        App(
            {
                ...state,
                textarea
            }
        ),
        shell.div
    );

}

window.addEventListener('error', e => {
    console.log('unhandled error', e);
});

// window['VegaLiteUnit'] = {
//     state,
//     m,
//     update
// }

const shell = create(document.getElementById('app'), JSON.stringify(defaultVlSpec, null, 2));

update();
