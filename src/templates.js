'use strict'

const {initiateContextMiddleware} = require('./template/initiate')
const {parseBodyMiddleware} = require('./template/parser')
const {converterMiddleware} = require('./template/converter')
const {transformerMiddleware} = require('./template/transformer')
const {validateBodyMiddleware} = require('./template/validator')
const {mapBodyMiddleware} = require('./template/mapper')
const {populateTemplateCache} = require('./db/services/templates/cache')

const transformTemplateRoute = router => {
  populateTemplateCache()

  router.post(
    '/template/transform',
    // /^\/template\/[\d\w-._~/:]+$/,
    initiateContextMiddleware(),
    parseBodyMiddleware(),
    validateBodyMiddleware(),
    converterMiddleware(),
    transformerMiddleware(),
    mapBodyMiddleware()
  )
}

exports.createTemplateRoute = router => {
  transformTemplateRoute(router)
}
