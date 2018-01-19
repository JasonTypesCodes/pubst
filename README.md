# Pubst

[![Build Status](https://travis-ci.org/VoltiSubito/pubst.svg?branch=main)](https://travis-ci.org/VoltiSubito/pubst)

I suggest that you **DO NOT** use this for anything terribly serious just yet.  I'm still kind of feeling it out myself.

This is yet another basic asynchronous pub/sub implementation in JavaScript.  I almost used [PubSubJS](https://github.com/mroderick/PubSubJS), but there are a few features I wanted that it doesn't support.  I may try and add those in so I don't need to maintain this lib ;-). The features I wanted in a pub/sub lib (in order of importance) are:
  + Prime subscribers with latest payload even if it occurred before the subscription.
  + Allow subscribers to define default payloads to be sent in the event of an empty or `null` publish.
  + Warnings when publishing to a topic that has no subscribers.

## TODO (In no particular order)
  + Use this in a few things to feel out the API.
  + If I'm going to continue to use this implementation, I should probably write actual documentation.
