// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as fs from 'fs';
import * as path from 'path';
import * as Vega from 'vega-typings';
import * as VegaLite from 'vega-lite';
import { TopLevelUnitSpec } from 'vega-lite/build/src/spec/unit';
import { unitize, UnitStyle } from './convert';

const inputBase = './vega-lite-specs';
const outputBase = './vega-specs';

const filenames = fs.readdirSync(inputBase);

filenames.forEach(filename => {
    const json = fs.readFileSync(path.join(inputBase, filename), 'utf8');
    let vegaLiteSpec: TopLevelUnitSpec;
    try {
        vegaLiteSpec = JSON.parse(json);
    }
    catch (e) {
        process.stderr.write(e);
    }
    if (vegaLiteSpec) {
        const output = VegaLite.compile(vegaLiteSpec);
        const outputSpec = output.spec as Vega.Spec;
        switch (vegaLiteSpec.mark) {
            case 'bar': {
                const styles: UnitStyle[] = ['square'];
                styles.forEach(unitStyle => {
                    unitize(vegaLiteSpec, outputSpec, unitStyle);
                    fs.writeFileSync(path.join(outputBase, `${unitStyle}-${filename}`), JSON.stringify(outputSpec, null, 2), 'utf8');
                });
            }
        }
    }
});
