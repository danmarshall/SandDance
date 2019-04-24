// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as VegaDeckGl from './vega-deck.gl';
import { FieldNames } from './specs/constants';
import { Color } from '@deck.gl/core/utils/color';
import {
    ColorContext,
    ColorMap,
    ColorMethod,
    ViewerOptions,
    ColorMappedItem
} from './types';

export function getSelectedColorMap(currentData: object[], showSelectedData: boolean, showActive: boolean, viewerOptions: ViewerOptions) {
    function getSelectionColorItem(datum: object) {
        let item: ColorMappedItem;
        if (showSelectedData) {
            item = datum[FieldNames.Selected] ?
                { color: viewerOptions.colors.selectedCube }
                :
                { unSelected: true };
        }
        if (showActive && datum[FieldNames.Active]) {
            item = { color: viewerOptions.colors.activeCube };
        }
        return item;
    }
    const colorMap: ColorMap = {};
    currentData.forEach(datum => {
        const selectionColor = getSelectionColorItem(datum);
        if (selectionColor) {
            const ordinal = datum[VegaDeckGl.constants.GL_ORDINAL];
            colorMap[ordinal] = selectionColor;
        }
    });
    return colorMap;
}

export function colorMapFromCubes(cubes: VegaDeckGl.types.Cube[]) {
    const map: ColorMap = {};
    cubes.forEach(cube => {
        map[cube.ordinal] = { color: cube.color };
    });
    return map;
}

export function populateColorContext(colorContext: ColorContext, presenter: VegaDeckGl.Presenter) {
    if (!colorContext.colorMap) {
        const cubes = presenter.getCubeData();
        colorContext.colorMap = colorMapFromCubes(cubes);
    }
    colorContext.legend = VegaDeckGl.util.clone(presenter.stage.legend);
    colorContext.legendElement = presenter.getElement(VegaDeckGl.PresenterElement.legend).children[0] as HTMLElement
}

export function applyColorMapToCubes(maps: ColorMap[], cubes: VegaDeckGl.types.Cube[], unselectedColorMethod?: ColorMethod) {
    Object.keys(maps[0]).forEach(ordinal => {
        const cube = cubes[+ordinal];
        if (cube) {
            const actualColorMappedItem: ColorMappedItem = maps[0][ordinal];
            if (maps.length > 1) {
                const selectedColorMappedItem: ColorMappedItem = maps[1][ordinal];
                if (selectedColorMappedItem) {
                    if (selectedColorMappedItem.unSelected && unselectedColorMethod) {
                        cube.color = unselectedColorMethod(actualColorMappedItem.color);
                    } else {
                        cube.color = selectedColorMappedItem.color;
                    }
                    return;
                }
            }
            cube.color = actualColorMappedItem.color;
        }
    });
}
