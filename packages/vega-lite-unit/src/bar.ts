// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as Vega from 'vega-typings';
import { FacetEncodingFieldDef } from 'vega-lite/build/src/spec/facet';
import { Field, TypedFieldDef } from 'vega-lite/build/src/channeldef';
import { StandardType } from 'vega-lite/build/src/type';
import { TopLevelUnitSpec } from 'vega-lite/build/src/spec/unit';

export type UnitStyle = 'square' | 'treemap' | 'normalize';

interface TransformItem<T extends Vega.Transforms> {
    transform: T;
    i: number;
}

interface BarChartInfo {
    bandEncoding: TypedFieldDef<string, StandardType>;
    isBar: boolean;
    bandDim: string;
    countDim: string;
    countSize: string;
    quantitativeBand?: boolean;
    bandScaleName?: string;
}

export function unitizeBar(inputSpec: TopLevelUnitSpec, outputSpec: Vega.Spec, unitStyle: UnitStyle) {
    const xEncoding = inputSpec.encoding.x as TypedFieldDef<string, StandardType>;
    const yEncoding = inputSpec.encoding.y as TypedFieldDef<string, StandardType>;
    let info: BarChartInfo;
    if (xEncoding.aggregate) {
        info = {
            isBar: true,
            bandDim: 'y',
            countDim: 'x',
            countSize: 'child_width',
            bandEncoding: yEncoding
        };
    } else {
        info = {
            isBar: false,
            bandDim: 'x',
            countDim: 'y',
            countSize: 'child_height',
            bandEncoding: xEncoding
        };
    }
    info.quantitativeBand = info.bandEncoding.type === 'quantitative';
    info.bandScaleName = info.quantitativeBand ? 'quantBand' : info.bandDim;

    const facet = inputSpec.encoding.facet;
    if (facet) {
        unitizeFaceted(info, inputSpec, outputSpec, unitStyle, facet);
    } else {
        unitizeBasic(info, inputSpec, outputSpec, unitStyle);
    }
}

function unitizeFaceted(info: BarChartInfo, inputSpec: TopLevelUnitSpec, outputSpec: Vega.Spec, unitStyle: UnitStyle, facet: FacetEncodingFieldDef<Field>) {
    const data0 = outputSpec.data[0];

    //groupby needs to be by facet, then column group
    const transforms = convertAggregateToWindow(data0, (at) => [facet.field as Vega.FieldRef].concat(at.groupby as Vega.FieldRef[]));
}

function unitizeBasic(info: BarChartInfo, inputSpec: TopLevelUnitSpec, outputSpec: Vega.Spec, unitStyle: UnitStyle) {
    outputSpec.signals = outputSpec.signals || [];
    addSignals(outputSpec.signals, info.bandScaleName, info.countSize);

    const data0 = outputSpec.data[0];
    const transforms = convertAggregateToWindow(data0, (at) => [at.groupby[0]]);

    const positionCorrection = getPositionCorrection(info);

    const mark0 = outputSpec.marks[0];
    modifyMark(mark0, !info.isBar, info.bandDim, info.countDim, info.bandDim, info.countDim, transforms.aggregateTransform.groupby[0], positionCorrection);

    const yScale = findScaleByName<Vega.LinearScale>(outputSpec.scales, info.countDim);
    modifyCountScale(yScale);

    if (info.quantitativeBand) {
        const binTransform = findTransformByType<Vega.BinTransform>(data0, 'bin');
        const binSignalName = binTransform.transform.signal;

        addSequence(outputSpec.data, binSignalName);

        const bandScale = findScaleByName<Vega.LinearScale>(outputSpec.scales, info.bandDim);
        const range = bandScale.range as any;

        addBandScale(outputSpec.scales, 'quantBand', range);

    } else {
        const bandScale = findScaleByName<Vega.BandScale>(outputSpec.scales, info.bandDim);
        modifyBandScale(bandScale);
    }
}

function getPositionCorrection(info: BarChartInfo) {
    if (info.quantitativeBand) {
        return info.isBar
            ?
            '(-bandWidth - 0.5 * bandWidth * bandPadding)'
            :
            '(0.75 * bandWidth * bandPadding)'
    }
}

function convertAggregateToWindow(data: Vega.Data, getGroupby: (at: Vega.AggregateTransform) => Vega.FieldRef[]) {
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
        groupby: getGroupby(aggregateItem.transform),

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