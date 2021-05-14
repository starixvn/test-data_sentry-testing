const { Issuer, custom } = require("openid-client");
const initAuth = require("./auth");
const initMember = require("./member");
const beforeTokenExpired = 60 * 5;
const intervalTime = 60000;

custom.setHttpOptionsDefaults({
  timeout: intervalTime
});

class GameClient {
  constructor(config) {
    this.config = config;
    this.auth = initAuth(this.config);
    this.member = initMember(this.config);
  }

  async autoUpdateToken(callback) {
    await this.updateToken(callback);

    this.interval = setInterval(() => {
      if (this.isTokenExpired()) {
        (async () => {
          await this.updateToken(callback);
        })();
      }
    }, intervalTime);
  }

  isTokenExpired() {
    return (
      !this.config.expired ||
      this.config.expired - Date.now() / 1000 - beforeTokenExpired <= 0
    );
  }

  async updateToken(callback) {
    try {
      const result = await this.getBearerToken();
      this.config.token = result.token;
      this.config.expired = result.expired;
      this.member = initMember(this.config);
      this.auth = initAuth(this.config);

      callback && callback(null, "Get bearer token successfully.");
    } catch (error) {
      callback && callback("Get bearer token failure: " + error);
    }
  }

  async getBearerToken() {
    const data = {
      grant_type: "client_credentials",
      client_id: this.config.client.id,
      client_secret: this.config.client.secret
    };

    return await Issuer.discover(this.config.authUrl)
      .then(issuer => new issuer.Client(data))
      .then(client => client.grant(data))
      .then(token =>
        token.access_token
          ? {
              token: `${token.token_type} ${token.access_token}`,
              expired: token.expires_at
            }
          : Promise.reject(token)
      );
  }
}

module.exports = config => {
  if (config) {
    global._gameClient = new GameClient(config);
  }

  return global._gameClient;
};
