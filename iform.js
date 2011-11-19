/**
 * node-iform
 *
 * 1. define rules
 *
 *  var userForm = require('iform')({
 *      username: {
 *        required : true ,
 *        len: [3, 7]
 *      } ,
 *      password: {
 *        type: password,
 *        required: true,
 *        len : 3
 *      },
 *      email : {
 *        type :'email',
 *        required : true
 *      }
 *      age : Number, 
 *      birth : Date
 *  });
 *
 * 2. type
 *
 *  all the type is define in node-validator,  Validator.prototype.is*
 *
 *  there are isDate, isEmail, isCreditCard, isUrl, etc
 *
 *  you can use capitalised string or lowercase string. e.g. 'date', 'Email', 'CreditCard', 'url'
 *
 * 3. rules
 *
 *  all the method in validator.Validator.prototype and validator.prototype.Filter could be use as an rule
 *
 *  you can use the method name as rule name, and set the arguments by rule value, if it takes more than 
 *  1 argument, use array. like this password:{len:[3, 15]}, if you only want minLength, use password:{len: 3}
 *
 * 4. extend node-validator
 *
 *  you can extend Validator and Filter by prototype, after this, you must update iform
 *
 *
 * @author Lin Gui
 */
var Validator = require('validator').Validator
  , Filter    = require('validator').Filter
  ;

function iForm(rules){

  /*
   * vars in closure
   */
  var ifields         = {}
    , requiredFields = {}
    , ruleNames      = []
    ;

  function middleware(fields){

    if(!fields) fields = ruleNames;

    return function(req, res, next){
      var params = req.body;
      var iform  = req.iform  = {};
      var idata  = iform.data = {};
      var field, field_name;

      // inject node-validator errorHandler
      var ivalidator = iValidator(function(msg){
          (iform.errors || (iform.errors = {}))[field_name] = msg;
      });

      for (var i = 0; i < fields.length; i += 1) {
        field_name = fields[i];
        if(field = ifields[field_name])
          idata[field_name] = field.validate(params[field_name], ivalidator);
      };

      next();
    };
  }

  /**
   * form it self is a middleware, check all req.params
   */
  var form = middleware;

  form.fields = ifields;

  // this must at the bottom of iForm, cause of form[name]
  for(var name in rules){
    if(rules.hasOwnProperty(name)) {
      var rule = rules[name];
      if(typeof rule !== 'object'){
        rule = {type: rule};
      }
      var field = ifields[name] = iField(rule);
      if(!form[name]) form[name] = field;
      if(rule.required) requiredFields[name] = field;
      ruleNames.push(name);
    }
  }

  return form;
}

function iField(rules) {
  // alias toHTML
  var field = function(){
    // TODO toHTML
  }

  field.validate = function(value, ivalidator, fail_msg){
    return ivalidator(value, rules, fail_msg);
  }

  return field;
}

function iValidator (errorHandler) {
  var validator = new Validator()
    , filter = new Filter();

  if(errorHandler) validator.error = errorHandler;

  return function(value, rules, fail_msg) {
    validator.check(value, fail_msg);
    var type = rules.type;
    var f, v;
    for(var name in rules) {
      // f(v)
      (f = ruleValidator[name]) && f.apply(validator, Array.isArray(v = rules[name]) ? v : [v]);
    }
    if(type && (f=typeValidator[type])) f.apply(validator);

    filter.convert(value);
    for(var name in rules) {
      // f(v)
      (f = ruleFilter[name]) && f.apply(filter, Array.isArray(v = rules[name]) ? v : [v]);
    }
    if(type && (f=typeFilter[type])) f.apply(validator);
    return filter.value();
  }

}

var typeValidator = {}
  , ruleValidator = {}
  , typeFilter    = {}
  , ruleFilter    = {}
  ;

iForm.update = function() {

  for(var name in Validator.prototype) {
    if(name.indexOf('is') === 0 && name.length > 2) {
      var type = name.slice(2);
      typeValidator[type] = typeValidator[type.toLowerCase()] = Validator.prototype[name];
    }
    ruleValidator[name] = ruleValidator[name.toLowerCase()] = Validator.prototype[name];
  }

  for(var name in Filter.prototype) {
    ruleFilter[name] = ruleFilter[name.toLowerCase()] = Filter.prototype[name];
  }

}

ruleValidator[Number] = typeValidator[Number] = Validator.prototype.isDecimal;
ruleValidator[Date]   = typeValidator[Date]   = Validator.prototype.isDate;
ruleFilter[Number]    = typeFilter[Number]    = Filter.prototype.toFloat;

iForm.update();

module.exports = iForm;
