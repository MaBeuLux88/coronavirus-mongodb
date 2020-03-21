exports = async function(arg){
  var sUrl = "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_daily_reports/";
  sUrl = sUrl + getYesterdaysDateString() + ".csv";
  console.log(sUrl);
  return await context.http.get({
      url: sUrl,
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
  var stage = context.services.get("mongodb-atlas").db("coronavirus").collection("stage");
  stage.deleteMany({});
  var nDate = new Date();
  //stage.drop();
  //cCount.drop();
  var lines=csv.split("\n");
  var result = [];
  var headers=lines[0].split(",");
  //console.log( "headers: " + JSON.stringify(headers));
 
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

  return "Documents updated: " + lines.length; 
}
function getTodaysDateString(){
    const nDate = new Date();
  var  sDate = "";

  const year = nDate.getFullYear();
  var month = (1 + nDate.getMonth()).toString();
  var day = nDate.getDate().toString();
  
  if (day.length < 2 ){
    day = "0" + day;
  }
   if (month.length < 2 ){
    month = "0" + month;
  }
  
  sDate = month + "-" + day + "-" + year;
  return sDate;
}
function getYesterdaysDateString(){
    const nDate = new Date();
  var  sDate = "";

  const year = nDate.getFullYear();
  var month = (1 + nDate.getMonth()).toString();
  var day = nDate.getDate();
  day = day -1;
  
  day = day.toString();
  
  if (day.length < 2 ){
    day = "0" + day;
  }
   if (month.length < 2 ){
    month = "0" + month;
  }
  
  sDate = month + "-" + day + "-" + year;
  return sDate;
}

//https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_daily_reports/03-13-2020.csv