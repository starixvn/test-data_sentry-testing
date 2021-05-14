const logger = require('./../web/logger');
const Notifications = require('./../Models/Notification');

let marqueeMessageConfig = require('./../../config/appConfigs').marqueeMessageConfig;
const minute = 60 * 1000;
let marqueeInterval = null;
let intervalTime =  marqueeMessageConfig.intervalTimeInMinute * minute

const setMarquee = (io) => {
    marqueeInterval = setInterval(() => {
        Notifications
            .find({"displayKind" : 1}, "message")
            .then(function(notifications){           
                processMessages(notifications, io);
            })
            .catch(function(err){
                logger.logError(err);
                console.log(err);
            });
        
    }, intervalTime);
}

const processMessages = (notifications, io) => {
    for (let index = 0; index < notifications.length; index++) {
        setTimeout(() => {
            try {                
                io.sendInHome({ marqueeMsg: notifications[index].message });
            } catch (err) {
                logger.logError(err);
            };
        }, index * marqueeMessageConfig.delayTimeInMinute * minute);        
    };

    clearInterval(marqueeInterval);
    intervalTime = notifications.length * marqueeMessageConfig.delayTimeInMinute * minute;
    setMarquee(io);
}

module.exports = setMarquee