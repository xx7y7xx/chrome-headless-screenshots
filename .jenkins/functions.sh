#!/bin/bash

SSH_OPTS=" -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no "

# # Change to source root dir
# utils_dir=`dirname $(readlink -f $0)`
# root_dir=`dirname $utils_dir`
# src=dist/
# cd $root_dir

# gen config.js
gen_config() {
  scheme="$1"
  host_port="$2"
  path_prefix="$3"
  output_file="$4"
  cat <<EOT > $output_file
var G_SCHEME = '$scheme';
var G_HOST_PORT = '$host_port';
var G_PATH_PREFIX = '$path_prefix';
EOT
}

# sync files to remote
sync_files() {
  ssh_ip="$1"
  ssh_port="$2"
  ssh_user="$3"
  rsync_src="$4"
  rsync_dest="$5"
  rsync -arvzh --delete --progress --chmod=a+rwx \
    --exclude='.git/' \
    -e "ssh -p $ssh_port ${SSH_OPTS} " \
    $rsync_src $ssh_user@$ssh_ip:$rsync_dest
}
