// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as Vega from 'vega-typings';
import * as VegaLite from 'vega-lite';

export type UnitStyle = 'square' | 'treemap' | 'normalize';

interface TransformItem<T extends Vega.Transforms> {
    transform: T;
    i: number;
}

export function unitizeFaceted(inputSpec: VegaLite.TopLevelSpec, quantitativeX: boolean, unitStyle: UnitStyle) {
    const output = VegaLite.compile(inputSpec);
    const vegaSpec = output.spec as Vega.Spec;
    return vegaSpec;
}

export function unitize(inputSpec: VegaLite.TopLevelSpec, quantitativeX: boolean, unitStyle: UnitStyle) {
    const output = VegaLite.compile(inputSpec);

    const vegaSpec = output.spec as Vega.Spec;
    const data0 = vegaSpec.data[0];

    //add identifier preceding aggregate
    const idts: Vega.IdentifierTransform = {
        type: 'identifier',
        as: 'id'
    };
    data0.transform.unshift(idts);

    const aggregateItem = findTransformByType<Vega.AggregateTransform>(data0, 'aggregate') || { transform: null, i: 0 };

    //change aggregate to window
    const windowTransform: Vega.WindowTransform = {
        type: 'window',

        //TODO should some be removed?
        //TODO change aggregation fields to "column", 
        //group by facet, then by category / bin
        groupby: aggregateItem.transform.groupby,

        ops: ["count"],

        //TODO sort needs to account for stacked bars
        sort: { "field": ["Class", "id"], "order": ["descending", "ascending"] },

        fields: ["id"],
        as: ["__count"]
    };
    data0.transform[aggregateItem.i] = windowTransform;

    data0.transform.push({
        type: "extent",
        field: "__count",
        signal: "maxcount"
    })

    //remove stack
    const stackItem = findTransformByType<Vega.StackTransform>(data0, 'stack');
    if (stackItem) {
        data0.transform.splice(stackItem.i, 1);
    }

    //TODO change mark to xy, hw

    //change y scale to __count only
    const yScale = findScaleByName(vegaSpec.scales, 'y') as Vega.LinearScale;
    const yDomain = yScale.domain as Vega.DataRef;
    yDomain.field = "__count";
    const yDomain2 = yScale.domain as Vega.MultiDataRef;
    delete yDomain2.fields;

    return vegaSpec;
}

function findTransformByType<T extends Vega.Transforms>(d: Vega.Data, type: 'aggregate' | 'stack') {
    for (let i = 0; i < d.transform.length; i++) {
        let transform = d.transform[i];
        if (transform.type === type) {
            return { transform, i } as TransformItem<T>;
        }
    }
}

function findScaleByName(scales: Vega.Scale[], name: string) {
    for (let i = 0; i < scales.length; i++) {
        if (scales[i].name === name) {
            return scales[i];
        }
    }
}
