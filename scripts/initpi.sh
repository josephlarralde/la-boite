#!/usr/bin/env bash

# this shebang should allow sourcing of .bashrc with '.' to allow installation
# of specific node version (10.15.3) with 'n' just after 'n' is installed
# see https://askubuntu.com/questions/64387/cannot-successfully-source-bashrc-from-a-shell-script

############### INSTALL REQUIRED DEPENDENCIES
echo 'installing required dependencies ...'

sudo apt-get update -y
sudo apt-get upgrade -y
sudo apt --fix-broken install -y
sudo apt-get install -y build-essential autoconf automake libtool gettext git gcc g++ libasound2-dev libjack-jackd2-dev libfftw3-3 libfftw3-dev make tcl tk

############### INSTALL PURE DATA
echo 'installing pure data ...'

# wget http://msp.ucsd.edu/Software/pd-0.49-0.src.tar.gz
# tar -xzf pd-0.49-0.src.tar.gz
# cd pd-0.49-0
git clone https://github.com/pure-data/pure-data --depth 1 --branch 0.53-2 # --branch works for tags as well
./autogen.sh
./configure # --enable-jack --enable-fftw # these options don't seem necessary
# make
sudo make install
cd ..

############### INSTALL THE COMPORT EXTERNAL
echo 'installing comport external ...'

# wget https://sourceforge.net/projects/pure-data/files/libraries/comport/comport-0.2.tar.gz
# tar -xvf comport-0.2.tar.gz
# cd comport-0.2
git clone https://git.iem.at/pd/comport.git
cd comport
sudo make install
cd ..

############### INSTALL JL.PD.LIB
echo 'installing jl.pd.lib ...'

# cannot wget release as releases don't include submodules
# wget -O jl.pd.lib-v0.1.3.tar.gz https://github.com/josephlarralde/jl.pd.lib/archive/v0.1.3.tar.gz

git clone --recursive https://github.com/josephlarralde/jl.pd.lib
cd jl.pd.lib
sudo make install
cd ..

############### INSTALL NODEJS
echo 'installing nodejs ...'

curl -L https://git.io/n-install | bash -s -- -y
source /home/pi/.bashrc
n 18.16.1


############## INSTALL THIS REPOSITORY
echo 'cloning la-boite repository ...'

git clone https://github.com/josephlarralde/la-boite.git
cd la-boite
npm install
cd ..

############## CREATE NODE SERVER SERVICE
# see discussion :
# https://www.raspberrypi.org/forums/viewtopic.php?t=144009
# and also :
# https://www.reddit.com/r/raspberry_pi/comments/15m3cy/play_startup_sound_systemd/

echo 'creating la-boite-server service ...'

sudo touch /etc/systemd/system/la-boite-server.service

(
  echo '[Unit]'
  echo 'Description=Start la boite node server'
  # echo 'After=multi-user.target'
  echo 'DefaultDependencies=no'
  echo 'Wants=sound.target'
  echo 'After=sound.target'
  echo ''
  echo '[Service]'
  echo 'WorkingDirectory=/home/pi/la-boite'
  echo 'ExecStart=/home/pi/n/n/versions/node/10.15.3/bin/node src/server.js'
  echo 'Restart=always'
  echo 'RestartSec=60'
  echo 'User=root'
  echo 'Group=root'
  echo 'Environment=PORT=80'
  echo ''
  echo '[Install]'
  # echo 'WantedBy=multi-user.target'
  echo 'WantedBy=sysinit.target'
) | sudo tee -a /etc/systemd/system/la-boite-server.service

sudo systemctl start la-boite-server
sudo systemctl enable la-boite-server

