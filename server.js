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

app.use(express.static('public'));

app.set('json spaces', 4);

app.all("/" + process.env.BOT_ENDPOINT, function (request, response) {
//
//  filter the twitter public stream by the word 'mango'.
//
var stream = T.stream('statuses/filter', { track: 'potato' })

stream.on('tweet', function (tweet) {
    response.json(tweet);
})

  
}); // app.all Express call

var listener = app.listen(process.env.PORT, function () {
  console.log('Your bot is running on port ' + listener.address().port);
});
