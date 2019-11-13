import * as VegaLite from 'vega-lite';

export type UnitStyle = 'square' | 'treemap' | 'normalize';

export function unitize(inputSpec: VegaLite.TopLevelSpec, quantitativeX: boolean, unitStyle: UnitStyle) {
    const output = VegaLite.compile(inputSpec);
    //TODO unitize
    return output.spec;
}
