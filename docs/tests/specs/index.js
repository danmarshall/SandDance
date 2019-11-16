function addTag(tagName, innerText) {
    const el = document.createElement(tagName);
    if (innerText) {
        el.innerText = innerText;
    }
    document.body.appendChild(el);
    return el;
}

function view(name, spec) {
    addTag('h3', name);
    const div = addTag('div');
    try {
        const runtime = vega.parse(spec);
        new vega.View(runtime).initialize(div).renderer('canvas').run();
    } catch (e) {
        div.innerText = `failed`;
    }
}

function list() {
    conversions.forEach(conversion => {
        addTag('h2', conversion.src);

        const spec = vegaLite.compile(conversion.vegaLiteSpec).spec;
        console.log(spec);
        view('original from vega lite', spec);

        conversion.downloads.forEach(download => {
            view(download.src, download.spec);
        })

        addTag('hr');
    });
}

const tally = {
    src: {
        goal: conversions.length,
        actual: 0
    },
    outputs: {
        goal: 0,
        actual: 0
    }
};

function checkAll() {
    if (tally.src.actual == tally.src.goal && tally.outputs.actual === tally.outputs.goal) {
        conversions.forEach(conversion => {
            conversion.downloads.sort((a, b) => a.src.localeCompare(b.src));
        })
        list();
    }
}

conversions.sort((a, b) => a.src.localeCompare(b.src));

conversions.forEach(conversion => {
    tally.outputs.goal += conversion.outputs.length;
    fetch(`input/${conversion.src}`).then(response => {
        response.json().then(spec => {
            conversion.vegaLiteSpec = spec;
            tally.src.actual++;
            checkAll();
        });
    });
    conversion.downloads = [];
    conversion.outputs.forEach(src => {
        fetch(`output/${src}`).then(response => {
            response.json().then(spec => {
                const download = { src, spec };
                conversion.downloads.push(download);
                tally.outputs.actual++;
                checkAll();
            });
        });
    });
});
