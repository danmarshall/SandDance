import * as VegaLite from 'vega-lite';
import * as Vega from 'vega-typings'

export type UnitStyle = 'square' | 'treemap' | 'normalize';

export function unitize(inputSpec: VegaLite.TopLevelSpec, quantitativeX: boolean, unitStyle: UnitStyle) {
    const output = VegaLite.compile(inputSpec);

    const vegaSpec = output.spec as Vega.Spec;

    //TODO unitize

    const data0 = vegaSpec.data[0];

    addIdentifierTransform(data0);



    //change aggregate to window
    //change aggregation fields to "column", group by facet, then by category / bin
    //remove stack
    //change mark to xy, hw
    //change scale to __count only


    return vegaSpec;
}

function addIdentifierTransform(d: Vega.Data) {
    const aggPos = getAggregateTransformPosition(d) || 0;
    d.transform.splice(aggPos, 0, { type: 'identifier', as: 'id' });
}

function getAggregateTransformPosition(d: Vega.Data) {
    for (let i = 0; i < d.transform.length; i++) {
        let t = d.transform[i];
        if (t.type === 'aggregate') {
            return i;
        }
    }
}
