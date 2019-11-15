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

export function unitizeBar(inputSpec: TopLevelUnitSpec, outputSpec: Vega.Spec, unitStyle: UnitStyle) {
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
    const yEncoding = inputSpec.encoding.y as TypedFieldDef<string, StandardType>;
    let bandEncoding: TypedFieldDef<string, StandardType>;
    let isBar = false;
    let quantitativeBand: boolean;
    let bandDim: string;
    let countDim: string;
    let countSize: string;

    if (xEncoding.aggregate) {
        isBar = true;
        bandDim = 'y';
        countDim = 'x';
        countSize = 'child_width';
        bandEncoding = yEncoding;
    } else {
        isBar = false;
        bandDim = 'x';
        countDim = 'y';
        countSize = 'child_height';
        bandEncoding = xEncoding;
    }

    quantitativeBand = bandEncoding.type === 'quantitative';

    const bandScaleName = quantitativeBand ? 'quantBand' : bandDim;

    outputSpec.signals = outputSpec.signals || [];
    addSignals(outputSpec.signals, bandScaleName, countSize);

    const data0 = outputSpec.data[0];
    const transforms = convertAggregateToWindow(data0);

    const sss = quantitativeBand
        ?
        isBar ? '(-bandWidth - 0.5*bandWidth * bandPadding)' : '(0.75*bandWidth * bandPadding)'
        :
        isBar ? '' : '(0.25 * bandWidth * bandPadding)';

    const mark0 = outputSpec.marks[0];
    modifyMark(mark0, !isBar, bandDim, countDim, bandDim, countDim, transforms.aggregateTransform.groupby[0], sss);

    const yScale = findScaleByName<Vega.LinearScale>(outputSpec.scales, countDim);
    modifyCountScale(yScale);

    if (quantitativeBand) {
        const binTransform = findTransformByType<Vega.BinTransform>(data0, 'bin');
        const binSignalName = binTransform.transform.signal;

        addSequence(outputSpec.data, binSignalName);

        const bandScale = findScaleByName<Vega.LinearScale>(outputSpec.scales, bandDim);
        const range = bandScale.range as any;

        addBandScale(outputSpec.scales, 'quantBand', range);

    } else {
        const bandScale = findScaleByName<Vega.BandScale>(outputSpec.scales, bandDim);
        modifyBandScale(bandScale);
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

function addSignals(signals: Vega.Signal[], bandScaleName: string, countSize: string) {
    signals.push.apply(signals, [
        { name: "child_width", update: "width" },
        { name: "child_height", update: "height" },
        { name: "bandWidth", update: `bandwidth('${bandScaleName}')` },
        { name: 'bandPadding', value: 0.1 },
        { name: "cellcount", update: `ceil(sqrt(maxcount[1]*(bandWidth/${countSize})))` },
        { name: "gap", update: "min(0.1*(bandWidth/(cellcount-1)),1)" },
        { name: "marksize", update: "bandWidth/cellcount-gap" }
    ]);
}

function addBandScale(scales: Vega.Scale[], name: string, range: Vega.RangeBand) {
    scales.push({
        name,
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

function modifyMark(mark0: Vega.Mark, subtractMarksize: boolean, bandDim: string, countDim: string, bandScaleName: string, countScaleName: string, field: string, offsetAdditionExpression?: string) {
    const { update } = mark0.encode;

    const expressions = ['bandWidth /cellcount * ( (datum.__count-1) %cellcount)'];
    if (offsetAdditionExpression) {
        expressions.push(offsetAdditionExpression);
    }

    update[bandDim] = {
        scale: bandScaleName,
        field,
        offset: {
            signal: expressions.join(' + ')
        }
    };
    update[countDim] = {
        signal: `scale('${countScaleName}', floor((datum.__count-1)/cellcount) * cellcount)${subtractMarksize ? '-marksize' : ''}`
    };

    update.width = update.height = { signal: "marksize" };
    delete update.x2;
    delete update.y2;
}

function modifyBandScale(bandScale: Vega.BandScale) {
    delete bandScale.paddingInner;
    delete bandScale.paddingOuter;
    bandScale.padding = { signal: 'bandPadding' };
}

function modifyCountScale(countScale: Vega.LinearScale) {
    const domain = countScale.domain as Vega.DataRef;
    //change y scale to __count only
    domain.field = "__count";
    const domain2 = countScale.domain as Vega.MultiDataRef;
    delete domain2.fields;
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
