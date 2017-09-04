#!/bin/bash

# jenkins should generate `passwd.js` at workspace root dir (Config File Provider Plugin)
# https://wiki.jenkins.io/display/JENKINS/Config+File+Provider+Plugin

npm install --registry=https://registry.npm.taobao.org
mkdir -p output
npm run shot:all && npm run crop:all