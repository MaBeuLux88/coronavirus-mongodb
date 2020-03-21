let start_time;

exports = async function () {

    const temp = context.services.get("mongodb-atlas").db("coronavirus").collection("temp");

    start_timer("DeleteMany temp collection");
    await temp.deleteMany({});
    stop_timer(start_time);

    start_timer("Download CSVs");
    const csv_confirmed = await context.http.get({url: "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Confirmed.csv"});
    const csv_deaths = await context.http.get({url: "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Deaths.csv"});
    const csv_recovered = await context.http.get({url: "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Recovered.csv"});
    stop_timer(start_time);


    start_timer("Process CSVs");
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
    stop_timer(start_time);
    
    let docs = [];

    start_timer("Generate Docs");
    for (let column_index = 0; column_index < dates.length; column_index++) {
        let current_docs = JSON.parse(JSON.stringify(docs_template));
        for (let i = 0; i < current_docs.length; i++) {
            let doc = current_docs[i];
            set_dates(doc, dates[column_index]);
            set_data(doc, confirmed_lines_arrays[i][column_index], "confirmed");
            set_data(doc, deaths_lines_arrays[i][column_index], "deaths");
            set_data(doc, recovered_lines_arrays[i][column_index], "recovered");
        }
        docs = docs.concat(current_docs);
    }
    stop_timer(start_time);

    start_timer("InsertMany Docs");
    await temp.insertMany(docs);
    
    stop_timer(start_time);
    var valid = await validateData();
   
    if (valid < 0) {
      await temp.deleteMany({});
      return "Job aborted due to invalid data."
    }
    start_timer("Renaming temp collection to statistics collection");
    await temp.aggregate([{$out: "statistics"}]).next();
    stop_timer(start_time);

    start_timer("DeleteMany temp collection");
    await temp.deleteMany({});
    await context.functions.execute("getTodaysData");
    stop_timer(start_time);
    
    return "Job Done!";
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
    return csv.replace(/Mainland China/g, "China")
        .replace(/Others/g, "Diamond Princess cruise ship")
        .trim().split("\n");
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

function start_timer(message) {
    start_time = new Date();
    console.log("TASK  - " + message);
    console.log("START - " + start_time);
}

function stop_timer(start) {
    const end = new Date();
    console.log("END   - " + end);
    console.log("TOOK  - " + (end - start) / 1000, "s");
}
async function validateData(){
  //test to see if they pushed an empty file 
  const temp = context.services.get("mongodb-atlas").db("coronavirus").collection("temp");  
  var yesterday = getYesterdaysDateString();
  
  console.log("yesterday: "+ yesterday);
  
  await temp.find({"state":"Texas","date":yesterday}).toArray()
  .then( docs => {
     docs.map(c => {
       if(c.confirmed){
         if (c.confirmed > 0 ) {
           console.log(JSON.stringify(c));
           console.log("we have an accurate count, lets move to stats");
           return 0;
         } else {
           console.log("Count is zero or missing");
           return -1;
         }
       } else  {
        console.log("we didn't get a record for the greatest state");
        return -1;
       }
     });
  });
}
function getYesterdaysDateString(){
  const nDate = new Date();
  var  sDate = "";

  const year = nDate.getFullYear() - 2000;
  var month = (1 + nDate.getMonth()).toString();
  var day = nDate.getDate();
  day = day -1;
  
  day = day.toString();
  
  sDate = month + "/" + day + "/" + year;
  return sDate;
}