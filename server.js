const fox = require("fox-js"); // Some custom functions etc

const low = require("lowdb"); // Database
const FileSync = require("lowdb/adapters/FileSync");

const path = require("path"),
  express = require("express"),
  app = express(),
  Twit = require("twit"),
  config = {
    twitter: {
      consumer_key: process.env.CONSUMER_KEY,
      consumer_secret: process.env.CONSUMER_SECRET,
      access_token: process.env.ACCESS_TOKEN,
      access_token_secret: process.env.ACCESS_TOKEN_SECRET,
      timeout_ms: 60 * 1000
    }
  },
  T = new Twit(config.twitter);

const adapter = new FileSync(".data/db.json");
const db = low(adapter);

// Set some defaults
db.defaults({ friends: [] }).write();

// Serve the public directory directly
app.use(express.static("public"));




/*
 *
 * THE MAIN LOOP TRIGGERED EVERY 25 MINS
 *
 */
app.all("/" + process.env.BOT_ENDPOINT, async function(request, response) {
  console.log("The bot has been triggered!!!!");
  
  var result = await searchTweets('"thinking about going vegan" -filter:nativeretweets -filter:replies')
  
  console.log("About to fav this tweet: " + result.id_str);
  
  favTweet(result.id_str);
  
  var screenName = getScreenName(result);
  
  console.log("Found new tweet: " + screenName + ": " + result.text);
  
  if (screenName !== getLastFollowed()) {
    await followUser(screenName);
    await removeRetweets(screenName);
    await muteUser(screenName);
  } else {
    console.log("Already followed...");
  }
  
  setLastFollowed(screenName);

  response.sendStatus(200);
}); // app.all Express call


// Other endpoints
app.all("/test", async (request, response) => {
  
  // checkFriendFollows();
  
  favTweet("923363472221409280");
  
  response.sendStatus(200);
});

app.get("/loadfriends", (request, response) => {
  T.get('friends/ids', { screen_name: 'phocks' },  function (err, data, res) {
    // Add a post
    db.set('friends', data.ids)
      .write();
    response.json(data);
  })
});



var listener = app.listen(process.env.PORT, function() {
  console.log("Your bot is running on port " + listener.address().port);
});

// Functions below here ay

async function favTweet(tweetId) {
  T.post('favorites/create', {id: tweetId}, function (error, response) {
    if (error) {
      console.log('Bot could not fav, - ' + error);
    }
    else {
      console.log('Bot faved : ' + tweetId);
    }
  });
}

async function checkFriendFollows() {
  
  let friends = db.get('friends').value() || [];
  
  if (!friends[0]) {
    console.log("No friends left to process...")
  } else {
    
    let friend = String(friends[0]);
    
    console.log("Checking if this friend follows: " + friend);
    
    let isFollowing = await isFollowingMe(friend);
    
    console.log("Are they following? " + isFollowing);
    
    if (!isFollowing) {
      console.log("Unfollowing: " + friend);
      unfollowId(friend);
    }
    
    // TODO: .shift() friends in db and save
    
  }
}

function unfollowId(userId) {
  T.post('friendship/destroy', { user_id: userId}, (error, data, response) => {
          if (error) console.log(error);
         });
}

function getLastFollowed() {
  var x = db.get('lastFollowed')
    .value();
  
  return x;
}

function setLastFollowed(screenName) {
  db.set("lastFollowed", screenName)
    .write();
}

async function followUser(screenName) {
  try {
    var response = await T.post('friendships/create', { screen_name: screenName } );
    
    console.log("Sending follow request: " + screenName); //, response.data);
  } catch (error) {
    console.log(error);
  }
}

async function muteUser(screenName) {
  try {
    var response = await T.post('mutes/users/create', { screen_name: screenName  });
    
    console.log("Sending mute request: " + screenName);
  } catch (error) {
    console.log(error);
  }
  
}

async function removeRetweets(screenName) {
  try {
    var response = await T.post('friendships/update', { screen_name: screenName, retweets: 'false' });
    
    console.log("Removing retweets from: " + screenName); //, response.data);
  } catch (error) {
    console.log(error);
  }
  
}

async function searchTweets(query) {
  var query = {
    q: query,
    result_type: "recent",
    lang: "en",
    count: 100
  };
  
  var response = await T.get("search/tweets", query)
  
  // var index = randomNumber(100);
  var index = 0;
  
  return response.data.statuses[index];
}

function addToList() {
  var query = {
    q: "brisbane -filter:nativeretweets",
    result_type: "recent",
    lang: "en",
    count: 100
  };

  T.get("search/tweets", query, function(error, data, response) {
    if (error) {
      console.log("Bot could not find latest tweets, - " + error);
    } else {
      var userList = "";

      data.statuses.forEach(function(d, i) {
        if (userList === "") userList = userList + d.user.screen_name;
        else userList = userList + "," + d.user.screen_name;
      });

      console.log(userList);

      var params = {
        screen_name: userList,
        owner_screen_name: "phocks",
        slug: "bristalk"
      };

      // Uncomment below to process

      T.post("lists/members/create_all", params, function(error, response) {
        if (error) {
          console.log("Bot could not do it, - " + error);
        } else {
          console.log("Completed...");
          // console.log(response);
        }
      });
    }
  });
}

// app.set('json spaces', 4);





function getScreenName(tweet) {
  return tweet.user.screen_name;
}

async function isFollowingMe(userId) {
  var response = await T.get("users/lookup", { user_id: userId });
  if (response.data[0].following) {
    return true;
  } else {
    return false;
  }
}

function randomNumber(lessThan) {
  return Math.floor(Math.random() * lessThan);
}


// app.all("/" + process.env.BOT_ENDPOINT, function (request, response) {

//   // Put recurring stuff here

//   let friends = db.get('friends').value() || [];

//   if (!friends[0]) {
//     response.status(200);
//     console.log('No friends left...');
//     response.send('No friends left...');
//     return false;
//   }

//     // console.log(friends);

//   console.log('starting operation')

//     fox.setIntervalX(muteUser,
//         1 * 1000, // Milliseconds between calls
//         20 // How many times
//       );

//   function removeRetweet () {
//       T.post('friendships/update', { user_id: friends[0], retweets: 'false' }, (err, data, res) => {
//         // if (err) response.send(err);
//         if (err) console.log(err);

//           console.log('Removed retweets from ' + friends[0]);
//           friends.shift();
//           db.set('friends', friends)
//             .write();

//           console.log("Left to do: " + friends.length)
//         });
//       }

//   function muteUser (userId) {
//       T.post('mutes/users/create', { user_id: userId }, (err, data, res) => {
//         // if (err) response.send(err);
//         if (err) console.log(err);

//           console.log('Muted user ' + userId);
// //           friends.shift();
// //           db.set('friends', friends)
// //             .write();

// //           console.log("Left to do: " + friends.length)
//         });
//       }

// function addRetweet () {
//       T.post('friendships/update', { user_id: 5703342, retweets: 'true' }, (err, data, res) => {
//         // if (err) response.send(err);
//         if (err) console.log(err);

//           console.log('Added retweets from ' + 5703342, data);
//           // friends.shift();
//           // db.set('friends', friends)
//           //   .write();

//           // console.log("Left to do: " + friends.length)
//         });
//       }

// response.send('ok');

// }); // app.all Express call
