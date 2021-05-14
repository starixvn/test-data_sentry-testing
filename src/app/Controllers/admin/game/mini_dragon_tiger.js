
let getNew = require('./miniDragonTiger/get_new');

module.exports = function (client, data) {
    if (void 0 !== data.view) {
        client.gameEvent.viewMiniDragonTiger = !!data.view;
    }
    if (void 0 !== data.get_new) {
        getNew(client);
    }
}
