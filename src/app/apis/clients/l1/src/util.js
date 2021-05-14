const Axios = require("axios").default;
const defaultTimeout = 2500; // ms

const handleSuccess = (resolve, callback) => body => {
  callback && callback(null, body);
  resolve(body);
};

const handleError = (reject, callback) => error => {
  callback && callback(error);
  reject(error);
};

const sendPostRequest = (
  action,
  { apiUrl, token, useAuthenticate, requestTimeout }
) => (params, options, callback) =>
  new Promise((resolve, reject) => {
    if (!options) {
      options = {};
    }

    const languageCode = params.languageCode
      ? { LanguageCode: params.languageCode }
      : {};
    const authorization = useAuthenticate ? { Authorization: token } : {};
    const config = {
      headers: { ...authorization, ...languageCode },
      timeout: options.requestTimeout || requestTimeout || defaultTimeout
    };

    if (params.languageCode) {
      delete params.languageCode;
    }

    Axios.post(`${apiUrl}${action}`, params, config)
      .then(data => data.data)
      .then(handleSuccess(resolve, callback))
      .catch(handleError(reject, callback));
  });

const createAction = (metadata, config) =>
  metadata.reduce((result, data) => {
    result[data.name] = sendPostRequest(data.action, config);
    return result;
  }, {});

module.exports = {
  sendPostRequest,
  createAction
};
