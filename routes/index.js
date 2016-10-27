var express = require('express');
var session = require('express-session');
var router = express.Router();

// required for passport
router.use(session({
    secret: 'xXdarkkikouXx',
    resave: true,
    saveUninitialized: true
}));


/* GET users listing. */
router.get('/timeline', function(req, res, next) {
  var session = req.session;
	if(!session.user || !session.user.token){
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({ title: 'User Information', error: "not connected" }));
    return;
  }

  var client = new Twitter({
    consumer_key: configAuth.twitterAuth.consumerKey,
    consumer_secret: configAuth.twitterAuth.consumerSecret,
    access_token_key: session.user.token,
    access_token_secret: session.user.tokenSecret
  });
  // get time of last week
  var date = new Date(new Date().getTime() - 60 * 60 * 24 * 500);
  var y = date.getFullYear();
  var m = date.getMonth() + 1;
  m = (m < 10 ? "0" : "") + m;
  var d = date.getDate();
  d = (d < 10 ? "0" : "") + d;
  // receive tweets until last week
  var params = {include_rts: false, since: y+"-"+m+"-"+d, count: 1000};
  // get the timeline of the logged in member
  client.get('statuses/home_timeline', params, function(error, tweets, response) {
    if (!error) {
	    res.setHeader('Content-Type', 'application/json');
	    res.send(JSON.stringify({ title: 'User Information', tweets: tweets }));
    } else {
      console.log(error);
		  res.setHeader('Content-Type', 'application/json');
		  res.send(JSON.stringify({ title: 'Unknowed error', error: error }));
    }
  });
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify({ title: 'Unknowed error' }));
});

router.get('/tweets', function(req, res, next) {
	var session = req.session;
	if(!session.user){
		res.render('index');
		return;
	}
	if(!session.user.token){
		res.render('index');
		return;
	}

	var client = new Twitter({
		consumer_key: configAuth.twitterAuth.consumerKey,
		consumer_secret: configAuth.twitterAuth.consumerSecret,
		access_token_key: session.user.token,
		access_token_secret: session.user.tokenSecret
	});

	var db = req.con;
	var qur = db.query("SELECT * FROM `twitter` WHERE `id_user` = ? ", session.profile.id,
	function (err,rows){
		if(rows.length < 1){
			res.render('noTweet', { title: 'You have no tweets'});
			return;
		}

		var waitForAllTweets=0;

		var p1 = new Promise(function (resolve, reject){
			var myTweets=[];
			for (var i = 0; i < rows.length; i++) {
				var p2 = new Promise (function (resolve, reject){
					var params = {id:rows[i].tweetID};
					client.get('statuses/show/',params, function(error, tweet, response){
						resolve(tweet);
					});
				});
				p2.then(function(tweet){
					myTweets.push(tweet);
					waitForAllTweets++;
					if(waitForAllTweets==rows.length)
					resolve(myTweets);
				})
			}
		})
		p1.then(function(myTweets){
	    res.setHeader('Content-Type', 'application/json');
	    res.send(JSON.stringify({title: 'Your saved Tweets',dataGet: myTweets}));
		})
	});
});

module.exports = router;
