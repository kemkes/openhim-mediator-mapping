'use strict'

const tape = require('tape')
const tapc = require('tape-catch')
const Joi = require('@hapi/joi')
const {
  createValidationSchema,
  performValidation
} = require('../../src/middleware/validator')

tape.test('Validation Middleware', t => {
  t.test('createValidationSchema()', t => {
    t.test('should throw when resource is not supplied', t => {
      t.throws(createValidationSchema, new Error(`Error: No validation rules supplied`))
      t.end()
    })

    t.test('should throw when resource type is not supported', t => {
      const validationMap = {
        directory: 'unsupported'
      }

      t.throws(() => createValidationSchema(validationMap), new Error(`Validation rule type is not supported:`))
      t.end()
    })

    t.test('should return a schema object', t => {
      const validationMap = {
        'directory': {
          'type': 'string',
          'required': true
        }
      }

      const result = createValidationSchema(validationMap)

      t.notEqual(result, null)
      t.end()
    })
  })

  t.test('performValidation()', t => {
    const joiSchema = Joi.object({
      name: Joi.string().required(),
      surname: Joi.string(),
      age: Joi.number().required()
    })

    t.test('should update ctx status when validation fails', t => {
      const ctx = {
        request: {
          body: {
            name: 'tyler',
            surname: 'durden'
          }
        }
      }

      performValidation(ctx, joiSchema)

      t.equal(ctx.status, 400)
      t.notEqual(ctx.body.toString().match(/"age" is required/).length, 0)
      t.end()
    })

    t.test('should update ctx response body when validation fails', t => {
      const ctx = {
        request: {
          body: {
            surname: 'durden',
            age: 33
          }
        }
      }

      performValidation(ctx, joiSchema)

      t.notEqual(ctx.body.toString().match(/"name" is required/).length, 0)
      t.end()
    })

    t.test('should set the ctx input property when validation succeeds', t => {
      const ctx = {
        request: {
          body: {
            name: 'tyler',
            surname: 'durden',
            age: 21
          }
        }
      }

      performValidation(ctx, joiSchema)

      t.notEqual(ctx.input, undefined)
      t.end()
    })
  })
})
