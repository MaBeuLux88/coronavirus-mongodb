exports = function(changeEvent) {

  const confirmed = context.services.get("mongodb-atlas").db("coronavirus").collection("confirmed");
  const recovered = context.services.get("mongodb-atlas").db("coronavirus").collection("recovered");
  const fullDocument = changeEvent.fullDocument;
  
  confirmed.updateOne(
    { state: fullDocument.state, 
      country: fullDocument.country,
      iso_date: fullDocument.iso_date
    },
    { $set: {
      recovered: fullDocument.recovered
      }
    },
    {upsert: true}
  );
  
};