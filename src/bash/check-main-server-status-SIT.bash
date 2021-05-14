#!/bin/bash

status_code=$(curl --write-out %{http_code} --silent --output /dev/null http://10.2.189.63:6200/)
cron_cmd="(echo 'L1 Game Server SIT CI script execution'; cd /var/www/l1/game-server/sit/game-server-compiled/; /bin/sh ./gitlab-ci-after-script-SIT.sh)"
cron_job="* * * * * $cron_cmd"

cron_cmd1="(echo 'L1 Game Server SIT Pull code script execution'; cd /var/www/l1/game-server/sit/game-server-compiled/; git checkout -- .; git pull; npm install;)"
cron_job1="* * * * * $cron_cmd1"

if [[ "$status_code" -eq 200 ]] ; then
  echo "Main server is active, status: $status_code";
  systemctl is-active --quiet l1-game-server-sit.service && (sudo systemctl stop l1-game-server-sit.service &&  (crontab -l | grep -v -F "$cron_cmd" | crontab -) && (crontab -l | { cat; echo "$cron_job1"; } | crontab - ))
else
  echo "Start backup server!!!!";
  systemctl is-active --quiet l1-game-server-sit.service || ( sudo systemctl restart l1-game-server-sit.service && (crontab -l | { cat; echo "$cron_job"; } | crontab -) && ( crontab -l | grep -v -F "$cron_cmd1"  | crontab -) )
fi
