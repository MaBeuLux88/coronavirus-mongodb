let start_time;

exports = async function () {

    const temp = context.services.get("mongodb-atlas").db("dev").collection("temp");

    start_timer();
    await temp.deleteMany({});
    stop_timer("DeleteMany temp collection");

    start_timer();
    const csv_confirmed = await context.http.get({url: "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Confirmed.csv"});
    const csv_deaths = await context.http.get({url: "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Deaths.csv"});
    const csv_recovered = await context.http.get({url: "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Recovered.csv"});
    stop_timer("Download CSVs");

    start_timer();
    let csv_confirmed_lines = extract_lines(csv_confirmed.body.text());
    let csv_deaths_lines = extract_lines(csv_deaths.body.text());
    let csv_recovered_lines = extract_lines(csv_recovered.body.text());

    const dates = extract_dates_from_headers(csv_confirmed_lines);
    const docs_template = generate_docs_template(csv_confirmed_lines);

    csv_confirmed_lines = remove_first_four_column_and_header(csv_confirmed_lines);
    csv_deaths_lines = remove_first_four_column_and_header(csv_deaths_lines);
    csv_recovered_lines = remove_first_four_column_and_header(csv_recovered_lines);

    const confirmed_lines_arrays = split_to_array(csv_confirmed_lines);
    const deaths_lines_arrays = split_to_array(csv_deaths_lines);
    const recovered_lines_arrays = split_to_array(csv_recovered_lines);
    stop_timer("Process CSVs");

    let docs = [];

    start_timer();
    for (let col_index = 0; col_index < dates.length; col_index++) {
        let current_docs = JSON.parse(JSON.stringify(docs_template));
        for (let i = 0; i < current_docs.length; i++) {
            let doc = current_docs[i];
            set_dates(doc, dates[col_index]);
            set_data(doc, confirmed_lines_arrays[i][col_index], "confirmed");
            set_data(doc, deaths_lines_arrays[i][col_index], "deaths");
            set_data(doc, recovered_lines_arrays[i][col_index], "recovered");
            set_data(doc, confirmed_lines_arrays[i][col_index] - deaths_lines_arrays[i][col_index] - recovered_lines_arrays[i][col_index], "infected")
        }
        docs = docs.concat(current_docs);
    }
    stop_timer("Generate Docs");

    start_timer();
    await temp.insertMany(docs);
    stop_timer("InsertMany Docs");

    start_timer();
    await temp.aggregate([{$out: "statistics"}]).next();
    stop_timer("Renaming temp collection to statistics collection");

    start_timer();
    await temp.deleteMany({});
    stop_timer("DeleteMany temp collection");

    return "Job Done!";
};

function generate_docs_template(lines) {
    let docs = [];

    for (let i = 1; i < lines.length; i++) {
        let current_line = lines[i];
        const state = extract_next(current_line);
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

function set_data(doc, value, field) {
    doc[field] = parseInt(value) || 0;
}

function set_dates(doc, date) {
    doc.date = date;
    doc.iso_date = to_iso_date(date);
}

function remove_first_four_column_and_header(lines) {
    return lines.slice(1).map(line => shift_line(line, 4));
}

function split_to_array(lines) {
    return lines.map(line => line.split(","));
}

function extract_lines(csv) {
    return csv.trim().split("\n").filter(line => !/^".+?,.+?",US/.test(line));
}

function extract_dates_from_headers(lines) {
    return lines[0].split(",").slice(4).map(date => date.trim());
}

function extract_next(line) {
    let next;
    if (line.indexOf("\"") === 0) {
        next = line.split("\"")[1].trim();
    } else {
        next = line.split(",")[0].trim();
    }
    return next;
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

function to_iso_date(date) {
    const date_parts = date.trim().split("/");
    const year = "20" + date_parts[2];
    const month = ("0" + date_parts[0]).slice(-2);
    const day = ("0" + date_parts[1]).slice(-2);
    return new Date(year + "-" + month + "-" + day);
}

function start_timer() {
    start_time = new Date();
}

function stop_timer(message) {
    console.log("TOOK", (new Date() - start_time) / 1000, "s", "- TASK:", message, "- Started at:", start_time);
}
