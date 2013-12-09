# FireCollab
## Collaboration powered by [Firebase](http://firebase.com)

FireCollab is a collaboration framework made to simplify building collaborative web apps.

It uses [Firebase](http://firebase.com) for communication between clients and uber kewl JSON Operational Transformation (JOT) library by [Joshua Tauberer](https://github.com/JoshData) for... well - operational trasformation (Duh!)

## WTF?!

Install [5 min fork](http://5minfork.com/) browser extension to see examples in `examples` directory on GitHub without even downloading anything!

Now, go check it out. GO!

## Dependencies

 * [Firebase](http://firebase.com) - Scalable real-time backend
 * [jot](https://github.com/JoshData/jot) - JSON Operational Transformation (JOT)
 * [grunt](http://gruntjs.com/) - The JavaScript Task Runner

## How to start?

 * First, clone the repository (you can omit destination directory):

`git clone https://github.com/MiroHibler/FireCollab.git master`

 * Second, update dependencies:

`git submodule foreach --recursive git pull`

 * Lastly, build all (use `grunt --help` for more options)

`grunt`

You'll find all files in `build/out` directory.

## Roadmap

 * Fighting bugs
 * Writing a decent documentation
 * Fighting more bugs
 * Writing more adapters

## Changelog

### v0.0.1
 * Initial release

## Copyright and license

Copyright © 2013 [Miroslav Hibler](http://miro.hibler.me)

Licensed under the [**MIT**](http://miro.mit-license.org) license.
