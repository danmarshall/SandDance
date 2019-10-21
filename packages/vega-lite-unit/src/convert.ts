// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vl from 'vega-lite';

export function convert(vlspec: vl.TopLevelSpec) {
    const spec = vl.compile(vlspec);

    return spec;
}

