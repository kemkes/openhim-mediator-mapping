'use strict'

const { DateTime } = require('luxon')

// const logger = require('../logger')
// const { templateCache } = require('../db/services/templates/cache')

exports.initiateContextMiddleware = () => async (ctx, next) => {
  // set the initial start time for entry into the template
  const templateStart = DateTime.utc().toISO()

  // initiate the property for containing all useable data points
  ctx.state.allData = {
    timestamps: {
      templateStart,
      templateEnd: null
    },
    requestHeaders: ctx.request.headers || {}
  }

  let config = ctx.request.body.config || {
    format: 'ARRAY',
    inputMapping: {
      "constants.resourceType": "resourceType",
      "constants.type": "type",
      "result": "entry"
    },
    inputTransforms: {},
    constants: {
      "resourceType": "Bundle",
      "type": "transaction"
    }
  }

  ctx.state.metaData = {
    config: config
  }

  await next()
}
