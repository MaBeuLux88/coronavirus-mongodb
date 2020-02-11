exports = async function () {
    const confirmed = context.services.get("mongodb-atlas").db("coronavirus").collection("confirmed");
    const deaths = context.services.get("mongodb-atlas").db("coronavirus").collection("deaths");
    const recovered = context.services.get("mongodb-atlas").db("coronavirus").collection("recovered");

    confirmed.deleteMany({}).then(result => console.log(JSON.stringify(result)));
    deaths.deleteMany({}).then(result => console.log(JSON.stringify(result)));
    recovered.deleteMany({}).then(result => console.log(JSON.stringify(result)));

    const csv_confirmed = await context.http.get({url: "https://raw.githubusercontent.com/CSSEGISandData/2019-nCoV/master/time_series/time_series_2019-ncov-Confirmed.csv"});
    const csv_deaths = await context.http.get({url: "https://raw.githubusercontent.com/CSSEGISandData/2019-nCoV/master/time_series/time_series_2019-ncov-Deaths.csv"});
    const csv_recovered = await context.http.get({url: "https://raw.githubusercontent.com/CSSEGISandData/2019-nCoV/master/time_series/time_series_2019-ncov-Recovered.csv"});

    let docs_confirmed = import_csv(csv_confirmed.body.text(), "confirmed");
    let docs_deaths = import_csv(csv_deaths.body.text(), "deaths");
    let docs_recovered = import_csv(csv_recovered.body.text(), "recovered");

    console.log(JSON.stringify(await confirmed.insertMany(docs_confirmed)));
    console.log(JSON.stringify(await deaths.insertMany(docs_deaths)));
    console.log(JSON.stringify(await recovered.insertMany(docs_recovered)));
    return 0;
};

function import_csv(csv, field) {
    csv = csv.replace(/Mainland /g, "");

    const lines = csv.split("\n");
    const headers = lines[0].split(",");
    const nb_entries = headers.length - 4;

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
        current_line = shift_line(current_line);

        for (let j = 0; j < nb_entries; j++) {
            const value = parseInt(extract_next(current_line)) || 0;
            current_line = shift_line(current_line);
            const date = headers[j + 4];
            const iso_date = toIsoDate(date);

            let doc = {
                state: state,
                country: country,
                loc: {type: "Point", coordinates: [long, lat]},
                date: date,
                iso_date: iso_date
            };
            doc[field] = value;
            docs.push(doc);
        }
    }
    return docs;
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

function shift_line(line) {
    if (line.indexOf("\"") === 0) {
        line = line.split("\"")[2];
    } else {
        line = line.split(",").slice(1).join(",");
    }
    return line;
}

function extract_next(line) {
    return line.split(",")[0];
}

function toIsoDate(date) {
    const date_parts = date.trim().split(" ");
    const parts = date_parts[0].split("/");
    const year = "20" + parts[2];
    const month = ("0" + parts[0]).slice(-2);
    const day = ("0" + parts[1]).slice(-2);
    return new Date(year + "-" + month + "-" + day + "T" + date_parts[1]);
}
