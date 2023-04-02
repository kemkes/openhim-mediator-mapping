'use strict'

const mongoose = require('mongoose')

const TemplateModel = require('../../models/templates')

const ObjectId = mongoose.Types.ObjectId

exports.createTemplate = body => {
  const template = new TemplateModel(body)
  return template.save({checkKeys: false})
}

exports.readTemplate = templateId => {
  const objectId = new ObjectId(templateId)
  return TemplateModel.findById(objectId)
}

exports.readTemplates = queryParams => {
  return TemplateModel.find(queryParams)
}

exports.updateTemplate = (templateId, body) => {
  const objectId = new ObjectId(templateId)
  return TemplateModel.findOneAndUpdate({_id: objectId}, body, {
    new: true,
    runValidators: true
  })
}

exports.deleteTemplate = templateId => {
  const objectId = new ObjectId(templateId)
  return TemplateModel.deleteOne({_id: objectId})
}

exports.deleteTemplates = queryParams => {
  return TemplateModel.deleteMany(queryParams)
}

exports.validateTemplateId = templateId =>
  mongoose.Types.ObjectId.isValid(templateId)
