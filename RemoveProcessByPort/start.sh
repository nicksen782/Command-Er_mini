#!/bin/bash

cd $( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

if !hash lsof 2>/dev/null; then
  echo "lsof does not exist (install with: sudo apt install lsof)"
fi

if !hash kill 2>/dev/null; then
  echo "kill does not exist (This should be standard in Linux.)"
fi

# echo "*****************************************"
# echo "Checking if app port is already in use..."
# echo "*****************************************"
node -e "(async function(portNumber){ let resp; try{ resp = await require('./removeprocess.js')(portNumber); } catch(e){ resp = e; } console.log(resp.text); })($1);"
