const path = require('path'),
      express = require('express'),
      app = express(),   
      Twit = require('twit'),
      config = {     
        twitter: {
          consumer_key:         process.env.CONSUMER_KEY,
          consumer_secret:      process.env.CONSUMER_SECRET,
          access_token:         process.env.ACCESS_TOKEN,
          access_token_secret:  process.env.ACCESS_TOKEN_SECRET,
          timeout_ms:           60*1000,
        }
      },
      T = new Twit(config.twitter);

const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')

const adapter = new FileSync('.data/db.json')
const db = low(adapter)

// Set some defaults
db.defaults({ friends: [] })
  .write()


// console.log(
// db.set('friends', ['hello!'])
// .write()
// )

app.use(express.static('public'));

app.set('json spaces', 4);

app.get("/loadfriends", (request, response) => {
  T.get('friends/ids', { screen_name: 'phocks' },  function (err, data, res) {
    // Add a post
    db.set('friends', data.ids)
      .write();
    response.json(data);
  })
});

app.all("/" + process.env.BOT_ENDPOINT, function (request, response) {

  
  // Put recurring stuff here
  
  let friends = db.get('friends').value();
  

    console.log(friends[0].toString());

    setIntervalX(function() {
      T.post('friendships/update', { user_id: friends[0], retweets: 'false' }, (err, data, res) => {
        // if (err) response.send(err);
        if (err) console.log(err);
        
          console.log('Removed retweets from ' + friends[0]);
          friends.shift();
          db.set('friends', friends)
            .write();
      
          console.log("Left to do: " + friends.length)
        });
      },
        2000, // Seconds between calls
        15 // How many times
      );
  
      
    
response.send('ok');

  
}); // app.all Express call

app.get("/testing", (request, response) => {
  T.get('friends/ids', { screen_name: 'phocks' },  function (err, data, res) {
    // db.set('friends', data.ids)
    //   .write();
    response.json(data);
  })
});

var listener = app.listen(process.env.PORT, function () {
  console.log('Your bot is running on port ' + listener.address().port);
});




//
//  filter the twitter public stream by the word 'mango'.
//
// var stream = T.stream('statuses/filter', { track: 'potato' })

// stream.on('tweet', function (tweet) {
//     response.json(tweet);
// })
  
  //
  // filter the public stream by the latitude/longitude bounded box of San Francisco
  // [[[152.5396728516,-27.7783416122],[153.4680175781,-27.7783416122],[153.4680175781,-27.1935714141],[152.5396728516,-27.1935714141],[152.5396728516,-27.7783416122]]]
//   var brisbane = [ '152.5396728516', '-27.7783416122', '153.4680175781', '-27.1935714141' ]

//   var stream = T.stream('statuses/filter', { locations: brisbane })
  
//   stream.on('tweet', function (tweet) {
//       response.json(tweet);
//   })




function setIntervalX(callback, delay, repetitions) {
    var x = 0;
    var intervalID = setInterval(function () {

       callback();

       if (++x === repetitions) {
           clearInterval(intervalID);
       }
    }, delay);
}