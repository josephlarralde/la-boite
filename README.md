# La boite

This is a local nodejs server managing pure data projects from a static webpage.
It currently runs on a raspberry pi 3B+ with the
[RealtimePi](https://github.com/guysoft/RealtimePi) distribution and
an audioinjector zero I2S sound card, and is used as a versatile multi-effect
box in the effect loop of an old tube amp.

A bunch of tools and libraries must be installed in order to build and setup
everything. The whole process is automated in `initpi.sh`.

A valid pure data project must be a directory containing at least a patch named
`main.pd` at its root level, and any subdirectory structure with all other
files being of type `.pd` or `.txt`.
