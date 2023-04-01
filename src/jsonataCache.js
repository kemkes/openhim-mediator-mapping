'use strict'

const jsonata = require('jsonata')
const logger = require('./logger')

const cacheJsonata = {}
const expiredTime = 60
const gcThreshold = 10

const jsonataExecuteInternal = (identifier, expression, input, bindings, callback) => {
  let expr
  if (!cacheJsonata[identifier] || !cacheJsonata[identifier].expression) {
    expr = jsonata(expression)
    cacheJsonata[identifier] = {
      expired: Date.now() / 1000 + expiredTime,
      expression: expr,
      expressionString: expression
    }
  } else {
    expr = cacheJsonata[identifier].expression
  }

  return expr.evaluate(input, bindings, callback)
}

const removeExpired = () => {
  const now = Date.now()
  if (now % gcThreshold > gcThreshold / 2) {
    Object.keys(cacheJsonata)
      .filter(k1 => cacheJsonata[k1].expired < now / 1000)
      .forEach(k2 => delete cacheJsonata[k2])
  }
}

exports.jsonataExecute = (identifier, expression, input, bindings, callback) => {
  removeExpired()

  return jsonataExecuteInternal(identifier, expression, input, bindings, callback);
}

exports.jsonataExists = (identifier) => {
  return cacheJsonata[identifier] && cacheJsonata[identifier].expression
}

exports.jsonataId = (type, path) => {
  if (type == 'checksum') {
    // TODO doing md5/sha1 checksum for content
    return path
  }

  return path
}