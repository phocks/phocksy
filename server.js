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
  
  let friends = db.get('friends').value() || [];
  
  if (!friends[0]) {
    response.status(500);
    response.send('No friends left...');
    return false;
  }
  

    console.log(friends);

    setIntervalX(muteUser,
        2000, // Seconds between calls
        15 // How many times
      );
  
  function removeRetweet () {
      T.post('friendships/update', { user_id: friends[0], retweets: 'false' }, (err, data, res) => {
        // if (err) response.send(err);
        if (err) console.log(err);
        
          console.log('Removed retweets from ' + friends[0]);
          friends.shift();
          db.set('friends', friends)
            .write();
      
          console.log("Left to do: " + friends.length)
        });
      }
  
  function muteUser () {
      T.post('mutes/users/create', { user_id: friends[0] }, (err, data, res) => {
        // if (err) response.send(err);
        if (err) console.log(err);
        
          console.log('Muted user ' + friends[0]);
          friends.shift();
          db.set('friends', friends)
            .write();
      
          console.log("Left to do: " + friends.length)
        });
      }
  
      
    
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





function setIntervalX(callback, delay, repetitions) {
    var x = 0;
    var intervalID = setInterval(function () {

       callback();

       if (++x === repetitions) {
           clearInterval(intervalID);
       }
    }, delay);
}