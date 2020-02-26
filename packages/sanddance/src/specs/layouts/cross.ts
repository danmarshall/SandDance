// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { Binnable, binnable } from '../bin';
import { DiscreteColumn } from '../interfaces';
import { Layout, LayoutBuildProps, LayoutProps } from './layout';

export interface CrossProps extends LayoutProps {
    groupbyX: DiscreteColumn;
    groupbyY: DiscreteColumn;
}

export class Cross extends Layout {
    private binX: Binnable;
    private binY: Binnable;

    constructor(public props: CrossProps & LayoutBuildProps) {
        super(props);
        this.prefix = `cross_${this.id}`;
        this.binX = binnable(this.prefix, props.globalScope.dataName, props.groupbyX);
        this.binY = binnable(this.prefix, props.globalScope.dataName, props.groupbyY);
    }

    public getGrouping() {
        return this.binX.fields.concat(this.binY.fields);
    }

}
