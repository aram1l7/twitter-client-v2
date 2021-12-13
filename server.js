const express = require("express");
const session = require("express-session");
require("dotenv").config();
const cookieParser = require("cookie-parser");
const cors = require("cors");

const {
  getOAuthRequestToken,
  getOAuthAccessTokenWith,
  oauthGetUserById,
} = require("./utils");

const path = require("path");
const fs = require("fs");
const { default: axios } = require("axios");

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
        <form method='post' action='/tweet/post'>
        <input id='tweet' type='text' name='message'>
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
      // console.log(`/twitter/${method}`);
      const { oauthRequestToken, oauthRequestTokenSecret } =
        await getOAuthRequestToken();
      // console.log(`/twitter/${method} ->`, {
      //   oauthRequestToken,
      //   oauthRequestTokenSecret,
      // });

      req.session = req.session || {};
      req.session.oauthRequestToken = oauthRequestToken;
      req.session.oauthRequestTokenSecret = oauthRequestTokenSecret;

      const authorizationUrl = `https://api.twitter.com/oauth/${method}?oauth_token=${oauthRequestToken}`;
      // console.log("redirecting user to ", authorizationUrl);
      res.redirect(authorizationUrl);
    };
  }

  app.get("/twitter/callback", async (req, res) => {
    const { oauthRequestToken, oauthRequestTokenSecret } = req.session;
    const { oauth_verifier: oauthVerifier } = req.query;
    // console.log("/twitter/callback", {
    //   oauthRequestToken,
    //   oauthRequestTokenSecret,
    //   oauthVerifier,
    // });

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

    req.session.twitter_screen_name = user.screen_name;
    res.cookie("twitter_screen_name", user.screen_name, {
      maxAge: 90000000,
      httpOnly: true,
    });

    // console.log("user succesfully logged in with twitter", user.screen_name);
    req.session.save(() => res.redirect("/"));
  });
  app.post("/tweet/post", async (req, res) => {
    const tweetPost = req.body.tweet;
    const data = {
      text: tweetPost,
    };

    // const result = await getOAuthAccessTokenWith({
    //   oauthRequestToken,
    //   oauthRequestTokenSecret,
    //   oauthVerifier
    // });
    // const { oauthAccessToken, oauthAccessTokenSecret} = result;

    //console.log(oauthConsumer)
    

    // const authHeader = oauthConsumer.prepareParameters({
    //   oauthAccessToken,
    //   oauthAccessTokenSecret,
    //   method: 'POST',
    //   url: actionUrl,
    // });

    axios
      .post(actionUrl, data, {
        headers: {
          Authorization: ["Authorization"],
          "user-agent": "v2CreateTweetJS",
          "content-type": "application/json",
          accept: "application/json",
        },
      })
      .then(
        (res) => console.log(res),
        (err) => console.log(err)
      );
  });
}
