function first(client) {
  var data = {
    Authorized: true,
  };
  client.red(data);
}

function onData(client, data) {}

module.exports = {
  first: first,
  onData: onData,
};
