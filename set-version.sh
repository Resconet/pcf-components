#! /bin/bash

[[ -z "$1" ]] && echo "$0 apps-version [components-version]" && exit 1

patch_package() {
  find apps -maxdepth 2 -name package.$1.json -print -execdir sed -bi '/\(version": "\)\([0-9\.]\+\)/,${s//\1'"$2"'/;b};$q1' {} \;
}

pushd $(dirname $0)
npm version --no-git-tag-version --allow-same-version $1
patch_package noui $1
if [[ -n "$2" ]]; then
  find apps/components -name package.json -print -execdir npm version --no-git-tag-version --allow-same-version $2 \;
  find libs/jsbridge -name package.json -print -execdir npm version --no-git-tag-version --allow-same-version $2 \;
  patch_package mobileapp $2
fi
popd
