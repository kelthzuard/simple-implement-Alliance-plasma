#!/bin/bash
echo "ready to start $1 nodes"
node generateKey.js -n $1
echo "nodetable generated, start server"
sleep 2
for((i = 0; i < $1; i ++))
do
{
    supervisor -- app.js -i $i
} &
done
wait
