exports = async function(){
  var stats = context.services.get("mongodb-atlas").db("coronavirus").collection("statistics");
  var current = context.services.get("mongodb-atlas").db("coronavirus").collection("current");

  
  //refresh our current data 
  await current.deleteMany({});
  //var qDate = await context.functions.execute("getMaxDate");
  
  var qDate = await getMaxDate();
  //insert only the most recent data
  console.log("qDate: " + JSON.stringify(qDate));
  var docs =  await stats.find({"iso_date": qDate}).toArray()
  .then( docs => {
     docs.map(c => {
       current.insertOne(c);
     });
  });
  
 
  
  return qDate;
};

function to_iso_date(date) {
    const date_parts = date.trim().split("/");
    const year = "20" + date_parts[2];
    const month = ("0" + date_parts[0]).slice(-2);
    const day = ("0" + date_parts[1]).slice(-2);
    return new Date(year + "-" + month + "-" + day);
}

async function getMaxDate(){
  
  //return to_iso_date("3/12/20");
  
  var stats = context.services.get("mongodb-atlas").db("coronavirus").collection("statistics");
  var lastUpdate = context.services.get("mongodb-atlas").db("coronavirus").collection("lastUpdate");

  var testDate = "";
   
   await stats.aggregate([{ $group:{ _id: null, maxDate: {$max: "$iso_date"}}}]).toArray()
  .then( docs => {
      docs.map(c => {
        if (c.maxDate) { 
          testDate = c.maxDate;
          console.log(testDate);
        }
      });
  });
   
  return testDate;
}