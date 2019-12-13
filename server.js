const fox = require("fox-js"); // Some custom functions etc
const csv = require("csv-parser");
const fs = require("fs");

const low = require("lowdb"); // Database
const FileSync = require("lowdb/adapters/FileSync");

console.log("hello!");

// Helper to add delay to async functions
const delay = duration => new Promise(resolve => setTimeout(resolve, duration));

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

let blockList = [];

function updateBlockList(callback) {
  // To load up some data from disk
  blockList = [];
  fs.createReadStream("block-list.csv")
    .pipe(csv({ headers: false }))
    .on("data", row => {
      blockList.push(row[0]);
    })
    .on("end", () => {
      console.log("CSV file successfully processed");
      if (callback) callback();
    });
}

updateBlockList();

let processingBlockList = false;

/*
 *
 * THE MAIN LOOP TRIGGERED EVERY 25 MINS
 *
 */
app.get("/" + process.env.BOT_ENDPOINT, async function(request, response) {
  console.log("The bot has been triggered!!!!");

  // Search for string and add to list
  // addToList();

  // fox.setIntervalX(
  //   muteCycle,
  //   1 * 1000, // Milliseconds between calls
  //   11 // How many times
  // );

  // fox.setIntervalX(
  //   checkFriendFollows,
  //   1 * 1000, // Milliseconds between calls
  //   15 // How many times
  // );

  response.sendStatus(200);
}); // app.all Express call

// Other endpoints
app.all("/test", async (request, response) => {
  updateBlockList(() => {
    processBlockList(blockList);
  });

  // Get list of blocked users and unblock
  //   T.get("blocks/ids", async (err, data, res) => {
  //     console.log(data.ids.length);

  //     for (const id of data.ids) {
  //       console.log(id);
  //       await delay(500);
  //       T.post(
  //         "blocks/destroy",
  //         { user_id: id.toString() },
  //         (err, data, response) => {
  //           console.log(data);
  //         }
  //       );
  //     }
  //   });

  // Unblock (more reliable than ids)
  //   T.get("blocks/list", async (err, data, res) => {
  //     if (err) {
  //       console.log(err);
  //       return;
  //     }

  //     console.log(data.users.length);

  //     for (const user of data.users) {
  //       await delay(500);
  //       T.post(
  //         "blocks/destroy",
  //         { screen_name: user.screen_name },
  //         (err, data, response) => {
  //           console.log(data.screen_name);
  //         }
  //       );
  //     }
  //   });

  // unfollowId("87540272064304330");

  // fox.setIntervalX(
  //   unUnRetweetCycle,
  //   1 * 1000, // Milliseconds between calls
  //   100// How many times
  // );

  // fox.setIntervalX(
  //   checkFriendFollows,
  //   1 * 1000, // Milliseconds between calls
  //   10 // How many times
  // );

  // T.get("application/rate_limit_status", (error, data, response) => {
  //   console.log(data);
  // });

  response.sendStatus(200);
});

async function processBlockList(list) {
  if (processingBlockList) {
    console.log("Already processing...");
    return;
  }
  processingBlockList = true;
  // Add troll accounts to blocked list
  for (let account of list) {
    await delay(500);
    T.post("blocks/create", { user_id: account }, (err, data, response) => {
      console.log("Blocking:", account);
      if (err) console.log(err);

    });
  }

  processingBlockList = false;
}

app.get("/loadfriends", (request, response) => {
  T.get("friends/ids", { screen_name: "phocks", stringify_ids: true }, function(
    err,
    data,
    res
  ) {
    var friendIds = data.ids;

    friendIds.reverse();

    db.set("friends", friendIds).write();
    response.json(data);
  });
});

app.get("/loadmutes", (request, response) => {
  T.get("mutes/users/ids", { stringify_ids: true }, function(err, data, res) {
    var friendIds = data.ids;

    friendIds.reverse();

    db.set("friends", friendIds).write();
    response.json(data);
  });
});

app.get("/loadunretweeters", (request, response) => {
  T.get("friendships/no_retweets/ids", { stringify_ids: true }, function(
    err,
    data,
    res
  ) {
    console.log(data);
    var friendIds = data;

    friendIds.reverse();

    db.set("friends", friendIds).write();
    response.json(data);
  });
});

var listener = app.listen(process.env.PORT, function() {
  console.log("Your bot is running on port " + listener.address().port);
});

// Functions below here ay
async function muteCycle() {
  console.log("");

  let friends = db.get("friends").value() || [];

  if (!friends[0]) {
    console.log("No friends left to process...");
  } else {
    let friend = String(friends[0]); // Strings work better than integers in Twitter

    console.log("muting: " + friend);

    muteUser(friend);

    console.log("User muted: " + friend);

    friends.shift(); // Remove first item in array

    db.set("friends", friends) // Write changes to db
      .write();

    console.log("On to next one. Process seemed to go OK...");
    console.log("Accounts to go: " + friends.length);
  }
}

