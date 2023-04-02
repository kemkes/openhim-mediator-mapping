'use strict'

const rawBodyParser = require('raw-body')

const logger = require('./logger')

const {handleServerError} = require('./util')

const templateServices = require('./db/services/templates')

const KoaBodyParser = () => async (ctx, next) => {
  try {
    const body = await rawBodyParser(ctx.req)

    ctx.request.body = body.toString() ? JSON.parse(body) : {}
    await next()
  } catch (error) {
    const failureMsg = 'Parsing incoming request body failed: '
    ctx.statusCode = 400
    handleServerError(ctx, failureMsg, error, logger)
  }
}

const createTemplateRoute = router => {
  router.post('/templates', KoaBodyParser(), async (ctx, next) => {
    const failureMsg = 'Create template failed:'

    try {
      await templateServices
        .createTemplate(ctx.request.body)
        .then(result => {
          ctx.status = 201
          ctx.body = result
          logger.info(
            `Template "${result.name}" created on ${result.target}`
          )
          return next()
        })
        .catch(error => {
          ctx.statusCode = 400
          handleServerError(ctx, failureMsg, error, logger)
          return next()
        })
    } catch (error) {
      handleServerError(ctx, failureMsg, error, logger)
      next()
    }
  })
}

const readTemplateRoute = router => {
  router.get('/templates/:templateId', async (ctx, next) => {
    const failureMsg = 'Retrieving of template failed: '

    try {
      const templateId = ctx.params.templateId

      if (!templateServices.validateTemplateId(templateId)) {
        throw Error('Template ID supplied in url is invalid')
      }

      await templateServices
        .readTemplate(templateId)
        .then(template => {
          if (template) {
            ctx.status = 200
            ctx.body = template
            logger.info(
              `Template "${template.name}" with target ${template.target} has been retrieved`
            )
          } else {
            const error = `Template with ID ${templateId} does not exist`
            ctx.status = 404
            ctx.body = {error: error}
            logger.error(`${failureMsg}${error}`)
          }
          next()
        })
        .catch(error => {
          ctx.statusCode = 500
          handleServerError(ctx, failureMsg, error, logger)
          next()
        })
    } catch (error) {
      ctx.statusCode = 400
      handleServerError(ctx, failureMsg, error, logger)
      next()
    }
  })
}

const readTemplatesRoute = router => {
  router.get('/templates', async (ctx, next) => {
    const failureMsg = 'Retrieving of templates failed: '

    try {
      const queryParams = ctx.request.query

      await templateServices
        .readTemplates(queryParams)
        .then(templates => {
          ctx.status = 200
          ctx.body = templates
          logger.debug(
            `Retrieved ${
              templates.length
            } Templates matching query param: ${JSON.stringify(queryParams)}`
          )
          next()
        })
        .catch(error => {
          handleServerError(ctx, failureMsg, error, logger)
          next()
        })
    } catch (error) {
      handleServerError(ctx, failureMsg, error, logger)
      next()
    }
  })
}

const updateTemplateRoute = router => {
  router.put('/templates/:templateId', KoaBodyParser(), async (ctx, next) => {
    const failureMsg = 'Updating of template failed: '

    try {
      const templateId = ctx.params.templateId

      if (!templateServices.validateTemplateId(templateId)) {
        throw Error('Template ID supplied in url is invalid')
      }

      if (
        !ctx.request ||
        !ctx.request.body ||
        !Object.keys(ctx.request.body).length
      ) {
        ctx.status = 400
        const error = `${failureMsg}Invalid template object`
        ctx.body = {error: error}
        logger.error(error)
        return next()
      }

      const body = Object.assign({lastUpdated: Date.now()}, ctx.request.body)

      await templateServices
        .updateTemplate(templateId, body)
        .then(result => {
          if (result) {
            ctx.status = 200
            ctx.body = result
            logger.info(
              `Template "${result.name}" has been successfully updated`
            )
          } else {
            ctx.status = 404
            const error = `Template with ID ${templateId} does not exist`
            ctx.body = {error: error}
            logger.error(`${failureMsg}${error}`)
          }
          next()
        })
        .catch(error => {
          ctx.statusCode = 400
          handleServerError(ctx, failureMsg, error, logger)
          next()
        })
    } catch (error) {
      ctx.statusCode = 400
      handleServerError(ctx, failureMsg, error, logger)
      next()
    }
  })
}

const deleteTemplateRoute = router => {
  router.delete('/templates/:templateId', async (ctx, next) => {
    const failureMsg = `Template deletion failed: `

    try {
      const templateId = ctx.params.templateId

      if (!templateServices.validateTemplateId(templateId)) {
        throw Error('Template ID supplied in url is invalid')
      }

      await templateServices
        .deleteTemplate(templateId)
        .then(result => {
          if (result && result.deletedCount) {
            const message = `Template with ID '${templateId}' deleted`
            ctx.status = 200
            ctx.body = {message: message}
            logger.info(message)
          } else {
            ctx.status = 404
            const error = `Template with ID '${templateId}' does not exist`
            ctx.body = {error: error}
            logger.error(`${failureMsg}${error}`)
          }
          next()
        })
        .catch(error => {
          ctx.statusCode = 500
          handleServerError(ctx, failureMsg, error, logger)
          next()
        })
    } catch (error) {
      ctx.statusCode = 400
      handleServerError(ctx, failureMsg, error, logger)
      next()
    }
  })
}

exports.createTemplateAPIRoutes = router => {
  createTemplateRoute(router)
  readTemplateRoute(router)
  readTemplatesRoute(router)
  updateTemplateRoute(router)
  deleteTemplateRoute(router)
}
