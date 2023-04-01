'use strict'

// const jsonata = require('jsonata')
const {jsonataExecute, jsonataId} = require('../jsonataCache')

const logger = require('../logger')

const jsonataTransformer = ctx => {
  const inputTransforms = ctx.state.metaData.inputTransforms

  if (!inputTransforms || Object.keys(inputTransforms).length === 0) {
    return
  }

  ctx.state.allData.transforms = {}

  Object.keys(inputTransforms).forEach(transformKey => {
    // const expression = jsonata(inputTransforms[transformKey])
    // const result = expression.evaluate(ctx.state.allData)
    const jsonataKey = jsonataId('plain', `${ctx.state.metaData.name}#transforms-${transformKey}`)
    const result = jsonataExecute(jsonataKey, inputTransforms[transformKey], ctx.state.allData)

    ctx.state.allData.transforms[transformKey] = result
  })

  logger.info(
    `${ctx.state.metaData.name} (${ctx.state.uuid}): Input transforms completed`
  )
}

exports.transformerMiddleware = () => async (ctx, next) => {
  try {
    jsonataTransformer(ctx)

    await next()
  } catch (error) {
    ctx.status = 500
    const errorMessage = `Input transform error: ${error.message}`
    logger.error(errorMessage)
    throw Error(errorMessage)
  }
}
