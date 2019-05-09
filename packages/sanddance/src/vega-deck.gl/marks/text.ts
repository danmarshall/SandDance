// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { AlignmentBaseline, TextAnchor, TextLayerDatum } from '@deck.gl/layers/text-layer/text-layer';
import { base } from '../base';
import { colorFromString } from '../color';
import { GroupType, MarkStager, MarkStagerOptions } from './interfaces';
import {
    Scene,
    SceneText,
    SceneTextAlign,
    SceneTextBaseline
} from 'vega-typings';
import { Stage, TextLayerItem, TickText } from '../interfaces';

const markStager: MarkStager = (options: MarkStagerOptions, stage: Stage, scene: Scene, x: number, y: number, groupType: GroupType) => {

    //scale Deck.Gl text to Vega size
    const fontScale = 9;

    //change direction of y from SVG to GL
    const ty = -1;

    base.vega.sceneVisit(scene, function (item: SceneText) {
        if (!item.text) return;
        const size = item.fontSize * fontScale;
        const textItem: TextLayerItem = {
            textRole: item.mark.role,
            color: colorFromString(item.fill),
            text: item.text.toString(),
            position: [x + item.x - options.offsetX, ty * (y + item.y - options.offsetY), 0],
            size,
            angle: convertAngle(item.angle),
            textAnchor: convertAlignment(item.align),
            alignmentBaseline: convertBaseline(item.baseline)
        };

        if (item.mark.role === "axis-label") {
            const tickText = textItem as TickText;
            tickText.value = item.datum['value'];
            options.currAxis.tickText.push(tickText);
        } else if (options.currFacetRect && !options.currFacetRect.facetTitle) {
            options.currFacetRect.facetTitle = textItem;
        } else {
            if (item.mark.role === "axis-title") {
                let { x1, x2, y1, y2 } = item.bounds;
                x1 += x - options.offsetX;
                x2 += x - options.offsetX;
                y1 += y - options.offsetY;
                y2 += y - options.offsetY;
                y1 *= ty;
                y2 *= ty;
                options.currAxis.titleRect = { x1, x2, y1, y2 };
            }
            stage.textData.push(textItem);
        }
    });
}

function convertAngle(vegaTextAngle: number) {
    return 360 - vegaTextAngle;
}

function convertAlignment(textAlign: SceneTextAlign): TextAnchor {
    switch (textAlign) {
        case 'center': return 'middle';
        case 'left': return 'start';
        case 'right': return 'end'
    }
}

function convertBaseline(baseline: SceneTextBaseline): AlignmentBaseline {
    switch (baseline) {
        case 'middle': return 'center';
    }
    return baseline;
}

export default markStager;
