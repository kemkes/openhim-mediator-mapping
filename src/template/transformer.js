'use strict'

// const jsonata = require('jsonata')
const {jsonataExecute, jsonataId, jsonataExists} = require('../jsonataCache')

const logger = require('../logger')

const jsonataTransformer = ctx => {
  const converter = ctx.state.metaData.converter

  ctx.state.allData.transforms = {}

  converter.forEach(convert => {
    const inputTransforms = convert.template.inputTransforms

    if (!inputTransforms || Object.keys(inputTransforms).length === 0) {
      return
    }

    const allData = JSON.parse(JSON.stringify(ctx.state.allData))
    const keyItem = convert.type == 'ARRAY' ? `${convert.target}-${convert.index}` : convert.target
    ctx.state.allData.transforms[keyItem] = {}

    Object.keys(inputTransforms).forEach(transformKey => {
      let stringEx = inputTransforms[transformKey]

      const jsonataKey = jsonataId('plain', `${keyItem}#transforms-template-${transformKey}`)
      if (!jsonataExists(jsonataKey)) {
        // insert function collection library
        const e = stringEx.match(/^\s*use (.+);/)
        if (e && e[1]) {
          let strF = ''
          let libs = e.trim().split(/\s+/)
          const library = convert.template.library || {}
          for (let i = 0; i < libs.length; i++) {
            const l = libs[i].trim()
            if (library[l]) {
              strF += library[l] + "\n"
              // if (i < libs.length - 1)
              //   strF += "\n"
            }
          }
          stringEx.replace(/^\s*use (.+);/, strF)
          if (strF) {
            stringEx = `(\n${stringEx}\n)`
          }
        }
      }
      
      const obj = {
        constants: convert.template.constants || {},
        item: convert.item
      }
      if (convert.type == 'ARRAY')
        obj.itemIndex = convert.index

      const data = Object.assign({}, allData, obj)
      // const expression = jsonata(stringEx)
      // const result = expression.evaluate(data)
      const result = jsonataExecute(jsonataKey, stringEx, data)
  
      ctx.state.allData.transforms[keyItem][transformKey] = result
    })
  })

  const config = ctx.state.metaData.config

  const configTransforms = config.inputTransforms
  if (configTransforms && Object.keys(configTransforms).length > 0) {
    const data = Object.assign({}, allData, {
      result: result,
      constants: config.constants
    })

    ctx.state.allData.transforms.final = {}

    Object.keys(configTransforms).forEach(transformKey => {
      // const expression = jsonata(configTransforms[transformKey])
      // const result = expression.evaluate(data)
      const jsonataKey = jsonataId('plain', `transforms-global-${transformKey}`)
      const result = jsonataExecute(jsonataKey, configTransforms[transformKey], data)

      ctx.state.allData.transforms.final[transformKey] = result
    })
  }

  logger.debug(`${keyItem} : Input transforms completed`)
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
