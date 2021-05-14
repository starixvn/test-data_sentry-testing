#!/bin/bash

cron_cmd="(echo 'L1 Game Server CI script execution'; cd /var/www/l1/game-server/uat/game-server-compiled/; /bin/sh ./gitlab-ci-after-script-UAT.sh)"
cron_job="* * * * * $cron_cmd"
crontab -l | { cat; echo "$cron_job"; } | crontab - 
