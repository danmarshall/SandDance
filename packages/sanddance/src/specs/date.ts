// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { Column, SpecContext } from './types';
import { Data, Transforms, FormulaTransform, ExtentTransform, Signal } from 'vega-typings';
import { FieldNames, DataNames, SignalNames } from './constants';

const seconds = 1000;
const minutes = seconds * 60;
const hours = minutes * 60;
const days = hours * 24;
const years = days * 365.25;
const quarters = years / 4;
const months = years / 12;
const decades = years * 10;
const centuries = years * 100;
const millenia = years * 1000;

const yearformat = '%Y';
const quarterformat = 'Q%q %Y';
const monthformat = '%b %Y';
const weekformat = '%V %Y';
const dayformat = '%x';
const hourformat = '%x %H:00';
const minuteformat = '%x %H:%M';
const secondformat = '%x %H:%M:%S';

export function dateTransforms(column: Column) {

    //TODO based on extents, inject appropriate transforms

    console.log((column.stats.max - column.stats.min));

    const dateBinTransforms: Transforms[] = [
        //remove any nulls, which will cause a failure in the extents transform
        {
            type: "filter",
            expr: `datum[${JSON.stringify(column.name)}]`
        },
        {
            type: "formula",
            expr: `floor(year(datum[${JSON.stringify(column.name)}])/1000)*1000`,
            as: FieldNames.DateBinMillenium
        },
        {
            type: "formula",
            expr: `floor(year(datum[${JSON.stringify(column.name)}])/100)*100`,
            as: FieldNames.DateBinCentury
        },
        {
            type: "formula",
            expr: `floor(year(datum[${JSON.stringify(column.name)}])/10)*10`,
            as: FieldNames.DateBinDecade
        },
        {
            type: "formula",
            expr: `timeFormat(datum[${JSON.stringify(column.name)}], '${yearformat}')`,
            as: FieldNames.DateBinYear
        },
        {
            type: "formula",
            expr: `timeFormat(datum[${JSON.stringify(column.name)}], '${quarterformat}')`,
            as: FieldNames.DateBinQuarter
        },
        {
            type: "formula",
            expr: `timeFormat(datum[${JSON.stringify(column.name)}], '${monthformat}')`,
            as: FieldNames.DateBinMonth
        },
        {
            type: "formula",
            expr: `timeFormat(datum[${JSON.stringify(column.name)}], '${weekformat}')`,
            as: FieldNames.DateBinWeek
        },
        {
            type: "formula",
            expr: `timeFormat(datum[${JSON.stringify(column.name)}], '${dayformat}')`,
            as: FieldNames.DateBinDay
        },
        {
            type: "formula",
            expr: `timeFormat(datum[${JSON.stringify(column.name)}], '${hourformat}')`,
            as: FieldNames.DateBinHour
        },
        {
            type: "formula",
            expr: `timeFormat(datum[${JSON.stringify(column.name)}], '${minuteformat}')`,
            as: FieldNames.DateBinMinute
        },
        {
            type: "formula",
            expr: `timeFormat(datum[${JSON.stringify(column.name)}], '${secondformat}')`,
            as: FieldNames.DateBinSecond
        }
    ];
    const extents = dateBinTransforms.filter((t: FormulaTransform) => t.as).map((t: FormulaTransform) => {
        const e: ExtentTransform = {
            type: 'extent',
            field: t.as,
            signal: t.as
        };
        return e;
    })
    return dateBinTransforms.concat(extents);
}

function dateSequence(name: string, column: Column, datebin: string) {
    const data: Data = {
        name,
        transform: [
            {
                type: 'sequence',
                start: {
                    signal: `start`
                },
                stop: {
                    signal: `stop`
                },
                step: {
                    signal: `step`
                }
            },
            {
                type: 'formula',
                expr: `'${datebin}'`,
                as: 'datebin'
            }
        ]
    }
    return data;
}

export function dateSequences(column: Column) {
}

interface DateFormat {
    display: string,
    format: string;
}

export function dateFormats(context: SpecContext, column: Column) {
    const { language } = context.specViewOptions;

    //TODO based on extents, inject appropriate transforms

    const data: Data[] = [
        {
            name: `${SignalNames.DateBin}${column.name}_all`,
            values: <DateFormat[]>[
                { display: language.dateBinMillenium, format: yearformat },
                { display: language.dateBinCentury, format: yearformat },
                { display: language.dateBinDecade, format: yearformat },
                { display: language.dateBinYear, format: yearformat },
                { display: language.dateBinQuarter, format: quarterformat },
                { display: language.dateBinMonth, format: monthformat },
                { display: language.dateBinWeek, format: weekformat },
                { display: language.dateBinDay, format: dayformat },
                { display: language.dateBinHour, format: hourformat },
                { display: language.dateBinMinute, format: minuteformat },
                { display: language.dateBinSecond, format: secondformat }
            ]
        },
        {
            name: `${SignalNames.DateBin}${column.name}_selected`,
            source: `${SignalNames.DateBin}${column.name}_all`,
            transform: [
                {
                    type: 'filter',
                    expr: `datum['display'] == ${SignalNames.DateBin}${column.name}_display`
                }
            ]
        }
    ]
    return data;
}

export function dateSignals(context: SpecContext, column: Column) {
    const { language } = context.specViewOptions;

    //TODO determine appropriate initial value
    const init: DateFormat = {
        display: language.dateBinYear,
        format: yearformat
    }

    const signals: Signal[] = [
        {
            name: `${SignalNames.DateBin}${column.name}_display`,
            value: init.display,
            bind: {
                name: 'TODO Date bin',
                input: 'select',
                options: [
                    language.dateBinMillenium,
                    language.dateBinCentury,
                    language.dateBinDecade,
                    language.dateBinYear,
                    language.dateBinQuarter,
                    language.dateBinMonth,
                    language.dateBinWeek,
                    language.dateBinDay,
                    language.dateBinHour,
                    language.dateBinMinute,
                    language.dateBinSecond
                ]
            }
        },
        {
            name: `${SignalNames.DateBin}${column.name}_format`,
            update: `data('${SignalNames.DateBin}${column.name}_selected')[0] ? data('${SignalNames.DateBin}${column.name}_selected')[0].format : '${init.format}'`
        }
    ];

    return signals;
}
