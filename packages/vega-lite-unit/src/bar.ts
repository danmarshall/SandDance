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
    data0: Vega.Data;
    bandGroup?: string;
}

export function unitizeBar(inputSpec: TopLevelUnitSpec, outputSpec: Vega.Spec, unitStyle: UnitStyle) {
    const xEncoding = inputSpec.encoding.x as TypedFieldDef<string, StandardType>;
    const yEncoding = inputSpec.encoding.y as TypedFieldDef<string, StandardType>;
    const facet = inputSpec.encoding.facet;
    const data0 = outputSpec.data[0];
    let bandBinTransform: Vega.BinTransform;

    let info: BarChartInfo;
    if (xEncoding.aggregate) {
        info = {
            data0,
            isBar: true,
            bandDim: 'y',
            countDim: 'x',
            countSize: 'child_width',
            bandEncoding: yEncoding
        };
    } else {
        info = {
            data0,
            isBar: false,
            bandDim: 'x',
            countDim: 'y',
            countSize: 'child_height',
            bandEncoding: xEncoding
        };
    }
    info.quantitativeBand = info.bandEncoding.type === 'quantitative';

    if (info.quantitativeBand) {
        bandBinTransform = findBinTransform(data0, info.bandEncoding.field).transform;
        info.bandGroup = bandBinTransform.as[0];
        info.bandScaleName = 'quantBand';
        const binSignalName = bandBinTransform.signal;

        addSequence(outputSpec.data, binSignalName);

        const linearScale = findScaleByName<Vega.LinearScale>(outputSpec.scales, info.bandDim);
        const range = linearScale.range as any;

        addBandScale(outputSpec.scales, 'quantBand', range);

    } else {
        info.bandScaleName = info.bandDim;
        info.bandGroup = info.bandEncoding.field;

        const bandScale = findScaleByName<Vega.BandScale>(outputSpec.scales, info.bandDim);
        modifyBandScale(bandScale);
    }

    //add identifier
    const idts: Vega.IdentifierTransform = {
        type: 'identifier',
        as: 'id'
    };
    data0.transform.unshift(idts);

    outputSpec.signals = outputSpec.signals || [];
    addSignals(outputSpec.signals, info.bandScaleName, info.countSize, !facet);

    const markAndGroupBy = facet ?
        unitizeFaceted(info, outputSpec, facet)
        :
        unitizeBasic(info, outputSpec)
        ;

    const windowTransform = createWindowTransform(markAndGroupBy.groupby);
    const aggregateTransformIndex = findIndexOfTransformByType(data0, 'aggregate');
    info.data0.transform[aggregateTransformIndex] = windowTransform;

    const positionCorrection = getPositionCorrection(info);
    modifyMark(markAndGroupBy.mark0, !info.isBar, info.bandDim, info.countDim, info.bandDim, info.countDim, info.bandGroup, positionCorrection);

    //remove stack
    const stackTransformIndex = findIndexOfTransformByType(data0, 'stack');
    if (stackTransformIndex) {
        data0.transform.splice(stackTransformIndex, 1);
    }

    //add maxcount
    data0.transform.push({
        type: "extent",
        field: "__count",
        signal: "maxcount"
    })

    const yScale = findScaleByName<Vega.LinearScale>(outputSpec.scales, info.countDim);
    modifyCountScale(yScale);
}

function unitizeFaceted(info: BarChartInfo, outputSpec: Vega.Spec, facet: FacetEncodingFieldDef<Field>) {
    const facetQuantitative = facet.type === 'quantitative';
    let groupby: string[];
    //groupby needs to be by facet, then column group
    if (facetQuantitative) {
        const bandFacetTransform = findBinTransform(info.data0, facet.field as string);
        groupby = [
            bandFacetTransform.transform.as[0],
            info.bandGroup
        ];
    } else {
        groupby = [
            facet.field as string,
            info.bandGroup
        ];
    }
    const mark0 = findMarkWithScope(outputSpec.marks);
    return { mark0, groupby };
}

function unitizeBasic(info: BarChartInfo, outputSpec: Vega.Spec) {
    const mark0 = outputSpec.marks[0];
    return { mark0, groupby: [info.bandGroup] };
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

function createWindowTransform(groupby: Vega.FieldRef[]) {
    const wt: Vega.WindowTransform = {
        type: 'window',

        //group by facet, then by category / bin
        groupby,

        ops: ["count"],

        //Is sort necessary?
        //sort: { "field": ["id"], "order": ["ascending"] },

        fields: ["id"],
        as: ["__count"]
    };
    return wt;
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

function addSignals(signals: Vega.Signal[], bandScaleName: string, countSize: string, addChildSize: boolean) {
    if (addChildSize) {
        signals.push.apply(signals, [
            { name: "child_width", update: "width" },
            { name: "child_height", update: "height" },
        ]);
    }
    signals.push.apply(signals, [
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

function findMarkWithScope(ms: Vega.Mark[]) {
    for (let i = 0; i < ms.length; i++) {
        let m = ms[i];
        if (m.type === 'group') {
            const s = m as Vega.Scope;
            if (s.marks) {
                return s.marks[0];
            }
        }
    }
}

function findBinTransform(d: Vega.Data, fieldName: string) {
    for (let i = 0; i < d.transform.length; i++) {
        let transform = d.transform[i];
        if (transform.type === 'bin' && transform.field === fieldName) {
            return { transform, i } as TransformItem<Vega.BinTransform>;
        }
    }
}

function findIndexOfTransformByType(d: Vega.Data, type: 'aggregate' | 'stack') {
    for (let i = 0; i < d.transform.length; i++) {
        let transform = d.transform[i];
        if (transform.type === type) {
            return i;
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
