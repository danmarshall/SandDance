import * as fs from 'fs';
import * as path from 'path';
import { unitize, UnitStyle } from './convert';
import * as VegaLite from 'vega-lite';

const inputBase = './vega-lite-specs';
const outputBase = './vega-specs';

const filenames = fs.readdirSync(inputBase);

filenames.forEach(filename => {
    const json = fs.readFileSync(path.join(inputBase, filename), 'utf8');
    let vegaLiteSpec: VegaLite.TopLevelSpec;

    try {
        vegaLiteSpec = JSON.parse(json);
    }
    catch (e) {
        console.log(e);
    }
    if (vegaLiteSpec) {
        const quantitativeX = filename.indexOf('barchartV-quantitative') > 0;
        let unitStyle: UnitStyle;
        if (filename.indexOf('normalized')) {
            unitStyle = 'normalize';
        } else if (filename.indexOf('treemap')) {
            unitStyle = 'treemap';
        } else {
            unitStyle = 'square';
        }
        const vegaSpec = unitize(vegaLiteSpec, quantitativeX, unitStyle);
        fs.writeFileSync(path.join(outputBase, filename), JSON.stringify(vegaSpec, null, 2), 'utf8');
    }
});
