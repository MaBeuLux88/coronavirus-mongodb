exports = function(){
  
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
};