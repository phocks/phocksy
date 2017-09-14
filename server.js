const path = require('path'),
      express = require('express'),
      app = express(),   
      Twit = require('twit'),
      config = {     
        twitter: {
          consumer_key: process.env.CONSUMER_KEY,
          consumer_secret: process.env.CONSUMER_SECRET,
          access_token: process.env.ACCESS_TOKEN,
          access_token_secret: process.env.ACCESS_TOKEN_SECRET
        }
      },
      Bot = new Twit(config.twitter),
      stream = Bot.stream('statuses/sample'),
      TWITTER_SEARCH_PHRASE = 'cowspiracy',
      blockedUsernames = [
        'SSF_BERF_DEFM'
      ];

app.use(express.static('public'));

app.all("/" + process.env.BOT_ENDPOINT, function (request, response) {
  
  var query = {
    q: TWITTER_SEARCH_PHRASE,
    result_type: "recent"
  }

  Bot.get('search/tweets', query, function (error, data, response) {
    if (error) {
      console.log('Bot could not find latest tweet, - ' + error);
    }
    else {
      var id = {
        id : data.statuses[0].id_str
      }
      
      var currentUser = data.statuses[0].user.screen_name;
      
      console.log(data.statuses[0]);
      
      console.log(currentUser);
      console.log(data.statuses[0].text);
      
      
      // Check if user is blocked otherwise continue
      if (blockedUsernames.indexOf(currentUser) > -1) {
        // In the array
        console.log('Blocked user ' + currentUser + " found. Not continuing...");
      } else {
        // Not in the array
        Bot.post('statuses/retweet/:id', id, function (error, response) {
          if (error) {
            console.log('Bot could not retweet, - ' + error);
          }
          else {
            console.log('Bot retweeted : ' + id.id);
          }
        });

        Bot.post('favorites/create', id, function (error, response) {
          if (error) {
            console.log('Bot could not fav, - ' + error);
          }
          else {
            console.log('Bot faved : ' + id.id);
          }
        });
      }
    } // else not error
  });
  response.sendStatus(200);
}); // app.all Express call

var listener = app.listen(process.env.PORT, function () {
  console.log('Your bot is running on port ' + listener.address().port);
});
