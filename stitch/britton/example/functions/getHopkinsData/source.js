exports = async function () {
    const temp = context.services.get("mongodb-atlas").db("coronavirus").collection("temp");
    await temp.deleteMany({});

    const csv_confirmed = await context.http.get({url: "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Confirmed.csv"});
    const csv_deaths = await context.http.get({url: "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Deaths.csv"});
    const csv_recovered = await context.http.get({url: "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Recovered.csv"});

    let csv_confirmed_lines = extract_lines(csv_confirmed.body.text());
    let csv_deaths_lines = extract_lines(csv_deaths.body.text());
    let csv_recovered_lines = extract_lines(csv_recovered.body.text());

    const dates = extract_dates_from_headers(csv_confirmed_lines);
    const docs_template = generate_docs_template(csv_confirmed_lines);

    csv_confirmed_lines = remove_first_four_column_and_header(csv_confirmed_lines);
    csv_deaths_lines = remove_first_four_column_and_header(csv_deaths_lines);
    csv_recovered_lines = remove_first_four_column_and_header(csv_recovered_lines);

    let docs = [];

    for (let column_index = 0; column_index < dates.length; column_index++) {
        let current_docs = JSON.parse(JSON.stringify(docs_template));
        for (let i = 0; i < current_docs.length; i++) {
            let doc = current_docs[i];
            set_dates(doc, dates[column_index]);
            csv_confirmed_lines[i] = extract_data(doc, csv_confirmed_lines[i], "confirmed");
            csv_deaths_lines[i] = extract_data(doc, csv_deaths_lines[i], "deaths");
            csv_recovered_lines[i] = extract_data(doc, csv_recovered_lines[i], "recovered");
        }
        docs = docs.concat(current_docs);
    }

    await temp.insertMany(docs);

    console.log("Renaming collection \"temp\" to \"statistics\".");
    console.log("New data published at: ", new Date());
    await temp.aggregate([{$out: "statistics"}]).next();
    return temp.deleteMany({});
};

function generate_docs_template(lines) {
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

        let doc = {country: country, loc: {type: "Point", coordinates: [long, lat]}};
        if (state !== "") {
            doc.state = state;
        }
        docs.push(doc);
    }
    return docs;
}

function extract_data(doc, csv_line, field) {
    doc[field] = parseInt(extract_next(csv_line));
    return shift_line(csv_line);
}

function set_dates(doc, date) {
    doc.date = date;
    doc.iso_date = to_iso_date(date);
}

function remove_first_four_column_and_header(lines) {
    return lines.slice(1).map(line => shift_line(line, 4));
}

function extract_lines(csv) {
    return csv.replace(/Mainland /g, "").replace(/Others/g, "Diamond Princess cruise ship").trim().split("\n");
}

function extract_dates_from_headers(lines) {
    return lines[0].split(",").slice(4).map(date => date.trim());
}

function extract_state(line) {
    let state;
    if (line.indexOf("\"") === 0) {
        state = line.split("\"")[1].trim();
    } else {
        state = line.split(",")[0].trim();
    }
    return state;
}

function shift_line(line, times = 1) {
    for (let i = 0; i < times; i++) {
        if (line.indexOf("\"") === 0) {
            line = line.split("\"")[2].substring(1);
        } else {
            line = line.split(",").slice(1).join(",");
        }
    }
    return line;
}

function extract_next(line) {
    return line.split(",")[0].trim();
}

function to_iso_date(date) {
    const date_parts = date.trim().split("/");
    const year = "20" + date_parts[2];
    const month = ("0" + date_parts[0]).slice(-2);
    const day = ("0" + date_parts[1]).slice(-2);
    return new Date(year + "-" + month + "-" + day);
}
