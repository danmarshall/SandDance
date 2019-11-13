import * as VegaLite from 'vega-lite';

export function unitize(inputSpec: VegaLite.TopLevelSpec) {
    const output = VegaLite.compile(inputSpec);
    //TODO unitize
    return output.spec;
}
