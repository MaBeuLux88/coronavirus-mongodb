exports = async function () {
    const statistics = context.services.get("mongodb-atlas").db("coronavirus").collection("statistics");
    statistics.deleteMany({}).then(result => console.log(JSON.stringify(result)));

    const csv_confirmed = await context.http.get({url: "https://raw.githubusercontent.com/CSSEGISandData/2019-nCoV/master/time_series/time_series_2019-ncov-Confirmed.csv"});
    // const csv_deaths = await context.http.get({url: "https://raw.githubusercontent.com/CSSEGISandData/2019-nCoV/master/time_series/time_series_2019-ncov-Deaths.csv"});
    // const csv_recovered = await context.http.get({url: "https://raw.githubusercontent.com/CSSEGISandData/2019-nCoV/master/time_series/time_series_2019-ncov-Recovered.csv"});

    import_csv(statistics, csv_confirmed.body.text(), "confirmed");
    // import_csv(statistics, csv_deaths.body.text(), "deaths");
    // import_csv(statistics, csv_recovered.body.text(), "recovered");

    return 0;
};

function import_csv(collection, csv, field) {
    csv = csv.replace(/Mainland /g, "");

    const lines = csv.split("\n");
    const headers = lines[0].split(",");
    const nb_entries = headers.length - 4;
    

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
            const value = parseInt(extract_next(current_line));
            current_line = shift_line(current_line);
            const date = headers[j + 4];
            const iso_date = toIsoDate(date);

            const value_obj = {};
            value_obj[field] = value;

            collection.updateOne(
                {_id: country + "," + state + "," + date},
                {
                    $setOnInsert: {
                        state: state,
                        country: country,
                        loc: {type: "Point", coordinates: [long, lat]},
                        date: date,
                        iso_date: iso_date
                    },
                    $set: value_obj
                },
                {upsert: true}
            ).then(() => {
            }).catch(err => console.error(`Failed to add review: ${err}`));
        }
    }
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
    return line
}

function extract_next(line) {
    return line.split(",")[0];
}

function toIsoDate(date) {
    //todo
    return date;
}