async function unmuteCycle() {
  console.log("");

  let friends = db.get("friends").value() || [];

  if (!friends[0]) {
    console.log("No friends left to process...");
  } else {
    let friend = String(friends[0]); // Strings work better than integers in Twitter

    console.log("unmuting: " + friend);

    await unmuteUser(friend);

    console.log("User unmuted: " + friend);

    friends.shift(); // Remove first item in array

    db.set("friends", friends) // Write changes to db
      .write();

    console.log("On to next one. Process seemed to go OK...");
    console.log("Accounts to go: " + friends.length);
  }
}

function addToList() {
  var query = {
    q:
      '"JavaScript" -filter:nativeretweets -filter:replies min_faves:1 lang:en',
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
        slug: "javascript"
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

async function unUnRetweetCycle() {
  console.log("");

  let friends = db.get("friends").value() || [];

  if (!friends[0]) {
    console.log("No friends left to process...");
  } else {
    let friend = String(friends[0]); // Strings work better than integers in Twitter

    console.log("ununretweeting: " + friend);

    await unUnRetweetUser(friend);

    friends.shift(); // Remove first item in array

    db.set("friends", friends) // Write changes to db
      .write();

    console.log("On to next one. Process seemed to go OK...");
    console.log("Accounts to go: " + friends.length);
  }
}

async function searchAndFollow() {
  var result = await searchTweets(
    '"try going vegan" -filter:nativeretweets -filter:replies'
  );

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
}

async function favTweet(tweetId) {
  T.post("favorites/create", { id: tweetId }, function(error, response) {
    if (error) {
      console.log("Bot could not fav, - " + error);
    } else {
      console.log("Bot faved : " + tweetId);
    }
  });
}

async function checkFriendFollows() {
  console.log("");

  let friends = db.get("friends").value() || [];

  if (!friends[0]) {
    console.log("No friends left to process...");
  } else {
    let friend = String(friends[0]); // Strings work better than integers in Twitter

    console.log("Checking if this friend follows: " + friend);

    let isFollowing = await isFollowingMe(friend);
    console.log("Are they following? " + isFollowing);

    if (!isFollowing) {
      console.log("Unfollowing: " + friend);
      unfollowId(friend);
    }

    friends.shift(); // Remove first item in array

    db.set("friends", friends) // Write changes to db
      .write();

    console.log("Process seemed to go OK...");
    console.log("Accounts to go: " + friends.length);
  }
}

function unfollowId(userId) {
  T.post(
    "friendships/destroy",
    { user_id: userId },
    (error, data, response) => {
      if (error) console.log(error.message);
    }
  );
}

function getLastFollowed() {
  var x = db.get("lastFollowed").value();

  return x;
}

function setLastFollowed(screenName) {
  db.set("lastFollowed", screenName).write();
}

async function followUser(screenName) {
  try {
    var response = await T.post("friendships/create", {
      screen_name: screenName
    });

    console.log("Sending follow request: " + screenName); //, response.data);
  } catch (error) {
    console.log(error);
  }
}

// async function muteUser(screenName) {
//   try {
//     var response = await T.post("mutes/users/create", {
//       screen_name: screenName
//     });

//     console.log("Sending mute request: " + screenName);
//   } catch (error) {
//     console.log(error);
//   }
// }

async function removeRetweets(screenName) {
  try {
    var response = await T.post("friendships/update", {
      screen_name: screenName,
      retweets: "false"
    });

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

  var response = await T.get("search/tweets", query);

  // var index = randomNumber(100);
  var index = 0;

  return response.data.statuses[index];
}

// app.set('json spaces', 4);

function getScreenName(tweet) {
  return tweet.user.screen_name;
}

async function isFollowingMe(userId) {
  var response = await T.get("friendships/lookup", { user_id: userId }); // 300 per 15 min windows allowed

  if (response.data.errors) {
    // console.log("there was an error, most likely user doesn't exist any more");
    console.log(response.data.errors);
    return true;
  }

  if (
    response.data[0] &&
    response.data[0].connections.indexOf("followed_by") !== -1
  ) {
    return true;
  } else {
    return false;
  }
}

function randomNumber(lessThan) {
  return Math.floor(Math.random() * lessThan);
}

function muteUser(userId) {
  T.post("mutes/users/create", { user_id: userId }, (err, data, res) => {
    // if (err) response.send(err);
    if (err) console.log(err);

    console.log("Muted user " + userId);
    //           friends.shift();
    //           db.set('friends', friends)
    //             .write();

    //           console.log("Left to do: " + friends.length)
  });
}

function unmuteUser(userId) {
  T.post("mutes/users/destroy", { user_id: userId }, (err, data, res) => {
    // if (err) response.send(err);
    if (err) {
      console.log("Error: " + err.message);
      return;
    } else {
      console.log("Unmuted user " + userId);
    }
  });
}

function unUnRetweetUser(userId) {
  T.post(
    "friendships/update",
    { user_id: userId, retweets: true },
    (err, data, res) => {
      // if (err) response.send(err);
      if (err) {
        console.log("Error: " + err.message);
        return;
      } else {
        console.log("ununretweeted user " + userId);
      }
    }
  );
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
