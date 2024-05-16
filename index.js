const http = require('http');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const cookieParsr = require('cookie-parser');
const router = require('./src/router');
const cors = require('cors');

// Create Express webapp
const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(cookieParsr());
app.use(cors());


app.use(router);
app.set('views', path.join(__dirname, 'views')); // specify the views directory
app.set('view engine', 'ejs');


// Create http server and run it
const server = http.createServer(app);
const port = 3000;

server.listen(port, function() {
  console.log('Express server running on *:' + port);
});
