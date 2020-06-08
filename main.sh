#!/bin/bash
for loop in 0 1
do
{
    supervisor -- app.js -i $loop 
} &
done
wait
sleep 100