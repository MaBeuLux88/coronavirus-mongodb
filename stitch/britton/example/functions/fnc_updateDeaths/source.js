exports = function(changeEvent) {

  const confirmed = context.services.get("mongodb-atlas").db("coronavirus").collection("confirmed");
  const deaths = context.services.get("mongodb-atlas").db("coronavirus").collection("deaths");
  const fullDocument = changeEvent.fullDocument;
  
  confirmed.updateOne(
    { state: fullDocument.state, 
      country: fullDocument.country,
      iso_date: fullDocument.iso_date
    },
    { $set: {
      deaths: fullDocument.deaths
      }
    },
    {upsert: true}
  );
  
};
