// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { AggregateContainer, AggregateContainerProps } from '../layouts/aggregateContainer';
import { AxisScale, AxisScales } from '../interfaces';
import { Band, BandProps } from '../layouts/band';
import { defaultBins, maxbins, minBarBandWidth } from '../defaults';
import { Layout, LayoutProps } from '../layouts/layout';
import { SignalNames } from '../constants';
import { Slice, SliceProps } from '../layouts/slice';
import { SpecBuilderProps } from '../specBuilder';
import { SpecContext } from '../types';
import { Square, SquareProps } from '../layouts/square';
import { Strip, StripProps } from '../layouts/strip';
import { Treemap, TreemapProps } from '../layouts/treemap';

export default function (specContext: SpecContext): SpecBuilderProps {
    const { insight, specColumns, specViewOptions } = specContext;
    const { language } = specViewOptions;
    let footprintClass: typeof Layout = AggregateContainer;
    const bandProps: BandProps = {
        addScaleAxes: true,
        orientation: 'vertical',
        groupby: {
            column: specColumns.x,
            defaultBins,
            maxbinsSignalName: SignalNames.XBins,
            maxbinsSignalDisplayName: specContext.specViewOptions.language.XMaxBins,
            maxbins
        },
        minBandWidth: minBarBandWidth
    };
    const barProps: AggregateContainerProps = {
        addScaleAxes: true,
        globalAggregateMaxExtentSignal: 'globalAggregateMaxExtent',
        globalAggregateMaxExtentScaledSignal: 'globalAggregateMaxExtentScaled',
        parentSize: 'parentSize',
        orientation: 'vertical',
        sumBy: specColumns.sum
    };
    let footprintProps: LayoutProps = barProps;
    let unitLayoutClass: typeof Layout;
    let unitLayoutProps: LayoutProps;
    const y: AxisScale = { title: null };
    const axisScales: AxisScales = {
        x: { title: specColumns.x && specColumns.x.name },
        y,
        z: { title: specColumns.z && specColumns.z.name }
    };
    switch (insight.sumStyle) {
        case 'treemap': {
            //TODO disable sort
            y.aggregate = 'sum';
            y.title = language.sum;
            unitLayoutClass = Treemap;
            const treemapProps: TreemapProps = {
                corner: 'bottom-left',
                size: specColumns.sum,
                treeMapMethod: specViewOptions.language.treeMapMethod,
                z: specColumns.z,
                zSize: null
            };
            // barProps.onBuild = barBuild => {
            //     //treemapProps.maxGroupedUnits = barBuild.globalAggregateMaxExtentSignal;
            //     //treemapProps.maxGroupedFillSize = `(${barBuild.globalAggregateMaxExtentScaledSignal})`;
            //     treemapProps.zSize = barBuild.parentSize;
            // }
            unitLayoutProps = treemapProps;
            break;
        }
        case 'strip': {
            y.aggregate = 'sum';
            y.title = language.sum;
            unitLayoutClass = Strip;
            const stripProps: StripProps = { orientation: 'horizontal' };
            unitLayoutProps = stripProps;
            break;
        }
        case 'strip-percent': {
            y.aggregate = 'percent';
            y.title = language.percent;
            footprintClass = Slice;
            //const sliceProps: SliceProps = { orientation: 'vertical', groupby: barProps.groupby };
            //footprintProps = sliceProps;
            unitLayoutClass = Strip;
            const stripProps: StripProps = { orientation: 'horizontal' };
            unitLayoutProps = stripProps;
            break;
        }
        default: {
            y.aggregate = 'count';
            y.title = language.count;
            unitLayoutClass = Square;
            const squareProps: SquareProps = {
                sortBy: specColumns.sort,
                fillDirection: 'right-up',
                z: specColumns.z,
                maxGroupedUnits: barProps.globalAggregateMaxExtentSignal,
                maxGroupedFillSize: barProps.globalAggregateMaxExtentScaledSignal,
                zSize: barProps.parentSize,

            };
            // barProps.onBuild = barBuild => {
            //     squareProps.maxGroupedUnits = barBuild.globalAggregateMaxExtentSignal;
            //     squareProps.maxGroupedFillSize = `(${barBuild.globalAggregateMaxExtentScaledSignal})`;
            //     squareProps.zSize = barBuild.parentSize;
            // };
            unitLayoutProps = squareProps;
            break;
        }
    }
    footprintProps.addScaleAxes = true;
    return {
        axisScales,
        layouts: [
            {
                layoutClass: Band,
                props: bandProps
            },
            {
                layoutClass: footprintClass,
                props: footprintProps
            },
            {
                layoutClass: unitLayoutClass,
                props: unitLayoutProps
            }
        ],
        specCapabilities: {
            roles: [
                {
                    role: 'x',
                    binnable: true,
                    axisSelection: specColumns.x && specColumns.x.quantitative ? 'range' : 'exact',
                    signals: [SignalNames.XBins]
                },
                {
                    role: 'z',
                    allowNone: true
                },
                {
                    role: 'color',
                    allowNone: true
                },
                {
                    role: 'sort',
                    allowNone: true
                },
                {
                    role: 'sum',
                    allowNone: false,
                    excludeCategoric: true,
                    signals: [SignalNames.TreeMapMethod]
                },
                {
                    role: 'facet',
                    allowNone: true,
                    signals: [SignalNames.FacetBins]
                },
                {
                    role: 'facetV',
                    allowNone: true,
                    signals: [SignalNames.FacetVBins]
                }
            ]
        }
    };
}
