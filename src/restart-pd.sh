#!/bin/bash

killall pd;

# this is OK for RealTimePi
pd -nogui -audiobuf 20 -blocksize 64 -open $1 &

# this is OK for non real-time raspbian
# pd -nogui -audiobuf 50 -blocksize 256 -open $1 &

# pd -nogui -channels "1 1" -open $1 &
# /Applications/Pd-0.48-1-i386.app/Contents/Resources/bin/pd -nogui -audiodev "1 1" -audiobuf 12 -open $1 &
# /Applications/Pd-0.48-1-i386.app/Contents/Resources/bin/pd -nogui -open $1 &
# /Applications/Pd-0.50-0.app/Contents/Resources/bin/pd -listdev -nogui -audiodev "1 1" -channels "1 1" -open $1 &