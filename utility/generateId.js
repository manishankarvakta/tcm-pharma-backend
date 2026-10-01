const { format } = require("date-fns");
const User = require("../models/userModel");

// ID generation
function generateId(prefix, type, todayTotal) {
  // GET TYPE TODAYS TOTAL ENTRY

  const number = ("000" + (todayTotal + 1)).toString();
  const current = number.substring(number.length - 4);
  const date = format(new Date(new Date()), "yyyyMMdd");
  
  // console.log(prefix + "-" + type + "-" + date + "-" + current);
}

module.exports = generateId;
