exports = async function () {
    const statistics = context.services.get("mongodb-atlas").db("coronavirus").collection("statistics");
    statistics.deleteMany({}).then(result => console.log(JSON.stringify(result)));

    const csv_confirmed = await context.http.get({url: "https://raw.githubusercontent.com/CSSEGISandData/2019-nCoV/master/time_series/time_series_2019-ncov-Confirmed.csv"});
    const csv_deaths = await context.http.get({url: "https://raw.githubusercontent.com/CSSEGISandData/2019-nCoV/master/time_series/time_series_2019-ncov-Deaths.csv"});
    const csv_recovered = await context.http.get({url: "https://raw.githubusercontent.com/CSSEGISandData/2019-nCoV/master/time_series/time_series_2019-ncov-Recovered.csv"});

    const dates = extract_dates_from_headers(csv_confirmed.body.text());
    let docs = generate_docs_template(csv_confirmed.body.text());

    for (let column_index = 0; column_index < dates.length; column_index++) {
        let current_docs = docs.slice();
        import_csv_update_docs(current_docs, dates[column_index], column_index, csv_confirmed.body.text(), "confirmed");
        import_csv_update_docs(current_docs, dates[column_index], column_index, csv_deaths.body.text(), "deaths");
        import_csv_update_docs(current_docs, dates[column_index], column_index, csv_recovered.body.text(), "recovered");
        await statistics.insertMany(current_docs);
    }
    statistics.updateMany({state: ""}, {$unset: {state: 1}});
    return 0;
};

function generate_docs_template(csv) {
    csv = csv.replace(/Mainland /g, "");
    const lines = csv.split("\n");
    let docs = [];

    for (let i = 1; i < lines.length; i++) {
        let current_line = lines[i];
        const state = extract_state(current_line);
        current_line = shift_line(current_line);
        const country = extract_next(current_line);
        current_line = shift_line(current_line);
        const lat = parseFloat(extract_next(current_line));
        current_line = shift_line(current_line);
        const long = parseFloat(extract_next(current_line));

        let doc = {
            state: state,
            country: country,
            loc: {type: "Point", coordinates: [long, lat]},
        };
        docs.push(doc);
    }
    return docs;
}

function import_csv_update_docs(docs, date, column_index, csv, field) {
    csv = csv.replace(/Mainland /g, "");
    const lines = csv.split("\n");

    for (let i = 1; i < lines.length; i++) {
        let current_line = lines[i];
        const state = extract_state(current_line);
        current_line = shift_line(current_line);
        const country = extract_next(current_line);
        current_line = shift_line(current_line, 3 + column_index);
        const value = parseInt(extract_next(current_line)) || 0;

        docs.forEach(doc => {
            if (doc.state === state && doc.country === country) {
                doc.date = date;
                doc.iso_date = to_iso_date(date);
                doc[field] = value;
            }
        });
    }
}

function extract_dates_from_headers(csv) {
    const lines = csv.split("\n");
    return lines[0].split(",").slice(4);
}

function extract_state(line) {
    let state;
    if (line.indexOf("\"") === 0) {
        const tokenList = line.split("\"");
        state = tokenList[1];
    } else {
        const tokenList = line.split(",");
        state = tokenList[0];
    }
    return state;
}

function shift_line(line, times = 1) {
    for (let i = 0; i < times; i++) {
        if (line.indexOf("\"") === 0) {
            line = (line.split("\""))[2].substring(1);
        } else {
            line = line.split(",").slice(1).join(",");
        }
    }
    return line;
}

function extract_next(line) {
    return line.split(",")[0];
}

function to_iso_date(date) {
    const date_parts = date.trim().split(" ");
    const parts = date_parts[0].split("/");
    const year = "20" + parts[2];
    const month = ("0" + parts[0]).slice(-2);
    const day = ("0" + parts[1]).slice(-2);
    return new Date(year + "-" + month + "-" + day + "T" + date_parts[1]);
}
