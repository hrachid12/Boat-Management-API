const express = require('express');
const app = express();
const handlebars  = require('express-handlebars');
var cookieParser = require('cookie-parser');
const path = require('path')

require('dotenv').config();

app.use(express.static(path.join(__dirname, '/public/stylesheets')));

app.engine('handlebars', handlebars());
app.set('view engine', 'handlebars');
app.use(cookieParser());

app.set('trust proxy', true)
app.use('/', require('./routes/index'));

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}...`)
});