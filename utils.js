const oauth = require("oauth");
require("dotenv").config();
const { promisify } = require("util");
const TWITTER_CONSUMER_API_KEY = process.env.TWITTER_CONSUMER_KEY;
const TWITTER_CONSUMER_API_SECRET_KEY = process.env.TWITTER_CONSUMER_SECRET;

const oauthConsumer = new oauth.OAuth(
  "https://twitter.com/oauth/request_token",
  "https://twitter.com/oauth/access_token",
  TWITTER_CONSUMER_API_KEY,
  TWITTER_CONSUMER_API_SECRET_KEY,
  "1.0A",
  "http://localhost:3000/twitter/callback",
  "HMAC-SHA1"
);


async function oauthGetUserById(
  userId,
  { oauthAccessToken, oauthAccessTokenSecret } = {}
) {
  return promisify(oauthConsumer.get.bind(oauthConsumer))(
    `https://api.twitter.com/1.1/users/show.json?user_id=${userId}`,
    oauthAccessToken,
    oauthAccessTokenSecret
  ).then((body) => JSON.parse(body));
}
async function getOAuthAccessTokenWith({
  oauthRequestToken,
  oauthRequestTokenSecret,
  oauthVerifier,
} = {}) {
  return new Promise((resolve, reject) => {
    oauthConsumer.getOAuthAccessToken(
      oauthRequestToken,
      oauthRequestTokenSecret,
      oauthVerifier,
      function (error, oauthAccessToken, oauthAccessTokenSecret, results) {
        return error
          ? reject(new Error(error.data))
          : resolve({ oauthAccessToken, oauthAccessTokenSecret, results });
      }
    );
  });
}
async function getOAuthRequestToken() {
  return new Promise((resolve, reject) => {
    oauthConsumer.getOAuthRequestToken(function (
      error,
      oauthRequestToken,
      oauthRequestTokenSecret,
      results
    ) {
      return error
        ? reject(new Error(error))
        : resolve({ oauthRequestToken, oauthRequestTokenSecret, results });
    });
  });
}



module.exports = {
  oauthGetUserById,
  getOAuthAccessTokenWith,
  getOAuthRequestToken,
  oauthConsumer
};
