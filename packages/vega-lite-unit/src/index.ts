import * as fs from 'fs';
import * as path from 'path';
import { unitize } from './convert';

const inputBase = './vega-lite-specs';
const outputBase = './vega-specs';

const specs = fs.readdirSync(inputBase);

specs.forEach(spec => {
    const json = fs.readFileSync(path.join(inputBase, spec), 'utf8');

    try {
        const vegaLiteSpec = JSON.parse(json);
        const vegaSpec = unitize(vegaLiteSpec);
        fs.writeFileSync(path.join(outputBase, spec), JSON.stringify(vegaSpec, null, 2), 'utf8');
    }
    catch (e) {
        console.log(e);
    }
});
