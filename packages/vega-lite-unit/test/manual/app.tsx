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
}

export const App = (props: Props) => {
    return (
        <div>
            <h1>Vega-lite-unit test</h1>
            <div>
                {props.textarea}
            </div>
            <div>
                <textarea>{props.textareaOutput}</textarea>
            </div>
        </div>
    );
}
