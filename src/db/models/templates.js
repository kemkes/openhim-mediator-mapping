'use strict'

const mongoose = require('mongoose')

const {
  ALLOWED_CONTENT_TYPES
} = require('../../constants')
const logger = require('../../logger')

const templateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      index: {
        unique: true
      }
    },
    target: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    /** [UNUSED]
     * used only for inflate key format
     * ex:
     * { 
     *  "observation": {
     *    "bodyTemperature": 37.2,
     *    "bodyTemperature:unit": "C"
     *  }
     * }
     */
    key: {
      default: {
        type: String,
        required: true
      },
      alternative: {
        delimiter: String,
        composite: []
      }
    },
    type: {
      type: String,
      enum: ['ARRAY', 'OBJECT'],
      default: 'OBJECT'
    },
    extend: String, // for sub-template.
    alias:  String, // for specific variation in sub-template
    profile: String, // for specific profile in sub-template
    /**
     * Resource lain yang bisa digenerate bersamaan dengan resource ini menggunakan data yang sama. 
     * Ex: 
     * - Observation
     *  [
     *    {
     *      "name": "Observation",
     *      "field": "report"
     *    }
     *  ]
     * or 
     * - Medication
     *  [
     *    {
     *      "name": "MedicationRequest",
     *      "field": "request"
     *    },
     *    {
     *      "name": "MedicationStatement",
     *      "field": "statement"
     *    },
     *    {
     *      "name": "MedicationDispense",
     *      "field": "dispense"
     *    }
     *  ]
     */
    linkEnabled: [],
    transformation: {
      input: {
        type: String,
        enum: ALLOWED_CONTENT_TYPES,
        required: function () {
          return (
            this &&
            this.endpoint &&
            this.endpoint.method &&
            (this.endpoint.method === 'POST' || this.endpoint.method === 'PUT')
          )
        }
      },
      output: {type: String, enum: ALLOWED_CONTENT_TYPES, required: true}
    },
    /**
     * Define local jsonata function collection (library). 
     * Can be used on inputTransforms or other jsonata evaluation enabled.
     * Ex:
     * {
     *    "library": {
     *      "math": "$plus := function($a, $b) { return $a + $b; };$min := function($a, $b) { return $a - $b; };"
     *    }
     * }
     * 
     * use in inputTransforms
     * {
     *    "inputTransforms": {
     *        "calucatePlus": "use math; $plus(1, 2)"
     *    }
     * }
     * 
     * 'use <library1-name> <library2-name> ... <libraryN-name>; [evaluate jsonata expression]'
     * 
     * Support includes multiple library name for complex used.
     */
    library: {},
    constants: {},
    inputMapping: {},
    inputTransforms: {},
    inputValidation: {},
  },
  {
    minimize: false,
    timestamps: true // set the created_at/updated_at timestamps on the record
  }
)

templateSchema.pre('save', async function (next) {
  var template = this
  let isNext = false
  let root

  if (
    !template.inputMapping &&
    Object.keys(template.inputMapping)
  ) {
    return next(new Error(
      `Template for name ${template.name} should have inputMapping`
    ))
  }

  if (!template.profile)
    template.profile = null

  // check if root-template reference has defined
  if (template.extend) {
    await TemplateModel.find({
      'name': template.extend
    }).then(result => {
      if (result.length == 0) {
        isNext = true
        return next(new Error(
          `Sub-template extend error: parent ${template.extend} does not exists`
        ))
      } else {
        root = result[0]

        if (root.extend) {
          const error = new Error(
            `Sub-template extend error: parent ${template.extend} is not Root Template`
          )
          return next(error)
        }

        if (root.target != template.target) {
          isNext = true
          return next(new Error(
            `Sub-template extend error: target must be ${root.target}`
          ))
        }

        // template type must be overrided by root template type
        template.type = root.type
      }
    })
  }else {
    if (template.profile || template.alias) {
      return next(new Error(
        `Root-template for target ${template.target} should not have profile or alias`
      ))
    }
  
    template.extend = null
    template.profile = null
    template.alias = null
  }

  await TemplateModel.find({
    'target': template.target,
    // 'extend': template.extend
  }).then(result => {
    if (result.length > 0) {
      for (let res of result) {
        // check root-template with same target
        if (!template.extend && !res.extend) {
          isNext = true
          return next(new Error(
            `Root-template for target ${template.target} already exists`
          ))
        }

        // check sub-template
        if (
          template.extend == res.extend &&
          template.alias == res.alias &&
          template.profile == res.profile
        ) {
          isNext = true
          return next(new Error(
            `Sub-template target ${template.target} with alias ${template.alias} and profile ${template.profile} already exists`
          ))
        }
      }
    }
  })

  if (!isNext)
    return next()
})

const TemplateModel = mongoose.model('template', templateSchema)

module.exports = TemplateModel
