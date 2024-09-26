require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const bodyparser = require("body-parser");
const dns = require("dns");
const mongoose = require("mongoose");

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({extended : true}));

mongoose.connect(process.env.MONGO_URI);

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});

//setup Schema for database
const urlSchema = new mongoose.Schema({
  original_url: { type: String, required: true, unique: true},
  short_url: { type: Number, required: true, unique: true}
});

//setup model for database interaction
const UrlModel = mongoose.model('UrlModel', urlSchema);

app.post("/api/shorturl", (req,res) => {
  //save input into variable
  const { url } = req.body;

  //validate that the inout is a URL
  try {
    urlObj = new URL(url);
    dns.lookup(urlObj.hostname, (err, address) => {
      //if DNS lookup fails, return error
      if (!address) {
        return res.json({ error: "invalid url" });
      } else {
        //check if there is an entry inside the database
        //if there is an entry, fetch entry and return
        UrlModel.findOne({original_url: url}).then((foundUrl) => {
          if (foundUrl) {
            return res.json({original_url: foundUrl.original_url,
              short_url: foundUrl.short_url
            });
          } else {
            //if no entry, make a new entry
            let short_url = 1;
            UrlModel.find({}).sort({short_url: "desc"}).limit(1)
            .then((latestUrl) => {
              if (latestUrl.length > 0) {
                //if there is an entry in the database, take it and increment it by 1
                short_url = parseInt(latestUrl[0].short_url) + 1;
              }
              //If there was no entry in the database, use the already decleared variable
              const entryObj = {
                original_url: url,
                short_url: short_url
              };

              //create an entry in the database
              let newUrl = new UrlModel(entryObj);
              newUrl.save();
              return res.json(entryObj);
            }).catch((err) => {
              console.error(err);
              return res.json({ error: "Something went wrong... Check console"});
            })
          }
        }).catch((err) => {
          console.error(err);
          return res.json({ error: "Something went wrong... Check console"});
        })
      }
    });
  } catch {
    return res.json({ error: "invalid url"})
  }
});

app.get("/api/shorturl/:id", (req,res) => {
  //check if short_url exists in database
  UrlModel.findOne({short_url: req.params.id}).then((foundUrl) =>{
    //If it exists - Redirect user
    if (foundUrl){
      res.redirect(foundUrl.original_url);
    } else {
      //if it doesn't exist - Send error
      res.json({ error: "invalid url"});
    }
  }).catch((err) => {
    //extra error handling
    console.error(err);
    res.json({ error: "Something went wrong... Check console"});
  });
});
