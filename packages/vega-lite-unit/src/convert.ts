// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as Vega from 'vega-typings';
import { StandardType } from 'vega-lite/build/src/type';
import { TopLevelUnitSpec } from 'vega-lite/build/src/spec/unit';
import { TypedFieldDef } from 'vega-lite/build/src/channeldef';

export type UnitStyle = 'square' | 'treemap' | 'normalize';

interface TransformItem<T extends Vega.Transforms> {
    transform: T;
    i: number;
}

export function unitize(inputSpec: TopLevelUnitSpec, outputSpec: Vega.Spec, unitStyle: UnitStyle) {
    const facet = inputSpec.encoding.facet;
    if (facet) {
        unitizeFaceted(inputSpec, outputSpec, unitStyle);
    } else {
        unitizeBasic(inputSpec, outputSpec, unitStyle);
    }
}

function unitizeFaceted(inputSpec: TopLevelUnitSpec, outputSpec: Vega.Spec, unitStyle: UnitStyle) {
}

function unitizeBasic(inputSpec: TopLevelUnitSpec, outputSpec: Vega.Spec, unitStyle: UnitStyle) {
    const xEncoding = inputSpec.encoding.x as TypedFieldDef<string, StandardType>;
    const quantitativeX = xEncoding.type === 'quantitative';

    const xScaleName = quantitativeX ? 'xb' : 'x';

    outputSpec.signals = outputSpec.signals || [];
    addSignals(outputSpec.signals, xScaleName);

    const data0 = outputSpec.data[0];
    const transforms = convertAggregateToWindow(data0);

    const mark0 = outputSpec.marks[0];
    modifyMark(mark0, transforms.aggregateTransform.groupby[0], quantitativeX && 'bx * bandPadding');

    const yScale = findScaleByName<Vega.LinearScale>(outputSpec.scales, 'y');
    modifyYScale(yScale);

    if (quantitativeX) {
        const binTransform = findTransformByType<Vega.BinTransform>(data0, 'bin');
        const binSignalName = binTransform.transform.signal;

        addSequence(outputSpec.data, binSignalName);

        const xScale = findScaleByName<Vega.LinearScale>(outputSpec.scales, 'x');
        const range = xScale.range as any;

        addXBandScale(outputSpec.scales, range);

    } else {
        const xScale = findScaleByName<Vega.BandScale>(outputSpec.scales, 'x');
        modifyXScale(xScale);
    }
}

function convertAggregateToWindow(data: Vega.Data) {
    //add identifier preceding aggregate
    const idts: Vega.IdentifierTransform = {
        type: 'identifier',
        as: 'id'
    };
    data.transform.unshift(idts);

    const aggregateItem = findTransformByType<Vega.AggregateTransform>(data, 'aggregate') || { transform: null, i: 0 };

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
    data.transform[aggregateItem.i] = windowTransform;

    data.transform.push({
        type: "extent",
        field: "__count",
        signal: "maxcount"
    })

    //remove stack
    const stackItem = findTransformByType<Vega.StackTransform>(data, 'stack');
    if (stackItem) {
        data.transform.splice(stackItem.i, 1);
    }

    return { aggregateTransform: aggregateItem.transform, windowTransform };
}

function addSequence(data: Vega.Data[], binSignalName: string) {
    data.push({
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
}

function addSignals(signals: Vega.Signal[], xScaleName: string) {
    signals.push.apply(signals, [
        { name: "child_width", update: "width" },
        { name: "child_height", update: "height" },
        { name: "bx", update: `bandwidth('${xScaleName}')` },
        { name: 'bandPadding', value: 0.1 },
        { name: "cellcount", update: "ceil(sqrt(maxcount[1]*(bx/child_height)))" },
        { name: "gap", update: "min(0.1*(bx/(cellcount-1)),1)" },
        { name: "marksize", update: "bx/cellcount-gap" }
    ]);
}

function addXBandScale(scales: Vega.Scale[], range: Vega.RangeBand) {
    scales.push({
        name: "xb",
        type: "band",
        domain: {
            data: "seq",
            field: "data",
            sort: true
        },
        range,
        padding: {
            signal: 'bandPadding'
        }
    });
}

function modifyMark(mark0: Vega.Mark, field: string, offsetAdditionExpression?: string) {
    const { update } = mark0.encode;

    const expressions = ['bx /cellcount * ( (datum.__count-1) %cellcount)'];
    if (offsetAdditionExpression) {
        expressions.push(offsetAdditionExpression);
    }

    update.x = {
        scale: "x",
        field,
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
}

function modifyXScale(xScale: Vega.BandScale) {
    delete xScale.paddingInner;
    delete xScale.paddingOuter;
    xScale.padding = { signal: 'bandPadding' };
}

function modifyYScale(yScale: Vega.LinearScale) {
    const yDomain = yScale.domain as Vega.DataRef;
    //change y scale to __count only
    yDomain.field = "__count";
    const yDomain2 = yScale.domain as Vega.MultiDataRef;
    delete yDomain2.fields;
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
