#!/bin/bash

# jenkins should generate `passwd.js` at workspace root dir (Config File Provider Plugin)
# https://wiki.jenkins.io/display/JENKINS/Config+File+Provider+Plugin

scripts_dir="$(dirname "$0")"
. "$scripts_dir/functions.sh"

echo DEBUG-start
pwd
set
echo DEBUG-end

SECONDS=0

npm install --registry=https://registry.npm.taobao.org
mkdir -p output
npm run shot:all && npm run crop:all

sync_files '10.3.14.3' '22' 'root' './output' \
  '/data/ficloud/uiresources/fuck/static'
sync_files '10.3.14.5' '22' 'root' './output' \
  '/data/ficloud/uiresources/fuck/static'

duration=$SECONDS
echo "$(($duration / 60)) minutes and $(($duration % 60)) seconds elapsed."

date
