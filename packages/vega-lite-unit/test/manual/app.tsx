// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { createElement } from 'tsx-create-element';
import { JsxAttribute } from 'typescript';

export interface Input {
    textareaInput: string;
    textareaOutput: string;
}

export interface Props extends Input {
    textarea: JSX.Element;
    divRef: (div: HTMLDivElement) => void;
}

export const App = (props: Props) => {
    return (
        <div>
            <h1>Vega-lite-unit test</h1>
            <input></input>
            <button>X</button>
            <div ref={props.divRef} style={{ height: '600px' }} ></div>
            <div>
                {props.textarea}
            </div>
            <div>
                <textarea>{props.textareaOutput}</textarea>
            </div>
        </div>
    );
}
