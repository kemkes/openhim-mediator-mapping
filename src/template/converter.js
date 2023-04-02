'use strict'

const logger = require('../logger')
const {templateCache} = require('../db/services/templates/cache')

const prepareTemplates = ctx => {
  if (!ctx.request.body.body) {
    const errorMessage = `Body object not found`
    logger.error(errorMessage)
    throw Error(errorMessage)
  }

  let prepare = []
  let warning = []
  let body = ctx.request.body.body
  const profile = body.profile ? 
    typeof body.profile === 'string' ? 
      [body.profile] : Array.isArray(body.profile) ? 
        body.profile : ['*'] : ['*'];
  const mainProfile = profile[0]

  for (let target in templateCache) {
    let bodyTarget = body[target]
    if (bodyTarget) {
      const templates = templateCache[target]

      if (
        !bodyTarget || 
        Array.isArray(bodyTarget) && bodyTarget.length == 0 || 
        typeof bodyTarget === 'object' && Object.keys(bodyTarget).length == 0
      ) {
        logger.info(
          `TemplateTransform ${target}: skip processiong for empty body target`
        )

        continue
      }

      if (templates.root.type == 'ARRAY') {
        if (!Array.isArray(bodyTarget))
          bodyTarget = [bodyTarget]
      }else {
        if (Array.isArray(bodyTarget))
          bodyTarget = [bodyTarget[0]]
      }

      for (let i = 0; i < bodyTarget.length; i++) {
        const item = bodyTarget[i];
        const uprofile = item.profile || mainProfile
        const alias = item.alias || null

        let template
        if (templates.sub[uprofile].length > 0) {
          template = templates.sub[uprofile].find( val => val.alias == alias)
        }else if (!alias){
          template = templates.root
        }

        if (template) {
          let obj = {
            target: target,
            template: template,
            type: templates.root.type,
            item: item
          }

          if (obj.type == 'ARRAY')
            obj.index = i
          
          prepare.push(obj)
        } else {
          warning.push({
            index: i,
            item: item,
            target: target,
            profile: uprofile,
            alias: alias
          })
          logger.debug(
            `TemplateTransform ${target}: no profile ${uprofile} or alias ${alias} found, processiong skipped`
          )
        }
      }

      delete body[target]
    }
  }

  // masukkan body yang tersisa menjadi global
  return {prepare: prepare, global: body, warning: warning}
}

const prepareConverter = ctx => {
  const {prepare, global, warning} = prepareTemplates(ctx)
  
  ctx.state.metaData.converter = prepare
  ctx.state.allData.global = global
  ctx.state.allData.warning = warning
}

exports.converterMiddleware = () => async (ctx, next) => {
  prepareConverter(ctx)
  await next()
}