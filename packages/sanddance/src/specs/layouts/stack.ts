// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { Layout, LayoutProps } from "./layout";
import { Orientation } from "../interfaces";

export interface StackProps extends LayoutProps {
    orientation: Orientation;
}

export class Stack extends Layout {

}