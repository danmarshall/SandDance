// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as Vega from 'vega-typings';
import * as VegaLite from 'vega-lite';

import { TopLevelUnitSpec } from 'vega-lite/build/src/spec/unit';

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

export function unitize(inputSpec: TopLevelUnitSpec, quantitativeX: boolean, unitStyle: UnitStyle) {
    const output = VegaLite.compile(inputSpec);
    const xScaleName = quantitativeX ? 'xb' : 'x';

    const vegaSpec = output.spec as Vega.Spec;

    //add signals
    vegaSpec.signals = vegaSpec.signals || [];
    vegaSpec.signals.push.apply(vegaSpec.signals, [
        { name: "child_width", update: "width" },
        { name: "child_height", update: "height" },
        { name: "bx", update: `bandwidth('${xScaleName}')` },
        { name: 'bandPadding', value: 0.1 },
        { name: "cellcount", update: "ceil(sqrt(maxcount[1]*(bx/child_height)))" },
        { name: "gap", update: "min(0.1*(bx/(cellcount-1)),1)" },
        { name: "marksize", update: "bx/cellcount-gap" }
    ]);

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

        //group by facet, then by category / bin
        groupby: [aggregateItem.transform.groupby[0]],

        ops: ["count"],

        //Is sort necessary?
        //sort: { "field": ["id"], "order": ["ascending"] },

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

    //change mark to xy, hw
    const mark0 = vegaSpec.marks[0];
    const { update } = mark0.encode;

    const expressions = ['bx /cellcount * ( (datum.__count-1) %cellcount)'];
    if (quantitativeX) {
        expressions.push('bx * bandPadding');
    }

    update.x = {
        scale: "x",
        field: aggregateItem.transform.groupby[0],
        offset: {
            signal: expressions.join(' + ')
        }
    };
    update.y = {
        signal: "scale('y', floor((datum.__count-1)/cellcount) * cellcount)-marksize"
    };
    update.width = update.height = { signal: "marksize" };
    delete update.x2;
    delete update.y2;

    //change y scale to __count only
    const yScale = findScaleByName<Vega.LinearScale>(vegaSpec.scales, 'y');
    const yDomain = yScale.domain as Vega.DataRef;
    yDomain.field = "__count";
    const yDomain2 = yScale.domain as Vega.MultiDataRef;
    delete yDomain2.fields;

    if (quantitativeX) {
        const binTransform = findTransformByType<Vega.BinTransform>(data0, 'bin');
        const binSignalName = binTransform.transform.signal;

        vegaSpec.data.push({
            name: "seq",
            transform: [
                {
                    type: "sequence",
                    start: { signal: `${binSignalName}.start` },
                    stop: { signal: `${binSignalName}.stop` },
                    step: { signal: `${binSignalName}.step` }
                }
            ]
        });

        const xScale = findScaleByName<Vega.LinearScale>(vegaSpec.scales, 'x');
        const range = xScale.range as any;

        vegaSpec.scales.push({
            name: "xb",
            type: "band",
            domain: {
                "data": "seq",
                "field": "data",
                "sort": true
            },
            range,
            padding: {
                signal: 'bandPadding'
            }
        });
    } else {
        const xScale = findScaleByName<Vega.BandScale>(vegaSpec.scales, 'x');
        delete xScale.paddingInner;
        delete xScale.paddingOuter;
        xScale.padding = { signal: 'bandPadding' };
    }

    return vegaSpec;
}

function findTransformByType<T extends Vega.Transforms>(d: Vega.Data, type: 'aggregate' | 'bin' | 'stack') {
    for (let i = 0; i < d.transform.length; i++) {
        let transform = d.transform[i];
        if (transform.type === type) {
            return { transform, i } as TransformItem<T>;
        }
    }
}

function findScaleByName<T extends Vega.Scale>(scales: Vega.Scale[], name: string) {
    for (let i = 0; i < scales.length; i++) {
        if (scales[i].name === name) {
            return scales[i] as T;
        }
    }
}
