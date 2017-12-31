# Pubst

I suggest that you **DO NOT** use this for anything terribly serious just yet.  I'm still kind of feeling it out myself.

This is yet another basic asynchronous pub/sub implementation in JavaScript.  I almost used [PubSubJS](https://github.com/mroderick/PubSubJS), but there are a few features I wanted that it doesn't support.  I may try and add those in so I don't need to maintain this lib ;-). The features I wanted in a pub/sub lib (in order of importance) are:
  + Prime subscribers with latest payload even if it occurred before the subscription.
  + Allow subscribers to define default payloads to be sent in the event of an empty or `null` publish.
  + Warnings when publishing to a topic that has no subscribers. (Not implemented here either)
  + Allow for a subscription to all topics. (Not implemented here either)

## TODO (In no particular order)
  + If I'm going to continue to use this implementation, I should probably write actual documentation.
  + Warnings when publishing to a topic that has no subscribers.
  + Allow for a subscription to all topics.
  + Heirarchical topic names and pubish events.
  + An initialization of the event emitter that allows for explicit naming of known topics.
    + Once implemented, can warn when a topic is subscribed to that has not been declared.
  + Warnings when a large number of subscribers exist for a given topic. (Maybe max is configurable?) Should help in the detection of subscriber leaks.
  + Support debounce settings for spurriously noisy topics.
  + Support throttle settings for consistently noisy topics.
  + Support topic queing with a max history size to maintain.
  + Support various persistent storage strategies.
  + ???
  + Profit
