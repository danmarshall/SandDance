// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { AxisScales } from '../interfaces';
import { Density, DensityProps } from '../layouts/density';
import { maxbins } from '../defaults';
import { SignalNames } from '../constants';
import { SpecBuilderProps } from '../specBuilder';
import { SpecContext } from '../types';
import { Square } from '../layouts/square';

export default function (specContext: SpecContext): SpecBuilderProps {
    const { specColumns } = specContext;
    const axisScales: AxisScales = {
        x: { type: 'discrete' },
        y: { type: 'discrete' },
        z: { type: 'zFloor' }
    };
    const densityProps: DensityProps = {
        mode: 'square',
        groupbyX: {
            column: specColumns.x,
            maxbins,
            maxbinsSignalDisplayName: 'TODO maxbins x',
            maxbinsSignalName: 'TODO maxbins x'
        },
        groupbyY: {
            column: specColumns.y,
            maxbins,
            maxbinsSignalDisplayName: 'TODO maxbins y',
            maxbinsSignalName: 'TODO maxbins y'
        },
        addScaleAxes: true
    };
    return {
        axisScales,
        layouts: [
            {
                layoutClass: Density,
                props: densityProps
            },
            {
                layoutClass: Square
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
                    role: 'y',
                    binnable: true,
                    axisSelection: specColumns.y && specColumns.y.quantitative ? 'range' : 'exact',
                    signals: [SignalNames.YBins]
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
                    role: 'facet',
                    allowNone: true
                },
                {
                    role: 'facetV',
                    allowNone: true
                }
            ]
        }
    };
}
