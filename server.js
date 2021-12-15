const express = require("express");
const session = require("express-session");
require("dotenv").config();
const cookieParser = require("cookie-parser");
const multer = require('multer')
const cors = require("cors");
const {
  getOAuthRequestToken,
  getOAuthAccessTokenWith,
  oauthGetUserById,
  oauthConsumer,
} = require("./utils");
const path = require("path");
const fs = require("fs");
const { default: axios } = require("axios");

const storage = multer.diskStorage({
  destination:'./client/uploads/',
  filename: function(req,file,cb){
    cb(null,Date.now() + path.extname(file.originalname))
  }
})

const upload = multer({
  storage:storage,
  limits:{fileSize:1000000},
  fileFilter:function(req,file,cb){
    checkFileType(file,cb)
  }
}).single('media')

function checkFileType(file,cb){
  const fileTypes = /jpeg|png|gif|mp4|jpg/
  const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = fileTypes.test(file.mimetype)
  if(mimetype && extname){
    return cb(null,true)
  } else {
    cb('Error image and video only')
  }
}

const TEMPLATE = fs.readFileSync(
  path.resolve(__dirname, "client", "template.html"),
  { encoding: "utf8" }
);

const actionUrl = "https://api.twitter.com/2/tweets";

const COOKIE_SECRET = process.env.COOKIE_SECRET;

main().catch((err) => console.error(err.message, err));

async function main() {
  const app = express();
  app.use(cookieParser());
  app.use(session({ secret: COOKIE_SECRET || "secret" }));
  app.use(cors());
  app.listen(3000, () => console.log("listening on http://localhost:3000"));

  app.get("/", async (req, res, next) => {
    console.log("/ req.cookies", req.cookies);
    if (req.cookies && req.cookies.twitter_screen_name) {
      console.log("/ authorized", req.cookies.twitter_screen_name);
      return res.send(
        TEMPLATE.replace(
          "CONTENT",
          `
        <h1>Hello ${req.cookies.twitter_screen_name}</h1>
        <br>
        <form method='post' action='/tweet/post' enctype='multipart/form-data'>
        <input id='tweet' type='text' name='message'>
        <input type='file' name='media'>
        <button type='submit'>Post a tweet</button>
        <form>
        <a href="/twitter/logout">logout</a>    
      `
        )
      );
    }
    return next();
  });
  app.use(express.static(path.resolve(__dirname, "client")));
  app.use(express.urlencoded());

  app.use(express.json());

  app.get("/twitter/logout", logout);
  function logout(req, res, next) {
    res.clearCookie("twitter_screen_name");
    req.session.destroy(() => res.redirect("/"));
  }

  // app.get("/twitter/authenticate", twitter("authenticate"));
  app.get("/twitter/authorize", twitter("authorize"));
  function twitter(method = "authorize") {
    return async (req, res) => {
   
      const { oauthRequestToken, oauthRequestTokenSecret } =
        await getOAuthRequestToken();

      req.session = req.session || {};
      req.session.oauthRequestToken = oauthRequestToken;
      req.session.oauthRequestTokenSecret = oauthRequestTokenSecret;

      const authorizationUrl = `https://api.twitter.com/oauth/${method}?oauth_token=${oauthRequestToken}`;
    
      res.redirect(authorizationUrl);
    };
  }

  app.get("/twitter/callback", async (req, res) => {
    const { oauthRequestToken, oauthRequestTokenSecret } = req.session;
    const { oauth_verifier: oauthVerifier } = req.query;
 

    const r = await getOAuthAccessTokenWith({
      oauthRequestToken,
      oauthRequestTokenSecret,
      oauthVerifier,
    });
    console.log(5, r);
    const { oauthAccessToken, oauthAccessTokenSecret, results } = r;
    req.session.oauthAccessToken = oauthAccessToken;

    const { user_id: userId /*, screen_name */ } = results;
    const user = await oauthGetUserById(userId, {
      oauthAccessToken,
      oauthAccessTokenSecret,
    });

    console.log(oauthRequestTokenSecret, oauthRequestToken, oauthVerifier);
    req.session.twitter_screen_name = user.screen_name;
    res.cookie("twitter_screen_name", user.screen_name, {
      maxAge: 999999999,
      httpOnly: true,
    });
    res.cookie("accessToken", oauthAccessToken, {
      maxAge: 999999999,
      httpOnly: true,
    });
    res.cookie("accessTokenSecret", oauthAccessTokenSecret, {
      maxAge: 999999999,
      httpOnly: true,
    });

    req.session.save(() => res.redirect("/"));
  });
  app.post("/tweet/post", async (req, res) => {
    const tweetPost = req.body.tweet;
    const oauthAccessToken = req.cookies["accessToken"];
    const oauthAccessTokenSecret = req.cookies["accessTokenSecret"];


    var orderedParams = oauthConsumer._prepareParameters(
      oauthAccessToken,
      oauthAccessTokenSecret,
      "POST",
      actionUrl
    );
    var authHeader = oauthConsumer._buildAuthorizationHeaders(orderedParams);

    upload(req,res,(err) => {
      if(err){
        console.log(err)
      } else {

        console.log(req.file)
      }
    })

   
    axios
      .post(
        actionUrl,
        {
          "text": tweetPost,
        },
        {
          headers: {
            Authorization: authHeader,
            "user-agent": "v2CreateTweetJS",
            "content-type": "application/json",
            accept: "application/json",
          },
        }
      )
      .then(res => {
       console.log(res)
      })
      .catch((error) =>
        error.response
          ? console.log(error.response)
          : error.request
          ? console.log(error.request)
          : error.message
      ).finally(() => {
        res.redirect('/')
        
      });
  });
}
