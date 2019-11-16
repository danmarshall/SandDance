// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as fs from 'fs';
import * as path from 'path';
import * as Vega from 'vega-typings';
import * as VegaLite from 'vega-lite';
import { TopLevelUnitSpec } from 'vega-lite/build/src/spec/unit';
import { unitizeBar, UnitStyle } from './bar';

const base = '../../docs/tests/specs';

const filenames = fs.readdirSync(path.join(base, 'input'));

interface Conversion {
    src: string;
    outputs: string[];
}

const conversions: Conversion[] = [];

function out(filename: string, outputSpec: Vega.Spec) {
    fs.writeFileSync(path.join(base, 'output', filename), JSON.stringify(outputSpec, null, 2), 'utf8');
}

filenames.forEach(src => {
    const conversion: Conversion = { src, outputs: [] };
    conversions.push(conversion);
    const json = fs.readFileSync(path.join(base, 'input', src), 'utf8');
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
                    unitizeBar(vegaLiteSpec, outputSpec, unitStyle);
                    const dest = `${unitStyle}-${src}`;
                    conversion.outputs.push(dest);
                    out(dest, outputSpec);
                });
            }
        }
    }
});

fs.writeFileSync(path.join(base, 'conversions.js'), `var conversions = ${JSON.stringify(conversions, null, 2)};`, 'utf8');
