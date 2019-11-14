// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as fs from 'fs';
import * as path from 'path';
import * as VegaLite from 'vega-lite';
import { Spec } from 'vega-typings/types';
import { unitize, unitizeFaceted, UnitStyle } from './convert';
import { TopLevelUnitSpec } from 'vega-lite/build/src/spec/unit';

const inputBase = './vega-lite-specs';
const outputBase = './vega-specs';

const filenames = fs.readdirSync(inputBase);

filenames.forEach(filename => {
    const json = fs.readFileSync(path.join(inputBase, filename), 'utf8');
    let vegaLiteSpec: VegaLite.TopLevelSpec | TopLevelUnitSpec;

    try {
        vegaLiteSpec = JSON.parse(json);
    }
    catch (e) {
        process.stderr.write(e);
    }
    if (vegaLiteSpec) {
        const quantitativeX = filename.indexOf('-quantitative') > 0;
        let unitStyle: UnitStyle;
        if (filename.indexOf('normalized')) {
            unitStyle = 'normalize';
        } else if (filename.indexOf('treemap')) {
            unitStyle = 'treemap';
        } else {
            unitStyle = 'square';
        }

        let vegaSpec: Spec;
        if (filename.indexOf('-facet') > 0) {
            vegaSpec = unitizeFaceted(vegaLiteSpec, quantitativeX, unitStyle);
        } else {
            vegaSpec = unitize(vegaLiteSpec as TopLevelUnitSpec, quantitativeX, unitStyle);
        }

        fs.writeFileSync(path.join(outputBase, filename), JSON.stringify(vegaSpec, null, 2), 'utf8');
    }
});
