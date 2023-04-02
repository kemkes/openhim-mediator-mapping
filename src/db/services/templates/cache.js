'use strict'

const TemplateModel = require('../../models/templates')
const logger = require('../../../logger')

const templateService = require('.')

let eventEmitter
let templateCacheRaw = []
let templateCache = {}

exports.setupTemplateEventListeners = () => {
  eventEmitter = TemplateModel.watch()
  eventEmitter
    .on('change', addChangeListener)
    .on('end', addCloseListener)
    .on('error', addErrorListener)
  logger.info('MongoDB Change Event Listeners Added [Template]')
}

exports.removeTemplateEventListeners = () => {
  eventEmitter
    .removeAllListeners('change', addChangeListener)
    .removeAllListeners('end', addCloseListener)
    .removeAllListeners('error', addErrorListener)
  logger.info('MongoDB Change Event Listeners Removed [Template]')
}

const addChangeListener = change => {
  logger.debug(
    `TemplateId: ${change.documentKey._id} - Registered Change Event: ${change.operationType}`
  )
  populateTemplateCache()
}

const addCloseListener = () => {
  logger.fatal('MongoDB connection stream closed. [Template]')
}

const addErrorListener = error => {
  logger.fatal(`MongoDB Error detected [Template]: ${error.message}`)
}

const populateTemplateCache = async () => {
  await templateService
    .readTemplates()
    .then(updatedTemplates => {
      // update templateCacheRaw
      templateCacheRaw.splice(0, templateCacheRaw.length)
      templateCacheRaw.push(...updatedTemplates)

      templateCache = {}
      for (let template of updatedTemplates) {
        if (!templateCache[template.target])
          templateCache[template.target] = {root: null, sub: {}}
        
        if (template.extend) {
          const profile = template.profile || '*'
          if (!templateCache[template.target].sub[profile])
            templateCache[template.target].sub[profile] = []
            
          templateCache[template.target].sub[profile].push(template)
        } else
          templateCache[template.target].root = template
      }
    })
    .catch(error => {
      logger.fatal(
        `Failed to Read templates and Populate templateCache. Caused by: ${error.message}`
      )
      throw error
    })
}

exports.populateTemplateCache = populateTemplateCache
exports.templateCacheRaw = templateCacheRaw
exports.templateCache = templateCache
