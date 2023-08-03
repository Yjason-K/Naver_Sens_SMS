const express = require("express");
const app = express();
const cors = require("cors");

// cors 설정
app.use(cors());

// port open
app.listen(8080, () => {
  console.log("SMS server listening on port 8080");
});
