exports = async function(arg){
    const http = context.services.get("getCDCDataService");
    return http.get({
        url: "https://docs.google.com/spreadsheets/d/1UF2pSkFTURko2OvfHWWlFpDFAr1UxCBA4JLwlSP6KFo/gviz/tq?tqx=out:csv",
        encodeBodyAsJSON: true
    })
        .then(response => {
            // The response body is encoded as raw BSON.Binary. Parse it to JSON.
            const ejson_body = response.body.text();
            return parseCSV(ejson_body);
        })
};

function parseCSV(csv){
    //remove quotes and phrases
    csv = csv.replace(/"/g,"");
    csv = csv.replace(/Mainland /g,"");
    csv = csv.replace(/Country\/Region/g,"Country");
    csv = csv.replace(/Province\/State/g,"State");
    var stage = context.services.get("mongodb-atlas").db("coronovirus").collection("stage");
    var cCount = context.services.get("mongodb-atlas").db("coronovirus").collection("current_count");
    var nDate = new Date();
    //stage.drop();
    //cCount.drop();
    var lines=csv.split("\n");
    var result = [];
    var headers=lines[0].split(",");
    headers[2] = "First_Confirmed";
    headers[3] = "lat";
    headers[4] = "long";
    //console.log( "headers: " + JSON.stringify(headers));
    /*
    //Stage all data
    for(var i=1;i<lines.length;i++){
        var stageObj = {};
        var currentline=lines[i].split(",");
        for(var j=0;j<headers.length;j++){
          if (j<=4){
              stageObj[headers[j]] = currentline[j];
          } else {
            stageObj[headers[j]] = parseInt(currentline[j]);
          }
        }
        //console.log("line " + i +": " + JSON.stringify(obj));
        stageObj.coordinates = [BSON.Double(currentline[4]), BSON.Double(currentline[3])];
        result.push(stageObj);
        dbresult =  stage.insertOne(stageObj);
         //console.log(JSON.stringify(dbresult));
    }
    */
    //store only the current count
    for(var i=1;i<lines.length;i++){
        var currentObj = {};
        var currentline=lines[i].split(",");
        for(var j=0;j<headers.length;j++){
            if (j<=4){
                currentObj[headers[j]] = currentline[j];
            } else {
                //get last total
                j = headers.length;
                currentObj["Total"] = parseInt(currentline[headers.length -1]);
            }
        }
        currentObj.coordinates = [ currentline[4], currentline[3]];
        currentObj.last_update = nDate;
        //dbresult =  cCount.insertOne(currentObj);
        dbresult =  cCount.updateOne(
            { lat: currentObj.lat, long: currentObj.long},
            { $set: {
                    Country: currentObj.Country,
                    State: currentObj.State,
                    lat: currentObj.lat,
                    long: currentObj.long,
                    coordinates: currentObj.coordinates,
                    Total: currentObj.Total,
                    First_Confirmed: currentObj.First_Confirmed,
                    last_update: currentObj.last_update
                }
            },
            { upsert: true}
        );
    }
    return "Documents updated: " + lines.length;
}