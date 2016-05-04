'use strict';

const Lazy          = require('lazy.js');
const Store         = require('../Store');
const EventLogIndex = require('./EventIndex');

class EventStore extends Store {
  constructor(ipfs, dbname, options) {
    super(ipfs, dbname, options)
    this._index = new EventLogIndex();
  }

  delete(dbname) {
    super.delete();
    this._index = new EventLogIndex();
  }

  add(data) {
    return this._addOperation('ADD', null, data);
  }

  remove(hash) {
    return this._addOperation('DEL', null, hash);
  }

  iterator(options) {
    const messages = this._query(this.dbname, options);
    let currentIndex = 0;
    let iterator = {
      [Symbol.iterator]() {
        return this;
      },
      next() {
        let item = { value: null, done: true };
        if(currentIndex < messages.length) {
          item = { value: messages[currentIndex], done: false };
          currentIndex ++;
        }
        return item;
      },
      collect: () => messages
    }

    return iterator;
  }

  _query(dbname, opts) {
    if(!opts) opts = {};

    const amount = opts.limit ? (opts.limit > -1 ? opts.limit : this._index.get().length) : 1; // Return 1 if no limit is provided
    const operations = this._index.get();
    let result = [];

    if(opts.gt || opts.gte) {
      // Greater than case
      result = this._read(operations, opts.gt ? opts.gt : opts.gte, amount, opts.gte ? true : false)
    } else {
      // Lower than and lastN case, search latest first by reversing the sequence
      result = this._read(operations.reverse(), opts.lt ? opts.lt : opts.lte, amount, opts.lte || !opts.lt).reverse()
    }

    if(opts.reverse) result.reverse();

    return result.toArray();
  }

  _read(ops, hash, amount, inclusive) {
    return Lazy(ops)
      .skipWhile((f) => hash && f.hash !== hash)
      .drop(inclusive ? 0 : 1)
      .take(amount);
  }
}

module.exports = EventStore;