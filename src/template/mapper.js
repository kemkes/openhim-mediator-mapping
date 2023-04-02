'use strict'

const objectMapper = require('object-mapper')

const logger = require('../logger')
const {OPENHIM_TRANSACTION_HEADER} = require('../constants')
const {createOrchestration} = require('../orchestrations')

const createCombinedResult = (ctx, result) => {
  const config = ctx.state.metaData.config
  const output = {}

  try {
    const allData = ctx.state.allData
    const obj = {
      result: result,
      constants: config.constants,
      transforms: ctx.state.allData.transforms.final || {}
    }
    const dataToBeMapped = Object.assign({}, allData, obj)
    Object.assign(
      output,
      objectMapper(dataToBeMapped, config.inputMapping)
    )
  } catch (error) {
    logger.error(
      `TemplateTransform: Object mapping final response failed: ${error.message}`
    )
    // Set the status code which will used to set the response status
    ctx.statusCode = 500
    throw Error(`Object mapping schema invalid: ${error.message}`)
  }

  // set the outgoing payload as useable data point
  ctx.state.allData.responseBody = output
  
  ctx.body = output
  ctx.status = 200

  logger.info(`TemplateTransform: Successfully mapped output document`)

  return output
}

const createMappedObject = ctx => {
  const config = ctx.state.metaData.config
  const converter = ctx.state.metaData.converter
  const result = config.format == 'ARRAY' ? [] : {}
  const allData = JSON.parse(JSON.stringify(ctx.state.allData))
  const allData2 = allData
  const mappingStartTimestamp = new Date()
  
  converter.forEach(convert => {
    if (
      !convert.template.inputMapping ||
      !Object.keys(convert.template.inputMapping).length
    ) {
      logger.warn(
        `${convert.template.name}: No mapping schema supplied`
      )
      // ctx.body = ctx.state.allData.lookupRequests
      //   ? {
      //       requestBody: ctx.state.allData.requestBody,
      //       lookupRequests: ctx.state.allData.lookupRequests
      //     }
      //   : ctx.state.allData.requestBody
      return
    }
  
    const keyItem = convert.type == 'ARRAY' ? `${convert.target}-${convert.index}` : convert.target
    const obj = {
      constants: convert.template.constants || {},
      transforms: ctx.state.allData.transforms[keyItem],
      item: convert.item
    }
    if (convert.type == 'ARRAY')
      obj.itemIndex = convert.index

    const dataToBeMapped = Object.assign({}, allData, obj)
    const output = {}
  
    try {
      Object.assign(
        output,
        objectMapper(dataToBeMapped, convert.template.inputMapping)
      )

      if (config.format == 'ARRAY') {
        result.push(output)
      }else {
        result[keyItem] = output
      }

      allData2[keyItem] = obj
    } catch (error) {
      logger.error(
        `${convert.template.name}: Object mapping failed: ${error.message}`
      )
      // Set the status code which will used to set the response status
      ctx.statusCode = 500
      throw Error(`Object mapping schema invalid: ${error.message}`)
    }
  })

  // create combined result
  const combined = createCombinedResult(ctx, result)

  if (ctx.request.headers && ctx.request.headers[OPENHIM_TRANSACTION_HEADER]) {
    const orchestrationName = `TemplateTransform Mapping`
    const mappingEndTimestamp = new Date()
    const response = {
      body: combined
    }
    const error = null

    if (!ctx.orchestrations) {
      ctx.orchestrations = []
    }

    const orchestration = createOrchestration(
      {data: allData2},
      response,
      mappingStartTimestamp,
      mappingEndTimestamp,
      orchestrationName,
      error
    )

    ctx.orchestrations.push(orchestration)
  }
}

exports.mapBodyMiddleware = () => async (ctx, next) => {
  createMappedObject(ctx)
  await next()
}